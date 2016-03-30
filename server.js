"use strict";

var fs = require("fs"),
	http = require("http"),
	WebSocketServer = require("ws").Server,
	colors = require("colors"),
	MESSAGE = require("./static/message.js"),

	configSkeleton = {
		dev: false,
		interactive: false,
		mod: "capture",
		monitor: false,
		port: 8080,
		server_name: "JumpSuit server"
	},
	configPath = process.argv[2] || "./config.json";

try {
	fs.statSync(configPath);
} catch(err) {
	if(err.code === "ENOENT") {
		console.log("No config file (\u001b[1m" + configPath + "\u001b[0m) found. Creating it.");
		fs.writeFileSync(configPath, JSON.stringify(configSkeleton, null, "\t"));
	}
}

function cleanup() {
	if(config.monitor) process.stdout.write("\u001b[?1049l");
	process.exit();
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

var printEntry = {
	print: function(type, content) {
		if (type === undefined) return;
		let timestamp = (config.dev) ? ("[" + Math.round(Date.now() / 1000).toString(16) + "]").grey : "";
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

var config,
	previousConfig;
function loadConfig(firstRun) {
	if(config !== undefined) previousConfig = Object.assign({}, config);//clone config

	if(loadConfig.selfModified === true) {
		loadConfig.selfModified = false;
		return;
	}
	try {
		config = JSON.parse(fs.readFileSync(configPath));
		for(let key in config) {
			if(configSkeleton[key] === undefined) throw new Error("Invalid property " + key + " in " + configPath);
		}
		printEntry.print(printEntry.INFO, "Succesfully loaded" + (firstRun === true ? "" : " modified") + " config file.");
		var addedProp = [];
		for (let key in configSkeleton) {
			if(!config.hasOwnProperty(key)) {
				config[key] = configSkeleton[key];//all the properties must be listed in `config.json`
				addedProp.push(key);
			}
		}
		if(addedProp.length !== 0) {
			fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));
			loadConfig.selfModified = true;
			printEntry.print(printEntry.INFO, "New properties added to config file: " + addedProp.join(", ").bold);
		}
	} catch(err) {
		printEntry.print(printEntry.ERROR, err);
		printEntry.print(printEntry.INFO, "Unproper config file found. Loading default settings.");
		config = configSkeleton;
	}
	if (previousConfig !== undefined) {
		if(config.port !== previousConfig.port) {
			server.close();
			server.listen(config.port);
		}
		if(config.monitor !== previousConfig.monitor) {
			if(previousConfig.monitor) {
				clearInterval(monitorTimerID);
				process.stdout.write("\u001b[?1049l")
			} else {
				process.stdout.write("\u001b[?1049h\u001b[H");
				monitorTimerID = setInterval(monitoring, 500);
			}
		}
		if (config.mod !== previousConfig.mod) {
			printEntry.print(printEntry.INFO, "Server set to another mod. Please restart the server to apply new config.");
		}
		if(config.interactive !== previousConfig.interactive) {
			if(previousConfig.interactive) rl.close();
			else initRl();
		}
		if (config.dev && !previousConfig.dev) {
			lobbies.forEach(function(lobby) {
				lobby.stateTimer = config.dev ? 0 : 30;
			});
		}
	}
}
loadConfig(true);
fs.watchFile(configPath, loadConfig);//refresh config whenever the `config.json` is modified

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

var Lobby = require("./lobby.js")(engine);

var files = {
	"/engine.js": fs.readFileSync("./mods/capture/engine.js")//the default engine is not under `./static` because it is part of a mod
};
files["/engine.js"].mtime = fs.statSync("./mods/capture/engine.js").mtime;
files.construct = function(path, oName) {
	fs.readdirSync(path).forEach(function(pPath) {
		var cPath = path + "/" + pPath,
			stat = fs.statSync(cPath);
		if(stat.isDirectory()) {//WE NEED TO GO DEEPER
			files.construct(cPath, oName + pPath + "/");
		} else {
			files[oName + pPath] = fs.readFileSync(cPath);
			files[oName + pPath].mtime = stat.mtime;
		}
	});
};
files.construct("./static", "/");//load everything under `./static` in RAM for fast access

if(config.interactive) initRl();
var rl;
function initRl() {
	rl = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.setPrompt("[INPUT] ".blue.bold, "[INPUT] ".length);
	rl.on("line", function (cmd) {
		//allowing to output variables on purpose
		try {
			var result = eval(cmd);
			if (result !== undefined) printEntry.print(printEntry.RESULT, result);
		} catch (ex) {
			printEntry.print(printEntry.ERROR, ex);
		}
	});
}

//send static files
var server = http.createServer(function (req, res){
	var lobbyUid = /^\/lobbies\/([0-9a-f]+)\/$/.exec(req.url);
	if(req.url === "/") req.url = "/index.html";
	else if(lobbyUid !== null) {
		if(lobbies.getByUid(lobbyUid[1]) !== undefined) req.url = "/index.html";
		else res.end("This lobby doesn't exist (anymore)!\n");
	}

 var extension = req.url.slice(req.url.lastIndexOf(".") - req.url.length + 1), mime;
 switch(extension) {
	case "html":
		mime = "text/html";
		break;
	case "css":
		mime = "text/css";
		break;
	case "svg":
		mime = "image/svg+xml";
		break;
	case "png":
		mime = "image/png";
		break;
	case "js":
		mime = "application/javascript";
		break;
	case "ogg":
		mime = "audio/ogg";
		break;
	default:
		mime = "application/octet-stream";
 }

	if (files[req.url] !== undefined) {
		res.setHeader("Cache-Control", "public, no-cache, must-revalidate, proxy-revalidate");
		if (config.dev) {
			try {
				var path = "./static" + req.url,
					mtime = fs.statSync(path).mtime;
				if(mtime.getTime() !== files[req.url].mtime.getTime()) {
					files[req.url] = fs.readFileSync(path);
					files[req.url].mtime = mtime;
				}
			} catch(e) {/*Do nothing*/}
		}
		if (req.headers["if-modified-since"] !== undefined && new Date(req.headers["if-modified-since"]).toUTCString() === files[req.url].mtime.toUTCString()) {
			res.writeHead(304);
			res.end();
		} else {
			res.setHeader("Content-Type", mime);
			res.setHeader("Last-Modified", files[req.url].mtime.toUTCString());
			res.writeHead(200);
			res.end(files[req.url]);
		}
	} else {
		res.writeHead(404);
		res.end("Error 404:\nPage not found\n");
	}
});
server.listen(config.port);

var lobbies = [],
	wss = new WebSocketServer({server: server});

engine.Player.prototype.send = function(data) {
	try {
		this.ws.send(data, { binary: true, mask: false });
		if (config.monitor) {
			monitoring.traffic.beingConstructed.out += data.byteLength;//record outgoing traffic for logging
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

function monitoring() {
	function genSpaces(amount) {
		for(var spaces = ""; spaces.length !== amount; spaces += " ");
		return spaces;
	}
	function printProperty(caption, content){
		console.log(caption.bold + ":" + genSpaces(20 - caption.length) + content);
	}

	if (++monitoring.traffic.timer === 2) {
		monitoring.traffic.previous = monitoring.traffic.beingConstructed;
		monitoring.traffic.beingConstructed = {in: 0, out: 0};
		monitoring.traffic.timer = 0;
	}

	process.stdout.write("\u001B[2J\u001B[0;0f");
	console.log("Jumpsuit Server version 0.0.0".bold.yellow);
	printProperty("Traffic", (monitoring.traffic.previous.in / 1024).toFixed(2) + " kByte/s (in) | " + (monitoring.traffic.previous.out / 1024).toFixed(2) + " kByte/s (out)");
	printProperty("Port", config.port);
	printProperty("Development Mode", (config.dev) ? "Enabled" : "Disabled");
	printProperty("Interactive Mode", (config.interactive) ? "Enabled" : "Disabled");

	console.log(); //newline
	var headerSizes = [35, 10, 15],
		headerNames = ["lobby name", "players", "process time"],
		header = "";
	headerSizes.forEach(function(hSize, i) {
		header += (i !== 0 ? " | " : "") + headerNames[i].toUpperCase().bold + genSpaces(hSize - headerNames[i].length);
	});
	console.log(header);

	var lobbyAmount = 0, maxLobbies = 8; //should be different according to terminal height and width
	lobbies.some(function(lobby, index, array) {
		if (lobbyAmount >= 8) {
			console.log("... ("  + (array.length - maxLobbies) + " lobbies not listed)");
			return true; //"some" function can be quitted with return, but it needs to return something so just return; wouldn't work
		}
		var info = lobby.name + genSpaces(headerSizes[0] - lobby.name.length),
			amount = lobby.players.length.toString(),
			processTime = lobby.processTime.toString();
		info += "   " + amount + genSpaces(headerSizes[1] - amount.length);
		info += "   " + processTime;
		console.log(info);
		lobbyAmount++;
	});
}
monitoring.traffic = {
	previous: {in: 0, out: 0, http: 0},
	beingConstructed: {in: 0, out: 0, http: 0},
	timer: 0
};
if(config.monitor) {
	process.stdout.write("\u001b[?1049h\u001b[H");
	var monitorTimerID = setInterval(monitoring, 500);
}

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
		if (config.monitor) monitoring.traffic.beingConstructed.in += message.byteLength;
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
lobbies.push(new Lobby(config.server_name + " - Initial Lobby" + (lobbies.length + 1), 8, config.dev ? 0 : 30));
