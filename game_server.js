"use strict";

var fs = require("fs"),
	http = require("http"),
	WebSocket = require("ws"),
	colors = require("colors"),
	interactive = require("./interactive.js"),
	MESSAGE = require("./static/message.js"),

	configSkeleton = {
		dev: false,
		interactive: false,
		master: "ws://jumpsuit.space",
		mod: "capture",
		monitor: false,
		port: 8080,
		server_name: "JumpSuit server"
	};


global.printEntry = {
	print: function(type, content) {
		if (type === undefined) return;
		let timestamp = (config !== undefined && config.dev) ? ("[" + Math.round(Date.now() / 1000).toString(16) + "]").grey : "";
		console.log(timestamp + " " + this.enumToString(type) + " " + (content || ""));
	},
	DEV: 0,
	INFO: 1,
	ERROR: 2,
	RESULT: 3,
	enumToString: function (e) {
		switch (e) {
			case 0: return "[DEV]".cyan.bold;
			case 1: return "[INFO]".yellow.bold;
			case 2: return "[ERR]".red.bold;
			case 3: return "[RESULT]".magenta.bold;
		}
		return "";
	}
};

function changeCbk(newConfig, previousConfig) {
	if(newConfig.port !== previousConfig.port) {
		server.close();
		server.listen(newConfig.port);
	}
	if(newConfig.monitor !== previousConfig.monitor) {
		if(previousConfig.monitor) {
			monitor.unsetMonitorMode();
		} else {
			monitor.setMonitorMode();
		}
	}
	if (newConfig.mod !== previousConfig.mod) {
		printEntry.print(printEntry.INFO, "Server set to another mod. Please restart the server to apply new newConfig.");
	}
	if (newConfig.interactive !== previousConfig.interactive) {
		if (previousConfig.interactive) interactive.close();
		else interactive.open();
	}
	if (newConfig.dev && !previousConfig.dev) {
		lobbies.forEach(function(lobby) {
			lobby.stateTimer = newConfig.dev ? 0 : 30;
		});
	}
}
var config = require("./config.js")(process.argv[2] || "./config.json", configSkeleton, changeCbk);

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
		printEntry.print(printEntry.INFO, "Modded engine loaded.");
	} catch(e) {
		engine = defaultEngine;
		printEntry.print(printEntry.INFO, "Engine loaded.");
	}
	try {
		onMessage = require("./mods/" + config.mod + "/on_message.js")(engine);
		plugModdedModule(onMessage, defaultOnMessage);
		printEntry.print(printEntry.INFO, "Modded message handler loaded.");
	} catch(e) {
		onMessage = defaultOnMessage;
		printEntry.print(printEntry.INFO, "Message handler loaded.");
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

var masterWs = new WebSocket(config.master);
masterWs.on("open", function() {
	console.log("yay");
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

setInterval(function() {
	lobbies.forEach(function(lobby) {
		lobby.update();
	});
}, 16);

setInterval(function() {
	lobbies.forEach(function(lobby) {
		if (lobby.players.length !== 0 && !config.dev) lobby.stateTimer -= 1;

		if (lobby.state === lobby.stateEnum.WAITING) {
			lobby.broadcast(MESSAGE.LOBBY_STATE.serialize(lobby.state, lobby.stateTimer));
			if (lobby.stateTimer <= 0) {
				lobby.resetWorld();
				lobby.broadcast(MESSAGE.ADD_ENTITY.serialize(lobby.planets, lobby.enemies, lobby.shots, lobby.players));//uh oh lobby code seems to be quite out of date
				lobby.state = lobby.stateEnum.PLAYING;
				lobby.stateTimer = 60;
			}
			return;
		} else if (lobby.state === lobby.stateEnum.END) {
			lobby.broadcast(MESSAGE.LOBBY_STATE.serialize(lobby.state, lobby.stateTimer));//TODO: send player scores
			if (lobby.stateTimer <= 0){
				lobby.state = lobby.stateEnum.WAITING;
				lobby.stateTimer = 30;
				//TODO: if there are too few players, keep waiting until certain amount is reached - otherwise close the lobby(?)
			}
			return;
		} else {
			if (lobby.stateTimer <= 0) {
				lobby.state = lobby.stateEnum.END;
				lobby.stateTimer = 10;
				lobby.broadcast(MESSAGE.SCORES.serialize(lobby.getScores()));
			}
		}


		lobby.planets.forEach(function(planet) {
			if (planet.progress.value >= 80) this.teamScores[planet.progress.team]++;
		}, lobby);
		lobby.broadcast(MESSAGE.SCORES.serialize(lobby.teamScores));
	});
}, 1000)

setInterval(function() {
	lobbies.forEach(function(lobby) {
		lobby.pingPlayers();
	});
}, 500);

wss.on("connection", function(ws) {
	function cleanup() {
		lobbies.forEach(function(lobby, lobbyI) {
			lobby.players.some(function(player, i, players) {
				if (player.ws === ws) {
					if (config.dev) printEntry.print(printEntry.DEV, "DISCONNECT".italic + " Lobby: " + lobby.name + " Player: " + player.name);
					players.splice(i, 1);
					lobby.broadcast(MESSAGE.REMOVE_ENTITY.serialize([], [], [], [i]));
					if (players.length === 0) lobbies.splice(lobbyI, 1);
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

	ws.on("message", function(message, flags) {
		let state = new Uint8Array(message, 0, 1)[0];
		if (config.monitor) monitor.getTraffic().beingConstructed.in += message.byteLength;
		if (config.dev) printEntry.print(printEntry.DEV, (MESSAGE.toString(state)).italic);
		switch (state) {
			case MESSAGE.GET_LOBBIES.value:
				var lobbyList = [];
				lobbies.forEach(function(lobby, i) {
					lobbyList.push({uid: lobbies.getUid(i), name: lobby.name, players: lobby.players.length, maxPlayers: lobby.maxPlayers});
				});
				player.send(MESSAGE.LOBBY_LIST.serialize(lobbyList));
				break;
			case MESSAGE.CREATE_LOBBY.value:
				var data = MESSAGE.CREATE_LOBBY.deserialize(message);
				if (data.playerAmount >= 1 && data.playerAmount <= 16 && data.name.length <= 32) lobbies.push(new Lobby(data.name, data.playerAmount, config.dev ? 0 : 30));
				break;
			case MESSAGE.SET_NAME.value:
				let name = MESSAGE.SET_NAME.deserialize(message);
				if (player.lobby !== undefined) {
					if (player.lobby.players.some(function(_player) {
						return _player.name === name;
					})) player.send(MESSAGE.ERROR.serialize(MESSAGE.ERROR.NAME_TAKEN));
					else {
						player.name = name;
						player.lobby.broadcast(MESSAGE.SET_NAME_BROADCAST.serialize(player.lobby.getPlayerId(player), name));
					}
				} else player.name = name;
				break;
			case MESSAGE.CONNECT.value:
				let lobbyId = MESSAGE.CONNECT.deserialize(message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength)),
					lobby = lobbies.getByUid(lobbyId);

				if (player.name === undefined) engine.Player.prototype.send.call({ws: ws}, MESSAGE.ERROR.serialize(MESSAGE.ERROR.NAME_UNKNOWN));//we have to resort to this to use .send() even though the player is undefined
				else if (lobby === undefined) player.send(MESSAGE.ERROR.serialize(MESSAGE.ERROR.NO_LOBBY));
				else if (lobby.players.length === lobby.maxPlayers) player.send(MESSAGE.ERROR.serialize(MESSAGE.ERROR.NO_SLOT));
				else if (lobby.players.some(function(_player) { return _player.name === player.name; })) player.send(MESSAGE.ERROR.serialize(MESSAGE.ERROR.NAME_TAKEN));
				else {
					lobby.players.push(player);
					player.lastRefresh = Date.now();
					player.lobby = lobby;
					lobby.assignPlayerTeam(player);

					player.send(MESSAGE.CONNECT_ACCEPTED.serialize(lobby.players.length - 1, lobby.universe.width, lobby.universe.height, lobby.planets, lobby.enemies, lobby.shots, lobby.players, Object.keys(lobby.teamScores)));
					lobby.broadcast(MESSAGE.ADD_ENTITY.serialize([], [], [], [player]), player)
					player.send(MESSAGE.LOBBY_STATE.serialize(lobby.state));
					if (lobbies.every(function(lobby) {
						return lobby.players.length > 0;
					})) {
						lobbies.push(new Lobby(config.server_name + " - Lobby No." + (lobbies.length + 1), 8, config.dev ? 0 : 30));
					}
				}
				break;
			case MESSAGE.LEAVE_LOBBY.value:
				cleanup();
				break;
			case MESSAGE.PLAYER_CONTROLS.value:
				player.lobby.sendEntityDelta(
					onMessage.onControls(player, MESSAGE.PLAYER_CONTROLS.deserialize(message))
				);
				break;
			case MESSAGE.ACTION_ONE.value:
				if (player !== undefined) {
					let msgAsArrbuf = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
					player.lobby.sendEntityDelta(
						onMessage.onActionOne(player, MESSAGE.ACTION_ONE.deserialize(msgAsArrbuf))
					);
				}
				break;
			case MESSAGE.ACTION_TWO.value:
				if (player !== undefined) {
					let msgAsArrbuf = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
					player.lobby.sendEntityDelta(
						onMessage.onActionTwo(player, MESSAGE.ACTION_TWO.deserialize(msgAsArrbuf))
					);
				}
				break;
			case MESSAGE.CHAT.value:
				player.lobby.broadcast(MESSAGE.CHAT_BROADCAST.serialize(player.lobby.getPlayerId(player), MESSAGE.CHAT.deserialize(message)));
				break;
		}
	});
	ws.on("pong", function() {
		if (player !== undefined) player.latency = (Date.now() - player.lastPing) / 2;
	});
	ws.on("close", cleanup);
});
lobbies.push(new Lobby(config.server_name + " - Lobby No." + (lobbies.length + 1), 8, config.dev ? 0 : 30));
