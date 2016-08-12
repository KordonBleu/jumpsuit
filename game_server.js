"use strict";

require("colors");
require("./proto_mut.js");
const http = require("http"),
	WebSocket = require("ws"),
	interactive = require("./interactive.js"),
	MESSAGE = require("./static/message.js"),
	logger = require("./logger.js"),
	ipaddr = require("ipaddr.js"),
	ips = require("./ips.js"),

	configSkeleton = {
		dev: false,
		interactive: false,
		master: "ws://jumpsuit.space",
		mod: "capture",
		monitor: false,
		port: 7483,
		secure: false,
		server_name: "JumpSuit server"
	};



function changeCbk(newConfig, previousConfig) {
	if (newConfig.port !== previousConfig.port) {
		server.close();
		server.listen(newConfig.port);
	}
	if(newConfig.monitor !== previousConfig.monitor) {
		if (previousConfig.monitor) monitor.unsetMonitorMode();
		else monitor.setMonitorMode();
	}
	if (newConfig.mod !== previousConfig.mod) {
		logger(logger.INFO, "Server set to another mod. Please restart the server to apply new config.");
	}
	if (newConfig.interactive !== previousConfig.interactive) {
		if (previousConfig.interactive) interactive.close();
		else interactive.open();
	}
}
var config = require("./config.js")(process.argv[2] || "./game_config.json", configSkeleton, changeCbk);

function plugModdedModule(moddedModule, defaultModule) {
	for (let key in defaultModule) {
		if (moddedModule[key] === undefined) moddedModule[key] = defaultModule[key];//use default functions and constructor when the mod doesn't implement them
	}
}
var engine,
	onMessage;
{
	let defaultEngine = require("./mods/" + configSkeleton.mod + "/engine.js"),
		defaultOnMessage = require("./mods/" + configSkeleton.mod + "/on_message.js");

	try {
		engine = require("./mods/" + config.mod + "/engine.js");
		plugModdedModule(engine, defaultEngine);
		logger(logger.INFO, "Modded engine loaded.");
	} catch(e) {
		engine = defaultEngine;
		logger(logger.INFO, "Engine loaded.");
	}
	try {
		onMessage = require("./mods/" + config.mod + "/on_message.js")(engine);
		plugModdedModule(onMessage, defaultOnMessage);
		logger(logger.INFO, "Modded message handler loaded.");
	} catch(e) {
		onMessage = defaultOnMessage;
		logger(logger.INFO, "Message handler loaded.");
	}
}

var Lobby = require("./lobby.js")(engine),
	lobbies = [];

var monitor = require("./monitor.js")(config, lobbies);
if(config.monitor) monitor.setMonitorMode();

if (config.interactive) interactive.open();


var server = http.createServer(),//create an independent server so it is easy to
	wss = new WebSocket.Server({server: server});//change port while running
server.listen(config.port);

function connectToMaster(){
	logger(logger.REGISTER, "Attempting to connect to master server");
	let masterWs = new WebSocket(config.master + "/game_servers"), nextAttemptID;
	masterWs.on("open", function() {
		masterWs.send(MESSAGE.REGISTER_SERVER.serialize(config.secure, config.port, config.server_name, config.mod, lobbies), { binary: true, mask: false });
		masterWs.on("close", function() {
			logger(logger.ERROR, "Connection to master server lost! Trying to reconnect in 5s");
			if (nextAttemptID !== undefined) clearTimeout(nextAttemptID);
			nextAttemptID = setTimeout(connectToMaster, 5000);
		});
	});
	masterWs.on("ping", function() {
		masterWs.pong();
	});
	masterWs.on("message", function(message) {
		message = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);//convert Buffer to ArrayBuffer
		if (new Uint8Array(message, 0, 1)[0] === MESSAGE.SERVER_REGISTERED.value) logger(logger.S_REGISTER, "Successfully registered at " + config.master.bold);
	});
	masterWs.on("error", function() {
		logger(logger.ERROR, "Attempt failed, master server is not reachable! Trying to reconnect in 5s");
		if (nextAttemptID !== undefined) clearTimeout(nextAttemptID);
		nextAttemptID = setTimeout(connectToMaster, 5000);
	});
}
connectToMaster();

engine.Player.prototype.send = function(data) {
	try {
		this.ws.send(data, { binary: true, mask: false });
		if (config.monitor) {
			monitor.getTraffic().beingConstructed.out += data.byteLength;//record outgoing traffic for logging
		}
	} catch (err) { /* Maybe log this error somewhere? */ }
};

wss.on("connection", function(ws) {
	function cleanup() {
		lobbies.forEach(function(lobby, li) {
			lobby.players.some(function(player, pi) {
				if (player.ws === ws) {
					logger(logger.DEV, "DISCONNECT".italic + " Lobby: " + lobby.name + " Player: " + player.name);
					delete lobby.players[pi];
					lobby.broadcast(MESSAGE.REMOVE_ENTITY.serialize([], [], [], [pi]));
					if (lobby.players.length === 0) {
						lobbies[li].close();
						delete lobbies[li];
					}
					for (let i = li; i !== lobbies.length; ++i) {
						lobbies[i].name = config.server_name + " - Lobby No." + (i + 1);
					}
					return true;
				}
			});
		});
	}
	var player = new engine.Player();
	player.ws = ws;
	player.ip = ipaddr.parse(ws._socket.remoteAddress);

	ws.on("message", function(message) {
		if (ips.banned(player.ip)) return;

		message = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);//convert Buffer to ArrayBuffer

		try {
			let state = new Uint8Array(message, 0, 1)[0];
			if (config.monitor) monitor.getTraffic().beingConstructed.in += message.byteLength;
			switch (state) {//shouldn't this be broken into small functions?
				case MESSAGE.SET_PREFERENCES.value: {
					let playerName = MESSAGE.SET_PREFERENCES.deserialize(message);
					if (playerName === player.name) return;
					if (player.lobby !== undefined) {
						player.homographId = player.lobby.getNextHomographId(playerName);
						player.lobby.broadcast(MESSAGE.SET_NAME_BROADCAST.serialize(player.lobby.getPlayerId(player), playerName, player.homographId));
					}
					player.name = playerName;
					break;
				}
				case MESSAGE.CONNECT.value: {
					let val = MESSAGE.CONNECT.deserialize(message);
					var lobby;
					if (val.lobbyId !== undefined) {
						lobby = lobbies[val.lobbyId];
						if (lobby === undefined) {
							player.send(MESSAGE.ERROR.serialize(MESSAGE.ERROR.NO_LOBBY));
							break;
						} else if (lobby.players.length === lobby.maxPlayers) {
							player.send(MESSAGE.ERROR.serialize(MESSAGE.ERROR.NO_SLOT));
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
					//player.weaponry.armed = val.primary;
					//player.weaponry.carrying = val.secondary;
					player.armedWeapon = new 
					player.homographId = lobby.getNextHomographId(player.name);
					player.lastRefresh = Date.now();
					player.lobbyId = val.lobbyId;

					player.send(MESSAGE.CONNECT_ACCEPTED.serialize(val.lobbyId, player.pid, lobby.universe.width, lobby.universe.height));
					if (Object.keys(lobby.lobbyStates)[lobby.lobbyState] !== "DISPLAYING_SCORES") {
						lobby.assignPlayerTeam(player);
						player.send(MESSAGE.ADD_ENTITY.serialize(lobby.planets, lobby.enemies, lobby.shots, lobby.players));
					} else player.send(MESSAGE.ADD_ENTITY.serialize([], [], [], lobby.players));
					lobby.broadcast(MESSAGE.ADD_ENTITY.serialize([], [], [], [player]), player);
					player.send(MESSAGE.LOBBY_STATE.serialize(lobby.lobbyState, lobby.enabledTeams));
					lobby.broadcast(MESSAGE.ADD_ENTITY.serialize([], [], [], [player]), player);

					break;
				}
				case MESSAGE.PLAYER_CONTROLS.value:
					onMessage.onControls(player, MESSAGE.PLAYER_CONTROLS.deserialize(message));
					break;
				case MESSAGE.CHAT.value: {
					let chatMsg = MESSAGE.CHAT.deserialize(message);
					if (chatMsg !== "" && chatMsg.length <= 150) lobbies[player.lobbyId].broadcast(MESSAGE.CHAT_BROADCAST.serialize(player.pid, chatMsg), player);
					break;
				}
				case MESSAGE.AIM_ANGLE.value:
					player.aimAngle = MESSAGE.AIM_ANGLE.deserialize(message);
					break;
				default:
					ips.ban(player.ip);
					return;//prevent logging
			}
			logger(logger.DEV, MESSAGE.toString(state));
		} catch (err) {
			console.log(err);
			ips.ban(player.ip);
		}
	});
	ws.on("pong", function() {
		if (player !== undefined) player.latency = (Date.now() - player.lastPing) / 2;
	});
	ws.on("close", cleanup);
});
