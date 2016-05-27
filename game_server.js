"use strict";

var fs = require("fs"),
	http = require("http"),
	WebSocket = require("ws"),
	colors = require("colors"),
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
	let defaultEngine = require("./mods/" + configSkeleton.mod + "/engine.js");//default engine
	for (let key in defaultEngine) {
		if (engine[key] === undefined) engine[key] = defaultEngine[key];//use default functions and constructor when the mod doesn't implement them
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

var masterWs = new WebSocket(config.master + "/game_servers");
masterWs.on("open", function() {
	masterWs.send(MESSAGE.REGISTER_SERVER.serialize(config.secure, config.port, config.server_name, config.mod, lobbies), { binary: true, mask: false });
});

engine.Player.prototype.send = function(data) {
	try {
		this.ws.send(data, { binary: true, mask: false });
		if (config.monitor) {
			monitor.getTraffic().beingConstructed.out += data.byteLength;//record outgoing traffic for logging
		}
	} catch (err) { /* Maybe log this error somewhere? */ }
};

lobbies.getUid = function(index) {
	var uid = index.toString(16);
	while(uid.length !== 6) {
		uid = "0" + uid;
	}
	return uid;
};
lobbies.getByUid = function(uid) {
	var index = parseInt(uid, 16);
	if(!isNaN(index) && isFinite(index) && index % 1 === 0 && index >= 0 && this[index] !== undefined) return this[index];
};

wss.on("connection", function(ws) {
	function cleanup() {
		lobbies.forEach(function(lobby, lobbyI) {
			lobby.players.some(function(player, i, players) {
				if (player.ws === ws) {
					logger(logger.DEV, "DISCONNECT".italic + " Lobby: " + lobby.name + " Player: " + player.name);
					players.splice(i, 1);
					lobby.broadcast(MESSAGE.REMOVE_ENTITY.serialize([], [], [], [i]));
					if (players.length === 0) { 
						lobbies[lobbyI].close();
						lobbies.splice(lobbyI, 1);						
					}
					for (let i = lobbyI; i !== lobbies.length; ++i) {
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

	ws.on("message", function(message, flags) {
		if (ips.banned(player.ip)) return;

		message = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);//convert Buffer to ArrayBuffer

		try {
			let state = new Uint8Array(message, 0, 1)[0];
			if (config.monitor) monitor.getTraffic().beingConstructed.in += message.byteLength;
			switch (state) {//shouldn't this be broken into small functions?
				case MESSAGE.CREATE_PRIVATE_LOBBY.value:
					var data = MESSAGE.CREATE_PRIVATE_LOBBY.deserialize(message);
					if (data.playerAmount >= 1 && data.playerAmount <= 16 && data.name.length <= 32) lobbies.push(new Lobby(data.playerAmount, config.dev ? 0 : 30));
					//TODO: connect client to newly created lobby
					break;
				case MESSAGE.SET_NAME.value:
					let playerName = MESSAGE.SET_NAME.deserialize(message);
					if (player.lobby !== undefined) {
						player.homographId = player.lobby.getNextHomographId(playerName);
						player.lobby.broadcast(MESSAGE.SET_NAME_BROADCAST.serialize(player.lobby.getPlayerId(player), playerName, player.homographId));
					}
					player.name = playerName;
					break;
				case MESSAGE.CONNECT.value:
					let lobbyId = MESSAGE.CONNECT.deserialize(message);

					if (player.name === undefined) break;
					else {
						let lobby;
						if (lobbyId !== undefined) {//joining a private lobby
							lobby = lobbies.getByUid(lobbyId);

							if (lobby === undefined) player.send(MESSAGE.ERROR.serialize(MESSAGE.ERROR.NO_LOBBY));
							else if (lobby.players.length === lobby.maxPlayers) player.send(MESSAGE.ERROR.serialize(MESSAGE.ERROR.NO_SLOT));
							break;
						} else {//public lobby
							if (!lobbies.some(function(_lobby, i) {//if no not-full lobby
								if (_lobby.players.length < _lobby.maxPlayers) {
									lobby = _lobby;
									lobbyId = i;
									return true;
								} else return false;
							})) {//create new lobby
								lobby = new Lobby(8, config.dev ? 0 : 30);
								lobby.init();
								lobbyId = lobbies.push(lobby) - 1;
							}
						}

						player.homographId = lobby.getNextHomographId(player.name);
						lobby.players.push(player);
						player.lastRefresh = Date.now();
						player.lobby = lobby;
						player.pid = lobby.players.findIndex(function(element) { return element === player; });
						lobby.assignPlayerTeam(player);

						player.send(MESSAGE.CONNECT_ACCEPTED.serialize(lobbyId, lobby.players.length - 1, lobby.universe.width, lobby.universe.height, lobby.planets, lobby.enemies, lobby.shots, lobby.players, Object.keys(lobby.teamScores)));
						lobby.broadcast(MESSAGE.ADD_ENTITY.serialize([], [], [], [player]), player)
						player.send(MESSAGE.LOBBY_STATE.serialize(lobby.state));
					}
					break;
				case MESSAGE.PLAYER_CONTROLS.value:
					onMessage.onControls(player, MESSAGE.PLAYER_CONTROLS.deserialize(message));
					break;
				case MESSAGE.CHAT.value:
					let chatMsg = MESSAGE.CHAT.deserialize(message);
					if (chatMsg !== "" && chatMsg.length <= 150) player.lobby.broadcast(MESSAGE.CHAT_BROADCAST.serialize(player.lobby.getPlayerId(player), chatMsg), player);
					break;
				case MESSAGE.AIM_ANGLE.value:
					player.aimAngle = MESSAGE.AIM_ANGLE.deserialize(message);
					break
				default:
					ips.ban(player.ip);
					return;//prevent logging
			}
			logger(logger.DEV, MESSAGE.toString(state));
		} catch (err) {
			ips.ban(player.ip);
		}
	});
	ws.on("pong", function() {
		if (player !== undefined) player.latency = (Date.now() - player.lastPing) / 2;
	});
	ws.on("close", cleanup);
});
