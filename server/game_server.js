import * as config from './config_loader.js';
config.init(process.argv[2] || './game_config.json', {
	dev: false,
	master: 'wss://jumpsuit.space',
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
		else monitor.setMonitorMode(lobby.lobbies);
	}
	if (newConfig.mod !== previousConfig.mod) {
		logger(logger.INFO, 'Server set to another mod. Please restart the server to apply new config.');
	}
});


import * as message from '../shared/message.js';
import logger from './logger.js';
import * as ips from './ips';
import * as lobby from './lobby.js';

import * as onMessage from '<@onMessage@>';
import Player from '<@Player@>';

const modName = '<@modName@>';

require('colors');
const http = require('http'),
	WebSocket = require('ws');

import './proto_mut.js';

import * as monitor from './monitor.js';
if(config.config.monitor) monitor.setMonitorMode(lobby.lobbies);


const Slave = require('enslavism').Slave;

console.log(config.config.master);
let slave = new Slave(config.config.master, {
	serverName: config.config.server_name,
	modName: modName
});

/*let server = http.createServer(),//create an independent server so it is easy to
	wss = new WebSocket.Server({server: server});//change port while running
server.listen(config.config.port);

function connectToMaster() {
	logger(logger.REGISTER, 'Attempting to connect to master server');
	let masterWs = new WebSocket(config.config.master + '/game_servers'),
		nextAttemptID;

	masterWs.on('open', function() {
		masterWs.send(message.registerServer.serialize(config.config.secure, config.config.port, config.config.server_name, modName, lobby.lobbies), { binary: true, mask: false });
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
		if (message.getSerializator(msg) === message.serverRegistered) logger(logger.S_REGISTER, 'Successfully registered at ' + config.config.master.bold);
	});
	masterWs.on('error', function(err) {
		logger(logger.ERROR, 'Attempt failed, master server is not reachable! Trying to reconnect in 5s ');
		console.log(err);
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
		}*/
		//} catch (err) { /* Maybe log this error somewhere? */ }
/*};

wss.on('connection', function(ws) {
	function cleanup() {
		lobby.lobbies.forEach(function(lobby, li) {
			lobby.players.some(function(player, pi) {
				if (player.ws === ws) {
					logger(logger.DEV, 'DISCONNECT'.italic + ' Lobby: #' + li + ' Player: {0}', player.name);
					delete lobby.players[pi];
					lobby.broadcast(message.removeEntity.serialize([], [], [], [pi]));
					if (lobby.players.length === 0) {
						lobby.lobbies[li].close();
						delete lobby.lobbies[li];
					}
					return true;
				}
			});
		});
	}
	let player = new Player(ws);

	ws.on('message', function(msg) {
		if (ips.banned(player.ip)) return;

		msg = msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength);//convert Buffer to ArrayBuffer

		try {
			let serializator = message.getSerializator(msg);
			if (config.config.monitor) monitor.traffic.beingConstructed.in += msg.byteLength;
			switch (serializator) {
				case message.setPreferences: {
					let val = message.setPreferences.deserialize(msg);
					if (player.lobby !== undefined) {
						player.homographId = player.lobby.getNextHomographId(val.name);
						player.lobby.broadcast(message.setNameBroadcast.serialize(player.lobby.getPlayerId(player), val.name, player.homographId));
					}
					player.name = val.name;
					player.armedWeapon = player.weapons[val.primary];
					player.carriedWeapon = player.weapons[val.secondary];
					break;
				}
				case message.connect: {
					let val = message.connect.deserialize(msg);
					let selectedLobby;
					if (val.lobbyId !== undefined) {
						selectedLobby = lobby.lobbies[val.lobbyId];
						if (selectedLobby === undefined) {
							player.send(message.error.serialize(message.error.NO_LOBBY));
							break;
						} else if (selectedLobby.players.length === selectedLobby.maxPlayers) {
							player.send(message.error.serialize(message.error.NO_SLOT));
							break;
						}
					} else {//public lobby
						if (!lobby.lobbies.some(function(l, i) {//if no not-full lobby
							if (l.players.actualLength() < l.maxPlayers) {
								val.lobbyId = i;
								selectedLobby = lobby.lobbies[i];
								return true;
							} else return false;
						})) {//create new lobby
							val.lobbyId = lobby.addLobby();
							selectedLobby = lobby.lobbies[val.lobbyId];
						}
					}
					player.pid = selectedLobby.addPlayer(player);
					player.name = val.name;
					player.armedWeapon = player.weapons[val.primary];
					player.carriedWeapon = player.weapons[val.secondary];
					player.homographId = selectedLobby.getNextHomographId(player.name);
					player.lobbyId = val.lobbyId;

					selectedLobby.connectPlayer(player);

					break;
				}
				case message.playerControls:
					onMessage.onControls(player, message.playerControls.deserialize(msg));
					break;
				case message.chat: {
					let chatMsg = message.chat.deserialize(msg);
					if (chatMsg !== '' && chatMsg.length <= 150) lobby.lobbies[player.lobbyId].broadcast(message.chatBroadcast.serialize(player.pid, chatMsg), player);
					break;
				}
				case message.aimAngle:
					player.aimAngle = message.aimAngle.deserialize(msg);
					break;
				default:
					ips.ban(player.ip);
					return;//prevent logging
			}
			logger(logger.DEV, serializator.toString());
		} catch (err) {
			console.log(err);
			ips.ban(player.ip);
		}
	});
	ws.on('close', cleanup);
});*/
