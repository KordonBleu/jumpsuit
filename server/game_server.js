import * as config from './config_loader.js';
config.init(process.argv[2] || './game_config.json', {
	dev: false,
	master: 'ws://jumpsuit.space',
	monitor: false,
	port: 7483,
	secure: false,
	server_name: 'JumpSuit server'
}, (newConfig, previousConfig) => {
	if (newConfig.port !== previousConfig.port) {
		server.close();
		server.listen(newConfig.port);
	}
	if(newConfig.monitor !== previousConfig.monitor) {
		if (previousConfig.monitor) monitor.unsetMonitorMode();
		else monitor.setMonitorMode(lobbies);
	}
	if (newConfig.mod !== previousConfig.mod) {
		logger(logger.INFO, 'Server set to another mod. Please restart the server to apply new config.');
	}
});


import message from '../shared/message.js';
import logger from './logger.js';
import * as ips from './ips';
import Lobby from './lobby.js';
let lobbies = [];

import * as onMessage from '<@onMessage@>';
import Player from '<@Player@>';

const modName = '<@modName@>';

require('colors');
const http = require('http'),
	WebSocket = require('ws'),
	ipaddr = require('ipaddr.js');

import './proto_mut.js';

import * as monitor from './monitor.js';
if(config.config.monitor) monitor.setMonitorMode(lobbies);


let server = http.createServer(),//create an independent server so it is easy to
	wss = new WebSocket.Server({server: server});//change port while running
server.listen(config.config.port);

function connectToMaster(){
	logger(logger.REGISTER, 'Attempting to connect to master server');
	let masterWs = new WebSocket(config.config.master + '/game_servers'), nextAttemptID;
	masterWs.on('open', function() {
		masterWs.send(message.REGISTER_SERVER.serialize(config.config.secure, config.config.port, config.config.server_name, modName, lobbies), { binary: true, mask: false });
		masterWs.on('close', function() {
			logger(logger.ERROR, 'Connection to master server lost! Trying to reconnect in 5s');
			if (nextAttemptID !== undefined) clearTimeout(nextAttemptID);
			nextAttemptID = setTimeout(connectToMaster, 5000);
		});
	});
	masterWs.on('ping', function() {
		masterWs.pong();
	});
	masterWs.on('message', function(msg) {
		msg = msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength);//convert Buffer to ArrayBuffer
		if (new Uint8Array(msg, 0, 1)[0] === message.SERVER_REGISTERED.value) logger(logger.S_REGISTER, 'Successfully registered at ' + config.config.master.bold);
	});
	masterWs.on('error', function() {
		logger(logger.ERROR, 'Attempt failed, master server is not reachable! Trying to reconnect in 5s');
		if (nextAttemptID !== undefined) clearTimeout(nextAttemptID);
		nextAttemptID = setTimeout(connectToMaster, 5000);
	});
}
connectToMaster();

Player.prototype.send = function(data) {
	try {
		this.ws.send(data, { binary: true, mask: false });
		if (config.config.monitor) {
			monitor.traffic.beingConstructed.out += data.byteLength;//record outgoing traffic for logging
		}
	} catch (err) { /* Maybe log this error somewhere? */ }
};

wss.on('connection', function(ws) {
	function cleanup() {
		lobbies.forEach(function(lobby, li) {
			lobby.players.some(function(player, pi) {
				if (player.ws === ws) {
					logger(logger.DEV, 'DISCONNECT'.italic + ' Lobby: #' + li + ' Player: {0}', player.name);
					delete lobby.players[pi];
					lobby.broadcast(message.REMOVE_ENTITY.serialize([], [], [], [pi]));
					if (lobby.players.length === 0) {
						lobbies[li].close();
						delete lobbies[li];
					}
					return true;
				}
			});
		});
	}
	let player = new Player();
	player.ws = ws;
	player.ip = ipaddr.parse(ws._socket.remoteAddress);

	ws.on('message', function(msg) {
		if (ips.banned(player.ip)) return;

		msg = msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength);//convert Buffer to ArrayBuffer

		try {
			let state = new Uint8Array(msg, 0, 1)[0];
			if (config.config.monitor) monitor.traffic.beingConstructed.in += msg.byteLength;
			switch (state) {//shouldn't this be broken into small functions?
				case message.SET_PREFERENCES.value: {
					let val = message.SET_PREFERENCES.deserialize(msg);
					if (player.lobby !== undefined) {
						player.homographId = player.lobby.getNextHomographId(val.name);
						player.lobby.broadcast(message.SET_NAME_BROADCAST.serialize(player.lobby.getPlayerId(player), val.name, player.homographId));
					}
					player.name = val.name;
					player.armedWeapon = player.weapons[val.primary];
					player.carriedWeapon = player.weapons[val.secondary];
					break;
				}
				case message.CONNECT.value: {
					let val = message.CONNECT.deserialize(msg);
					let lobby;
					if (val.lobbyId !== undefined) {
						lobby = lobbies[val.lobbyId];
						if (lobby === undefined) {
							player.send(message.ERROR.serialize(message.ERROR.NO_LOBBY));
							break;
						} else if (lobby.players.length === lobby.maxPlayers) {
							player.send(message.ERROR.serialize(message.ERROR.NO_SLOT));
							break;
						}
					} else {//public lobby
						if (!lobbies.some(function(l, i) {//if no not-full lobby
							if (l.players.actualLength() < l.maxPlayers) {
								val.lobbyId = i;
								lobby = lobbies[i];
								return true;
							} else return false;
						})) {//create new lobby
							lobby = new Lobby(4);
							val.lobbyId = lobbies.append(lobby);
						}
					}
					player.pid = lobby.addPlayer(player);
					player.name = val.name;
					player.armedWeapon = player.weapons[val.primary];
					player.carriedWeapon = player.weapons[val.secondary];
					player.homographId = lobby.getNextHomographId(player.name);
					player.lastRefresh = Date.now();
					player.lobbyId = val.lobbyId;

					player.send(message.CONNECT_ACCEPTED.serialize(val.lobbyId, player.pid, lobby.universe.width, lobby.universe.height));
					if (lobby.lobbyState !== 'displaying_scores') {
						lobby.assignPlayerTeam(player);
						player.send(message.ADD_ENTITY.serialize(lobby.planets, lobby.enemies, lobby.shots, lobby.players));
					} else player.send(message.ADD_ENTITY.serialize([], [], [], lobby.players));
					lobby.broadcast(message.ADD_ENTITY.serialize([], [], [], [player]), player);
					player.send(message.LOBBY_STATE.serialize(lobby.lobbyState, lobby.enabledTeams));
					lobby.broadcast(message.ADD_ENTITY.serialize([], [], [], [player]), player);

					break;
				}
				case message.PLAYER_CONTROLS.value:
					onMessage.onControls(player, message.PLAYER_CONTROLS.deserialize(msg));
					break;
				case message.CHAT.value: {
					let chatMsg = message.CHAT.deserialize(msg);
					if (chatMsg !== '' && chatMsg.length <= 150) lobbies[player.lobbyId].broadcast(message.CHAT_BROADCAST.serialize(player.pid, chatMsg), player);
					break;
				}
				case message.AIM_ANGLE.value:
					player.aimAngle = message.AIM_ANGLE.deserialize(msg);
					break;
				default:
					ips.ban(player.ip);
					return;//prevent logging
			}
			logger(logger.DEV, message.toString(state));
		} catch (err) {
			console.log(err);
			ips.ban(player.ip);
		}
	});
	ws.on('pong', function() {
		if (player !== undefined) player.latency = (Date.now() - player.lastPing) / 2;
	});
	ws.on('close', cleanup);
});
