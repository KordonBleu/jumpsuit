"use strict";

var fs = require("fs"),
	http = require("http"),
	WebSocketServer = require("ws").Server,
	colors = require("colors"),
	MESSAGE = require("./static/message.js"),
	engine = require("./static/engine.js"),
	vinage = require("./static/vinage/vinage.js"),

	configSkeleton = {
		dev: false,
		interactive: false,
		monitor: false,
		port: 8080
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

var config,
	previousConfig;

function loadConfig(firstRun) {
	function clone(obj) {
		var target = {};
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) target[i] = obj[i];
		}
		return target;
	}
	if(config !== undefined) previousConfig = clone(config);

	if(loadConfig.selfModified === true) {
		loadConfig.selfModified = false;
		return;
	}
 try {
	 config = JSON.parse(fs.readFileSync(configPath));
	 for(var key in config) {
		 if(configSkeleton[key] === undefined) throw new Error("Invalid property " + key + " in " + configPath);
	 }
	 console.log("[INFO] ".yellow.bold + "Succesfully loaded" + (firstRun === true ? "" : " modified") + " config file.");
	 var addedProp = [];
	 for(var key in configSkeleton) {
		 if(!config.hasOwnProperty(key)) {
			 config[key] = configSkeleton[key];//all the properties must be listed in `config.json`
			 addedProp.push(key);
		 }
	 }
	 if(addedProp.length !== 0) {
		 fs.writeFileSync(configPath, JSON.stringify(config, null, "\t"));
		 loadConfig.selfModified = true;
		 console.log("[INFO] ".yellow.bold + "New properties added to config file: " + addedProp.join(", ").bold);
	 }
 } catch(err) {
	 console.log("[ERR] ".red.bold + err);
	 console.log("[INFO] ".yellow.bold + "Unproper config file found. " + "Loading default settings.");
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

var files = {};
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
function initRl(){
 rl = require("readline").createInterface({
	 input: process.stdin,
	 output: process.stdout
 });
 rl.setPrompt("[INPUT:] ".blue.bold, "[INPUT:] ".length);
 rl.on("line", function (cmd) {
	 //allowing to output variables on purpose
	 var result = eval(cmd);
	 if (result !== undefined) console.log("[RESULT:] ".magenta.bold, result);
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
	 default:
		 mime = "application/octet-stream";
 }

 if(files[req.url] !== undefined) {
	 res.setHeader("Cache-Control", "public, no-cache, must-revalidate, proxy-revalidate");
	 if(config.dev) {
		 try {
			 var path = "./static" + req.url,
				 mtime = fs.statSync(path).mtime;
			 if(mtime.getTime() !== files[req.url].mtime.getTime()) {
				 files[req.url] = fs.readFileSync(path);
				 files[req.url].mtime = mtime;
			 }
		 } catch(e) {/*Do nothing*/}
	 }
	 if(req.headers["if-modified-since"] !== undefined && new Date(req.headers["if-modified-since"]).getTime() === files[req.url].mtime.getTime()) {
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

function Lobby(name, maxPlayers) {
	this.players = [];
	this.maxPlayers = maxPlayers;
	this.planets = [];
	this.enemies = [];
	this.shots = [];
	this.processTime = 2;
	this.state = this.stateEnum.WAITING;
	this.stateTimer = config.dev ? 0 : 30;

	this.universe = new vinage.Rectangle(new vinage.Point(0, 0), 6400, 6400);
	this.resetWorld();
	this.name = name;
}
Lobby.prototype.stateEnum = {
	WAITING: 0,
	PLAYING: 1,
	END: 2
};
Lobby.prototype.broadcast = function(message, exclude) {
	this.players.forEach(function(player) {
		if (player !== exclude) player.send(message);
	});
};
Lobby.prototype.update = function() {
	var oldDate = Date.now(), playerData = new Array(this.maxPlayers),
		shotsDelta = engine.doPhysics(this.universe, this.players, this.planets, this.enemies, this.shots, false, this.teamScores);

	if (shotsDelta.removed.length != 0) this.broadcast(MESSAGE.REMOVE_ENTITY.serialize([], [], shotsDelta.removed, []));
	if (shotsDelta.added.length != 0) this.broadcast(MESSAGE.ADD_ENTITY.serialize([], [], shotsDelta.added, []));

	this.players.forEach(function(player, i) {
		function truncTo(number, decimalNbr) {
			var lel = Math.pow(10, decimalNbr);
			return Math.round(number * lel) / lel;
		}
		playerData[i] = {x: truncTo(player.box.center.x, 3), y: truncTo(player.box.center.y, 3), attachedPlanet: player.attachedPlanet,
			angle: truncTo(player.box.angle, 4), walkFrame: player.walkFrame, health: player.health, fuel: player.fuel,
			name: player.name, appearance: player.appearance, looksLeft: player.looksLeft, jetpack: player.jetpack
		};
	});

	this.players.forEach(function(player) {
		function updPlayer() {
			player.send(MESSAGE.GAME_STATE.serialize(player.health, player.fuel, this.planets, this.enemies, this.shots, this.players));
			player.needsUpdate = true;
		}
		if (player.needsUpdate || player.needsUpdate === undefined) {
			player.needsUpdate = false;
			setTimeout(updPlayer.bind(this), 40);
		}
	}, this);
	this.processTime = Date.now() - oldDate;
};
Lobby.prototype.pingPlayers = function() {
	this.players.forEach(function(player) {
		player.lastPing = Date.now();
		player.ws.ping(undefined, undefined, true);
	});
};
Lobby.prototype.getPlayerId = function(player) {
	var id;
	this.players.some(function(_player, index) {
		if (_player === player) {
			id = index;
			return true;
		}
	});
	return id;
};
Lobby.prototype.getScores = function() {
	var i = {}, a;
	for (a in this.teamScores) if (a.indexOf("alien") !== -1) i[a] = this.teamScores[a];
	return i;
};
Lobby.prototype.resetWorld = function() {//generate world
	this.planets.length = 0;
	this.enemies.length = 0;

	var chunkSize = 1600;
	for (var y = 0; y < this.universe.height; y += chunkSize){
		for (var x = 0; x < this.universe.width; x += chunkSize){
			var px = Math.floor(Math.random() * (chunkSize - 400) + 200),
				py = Math.floor(Math.random() * (chunkSize - 400) + 200),
				radius = Math.floor(Math.random() * (px <= 300 || px >= chunkSize - 300 || py <= 300 || py >= chunkSize - 300 ? 80 : 250) + 100);
			this.planets.push(new engine.Planet(x + px, y + py, radius));
		}
	}
	var iterations = 0;
	while (iterations < 250 && this.enemies.length < 15){
		var newEnemy = new engine.Enemy(Math.floor(Math.random() * this.universe.width), Math.floor(Math.random() * this.universe.height)), wellPositioned = true;
		this.enemies.forEach(function (enemy){
			if (!wellPositioned) return;
			if (this.universe.collide(new vinage.Circle(new vinage.Point(newEnemy.box.center.x, newEnemy.box.center.y), 175), new vinage.Circle(new vinage.Point(enemy.box.center.x, enemy.box.center.y), 175))) wellPositioned = false;
		}, this);
		this.planets.forEach(function (planet){
			if (!wellPositioned) return;
			if (this.universe.collide(newEnemy.aggroBox, planet.box)) wellPositioned = false;
		}, this);
		if (wellPositioned) this.enemies.push(newEnemy);
		iterations++;
	}

	this.teams = {};
	this.teamScores = {};
	var _teams = ["alienBeige", "alienBlue", "alienGreen", "alienPink", "alienYellow"];

	for (let teamNumber = 0; teamNumber !== 2; ++teamNumber) {
		let teamIndex = Math.floor(Math.random() * _teams.length);
		this.teams[_teams[teamIndex]] = [];
		this.teamScores[_teams[teamIndex]] = 0;
		_teams.splice(teamIndex, 1);
	}

	this.players.forEach(function(player) {//TODO: This. Better.
		var ws = player.ws;
		player = new engine.Player(player.name);//resetPlayers for team-reassignment
		player.ws = ws;
	}, this);
};
Lobby.prototype.assignPlayerTeam = function(player) {
	var teamsPlaying = Object.keys(this.teams);
	if (this.teams[teamsPlaying[0]].length === this.teams[teamsPlaying[1]].length) player.appearance = teamsPlaying[Math.round(Math.random())];
	else player.appearance = teamsPlaying[this.teams[teamsPlaying[0]].length > this.teams[teamsPlaying[1]].length ? 1 : 0];
	this.teams[player.appearance].push(player.pid);
	player.box = new vinage.Rectangle(new vinage.Point(0, 0), 0, 0);
	player.box.angle = Math.random() * Math.PI;
	player.attachedPlanet = -1;
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
		headerNames = ["lobby name", "players", "process time", "lifetime"],
		header = "";
	headerSizes.forEach(function(hSize, i) {
		header += (i !== 0 ? " | " : "") + headerNames[i].toUpperCase().bold + genSpaces(hSize - headerNames[i].length);
	});
	console.log(header);

	var lobbyAmount = 0, maxLobbies = 8; //should be different according to terminal height
	lobbies.some(function(lobby, index, array) {
		if (lobbyAmount >= 8) {
			console.log("... ("  + (array.length - maxLobbies) + " lobbies not listed)");
			return true; //some can be quitted with return, but it needs to return something so just return; doesnt work
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
	previous: {in: 0, out: 0},
	beingConstructed: {in: 0, out: 0},
	timer: 0
};
if(config.monitor) {
	process.stdout.write("\u001b[?1049h\u001b[H");
	var monitorTimerID = setInterval(monitoring, 500);
}

wss.on("connection", function(ws) {
	function cleanup() {
		lobbies.forEach(function(lobby) {
			lobby.players.some(function(player, i, players) {
				if (player.ws === ws) {
					if (config.dev) console.log("[DEV] ".cyan.bold + "DISCONNECT".italic + " Lobby: " + lobby.name + " Player: " + player.name);
					players.splice(i, 1);
					lobby.broadcast(MESSAGE.REMOVE_ENTITY.serialize([], [], [], [i]));
					return true;
				}
			});
		});
	}
	var player;
	ws.on("message", function(message, flags) {
		if (config.monitor) monitoring.traffic.beingConstructed.in += message.byteLength;
		switch (new Uint8Array(message, 0, 1)[0]) {
			case MESSAGE.GET_LOBBIES.value:
				var lobbyList = [];
				lobbies.forEach(function(lobby, i) {
					lobbyList.push({uid: lobbies.getUid(i), name: lobby.name, players: lobby.players.length, maxPlayers: lobby.maxPlayers});
				});
				player.send(MESSAGE.LOBBY_LIST.serialize(lobbyList));
				break;
			case MESSAGE.CREATE_LOBBY.value:
				var data = MESSAGE.CREATE_LOBBY.deserialize(message);
				if (data.playerAmount >= 1 && data.playerAmount <= 16 && data.name.length <= 32) lobbies.push(new Lobby(data.name, data.playerAmount));
				break;
			case MESSAGE.SET_NAME.value:
				let name = MESSAGE.SET_NAME.deserialize(message);
				if (player === undefined) {
					player = new engine.Player(name);
					player.ws = this;
				} else if (player.lobby !== undefined) {
					if (player.lobby.players.some(function(_player) {
						return _player.name === name;
					})) player.send(MESSAGE.ERROR.serialize(MESSAGE.ERROR.NAME_TAKEN));
					else {
						player.name = name;
						player.lobby.broadcast(MESSAGE.SET_NAME_BROADCAST.serialize(player.lobby.getPlayerId(player), name));
					}
				}
				break;
			case MESSAGE.CONNECT.value:
				let lobbyId = MESSAGE.CONNECT.deserialize(message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength)),
					lobby = lobbies.getByUid(lobbyId);

				if (player === undefined) engine.Player.prototype.send.call({ws: ws}, MESSAGE.ERROR.serialize(MESSAGE.ERROR.NAME_UNKNOWN));//we have to resort to this to use .send() even though the player is undefined
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
				}
				break;
			case MESSAGE.LEAVE_LOBBY.value:
				cleanup();
				break;
			case MESSAGE.PLAYER_CONTROLS.value:
				player.controls = MESSAGE.PLAYER_CONTROLS.deserialize(message);
				break;
			case MESSAGE.ACTION_ONE.value:
				console.log("generate shot!", message);
				if (player !== undefined) {
					let msgAsArrbuf = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);
					let newShot = engine.handleActionOne(player, MESSAGE.ACTION_ONE.deserialize(msgAsArrbuf), player.lobby);
					player.lobby.broadcast(MESSAGE.ADD_ENTITY.serialize([], [], [newShot], []));
				}
				break;
			case MESSAGE.ACTION_ONE.value:
				console.log("do whatever!");
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
lobbies.push(new Lobby("Lobby No. 1", 8));

