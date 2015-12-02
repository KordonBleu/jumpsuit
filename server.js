"use strict";

var fs = require("fs"),
	http = require("http"),
	WebSocketServer = require("ws").Server,
	MESSAGE = require("./static/message.js").MESSAGE,
	ERROR = require("./static/message.js").ERROR,
	engine = require("./static/engine.js"),
	vinage = require("./static/vinage/vinage.js");

var configSkeleton = {
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
		console.log("Succesfully loaded" + (firstRun === true ? "" : " modified") + " config file.");
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
			console.log("New properties added to \u001b[1mconfig.json\u001b[0m file: \u001b[4m" + addedProp.join("\u001b[0m, \u001b[4m") + "\u001b[0m");
		}
	} catch(err) {
		console.log(err, "Unproper config file found. Loading default settings.");
		config = configSkeleton;
	}
	if(previousConfig !== undefined) {
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

	rl.on("line", function (cmd) {
		//allowing to output variables on purpose
		console.log(eval(cmd));
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

	var extension = req.url.slice(req.url.lastIndexOf(".") - req.url.length + 1),
		mime;
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


function Lobby(name, maxPlayers){
	this.players = new Array(maxPlayers || 8);
	this.planets = [];
	this.enemies = [];
	this.shots = [];
	this.processTime = 2;
	this.state = 0; //waiting for players, currently playing, end
	this.stateTimer = 30;
	this.players.firstEmpty = function() {
		for (var i = 0; i < this.length; i++){
			if (this[i] === undefined) return i;
		}
		return -1;
	};
	this.players.amount = function() {
		var amount = 0;
		this.forEach(function(player) {
			amount += 1;
		});
		return amount;
	};
	this.players.getData = function() {
		var plData = [];
		this.forEach(function(player) {
			plData.push({name: player.name, appearance: player.appearance});
		});
		return plData;
	};
	this.enemies.getWorldData = function() {
		var enemData = [];
		for (var i = 0; i < this.length; i++){
			enemData.push({x: this[i].box.center.x, y: this[i].box.center.y, appearance: this[i].appearance});
		}
		return enemData;
	};
	this.enemies.getGameData = function() {
		var enemData = [], enemShotData;
		for (var i = 0; i < this.length; i++){
			enemData.push({angle: this[i].box.angle});
		}
		return enemData;
	};
	this.shots.getGameData = function() {
		var shotData = [];
		this.forEach(function(shot) {
			shotData.push({x: shot.box.center.x, y: shot.box.center.y, angle: shot.box.angle, lt: shot.lt});
		});
		return shotData;
	};
	this.planets.getWorldData = function() {
		var pltData = [];
		for (var i = 0; i < this.length; i++){
			pltData.push({x: this[i].box.center.x, y: this[i].box.center.y, radius: this[i].box.radius});
		}
		return pltData;
	};
	this.planets.getGameData = function() {
		var pltData = [];
		for (var i = 0; i < this.length; i++){
			pltData.push({color: this[i].progress.color, value: this[i].progress.value, team: this[i].progress.team});
		}
		return pltData;
	};
	this.getScores = function(){
		//TODO: send player scores too
		var i = {}, a;
		for (a in this.gameProgress) if (a.indexOf("alien") !== -1) i[a] = this.gameProgress[a];
		return i;			
	};


	this.universe =  new vinage.Rectangle(new vinage.Point(0, 0), Infinity, Infinity);
	this.universe.getWorldData = function() {
		return {x: this.universe.center.x, y: this.universe.center.y, width: this.universe.width, height: this.universe.height};
	}
	//generate world structure
	var areaSize = 6400,
		chunkSize = 1600;

	for (var y = 0; y < areaSize; y += chunkSize){
		for (var x = 0; x < areaSize; x += chunkSize){
			var px = Math.floor(Math.random() * (chunkSize - 400) + 200),
				py = Math.floor(Math.random() * (chunkSize - 400) + 200),
				radius = Math.floor(Math.random() * (px <= 300 || px >= chunkSize - 300 || py <= 300 || py >= chunkSize - 300 ? 80 : 250) + 100);
			this.planets.push(new engine.Planet(x + px, y + py, radius));
		}
	}

	var iterations = 0;
	while (iterations < 250 && this.enemies.length < 15){
		var newEnemy = new engine.Enemy(Math.floor(Math.random() * 6400), Math.floor(Math.random() * 6400)), wellPositioned = true;
		this.enemies.forEach(function (enemy){
			if (!wellPositioned) return;
			if (this.universe.collide(new vinage.Circle(new vinage.Point(newEnemy.box.center.x, newEnemy.box.center.y), 175), new vinage.Circle(new vinage.Point(enemy.box.center.x, enemy.box.center.y), 175))) wellPositioned = false;
		}.bind(this));
		this.planets.forEach(function (planet){
			if (!wellPositioned) return;
			if (this.universe.collide(newEnemy.aggroBox, planet.box)) wellPositioned = false;
		}.bind(this));
		if (wellPositioned) this.enemies.push(newEnemy);
		iterations++;
	}

	this.gameProgress = {ticks: 0, "alienBeige": 0, "alienBlue": 0, "alienGreen": 0, "alienPink": 0, "alienYellow": 0};
	this.name = name || "Unnamed Lobby";
	this.maxPlayers = maxPlayers || 8;
}
Lobby.prototype.broadcast = function(message) {
	this.players.forEach(function(player) {
		try {
			player.ws.send(message);
		} catch(e) {/*Ignore errors*/}
	});
};
Lobby.prototype.update = function() {
	if (this.players.amount() !== 0) this.stateTimer -= (16 / 1000);
	if (this.state === 0){
		this.broadcast(JSON.stringify({msgType: MESSAGE.LOBBY_STATE, data: {state: this.state, timer: this.stateTimer}}));
		if (this.stateTimer <= 0) {
			this.broadcast(JSON.stringify({msgType: MESSAGE.WORLD_DATA, data: {planets: this.planets.getWorldData(), enemies: this.enemies.getWorldData()}}));
			this.state = 1;
			this.stateTimer = 60;
		}
		return;
	} else if (this.state === 2){
		this.broadcast(JSON.stringify({msgType: MESSAGE.LOBBY_STATE, data: {state: this.state, timer: this.stateTimer}}));
		if (this.stateTimer <= 0){
			this.state = 0;
			this.stateTimer = 30;
			//TODO: if there are too less players, keep waiting until certain amount is reached - otherwise close the lobby(?)
		}
		return;		
	} else {
		if (this.stateTimer <= 0){
			this.state = 2;
			this.stateTimer = 10;
			this.broadcast(JSON.stringify({msgType: MESSAGE.SCORES, data: this.getScores()}));
			//TODO: display the scores
		}
	}
	
	var oldDate = Date.now(), playerData = [],
	sounds = engine.doPhysics(this.universe, this.players, this.planets, this.enemies, this.shots, false, this.gameProgress);

	this.processTime = Date.now() - oldDate;
	if (this.gameProgress.ticks++ === 50){
		this.planets.forEach(function(planet){
			if (planet.progress.value >= 80) this.gameProgress[planet.progress.team]++;
		}.bind(this));
		this.gameProgress.ticks = 0;
	}

	this.broadcast(JSON.stringify({msgType: MESSAGE.PLAY_SOUND, data: sounds}));

	this.players.forEach(function(player, i) {
		function truncTo(number, decimalNbr) {
			var lel = Math.pow(10, decimalNbr);
			return Math.round(number * lel) / lel;
		}
		playerData[i] = (player !== undefined) ? {x: truncTo(player.box.center.x, 5), y: truncTo(player.box.center.y, 5), attachedPlanet: player.attachedPlanet,
			angle: truncTo(player.box.angle, 7), walkFrame: player.walkFrame, health: player.health, fuel: player.fuel,
			name: player.name, appearance: player.appearance, looksLeft: player.looksLeft, jetpack: player.jetpack
		} : null;
	});
	this.players.forEach(function(player) {
		if (player === undefined) return;
		player.ws.send(JSON.stringify({
			msgType: MESSAGE.LOBBY_STATE,
			data: {
				state: this.state,
				timer: this.stateTimer
			}
		}));
		if (player.needsUpdate || player.needsUpdate === undefined) {
			player.needsUpdate = false;
			setTimeout(function() {
				try {
					player.ws.send(JSON.stringify({
						msgType: MESSAGE.GAME_DATA,
						data: {
							players: playerData,
							planets: this.planets.getGameData(),
							enemies: this.enemies.getGameData(),
							shots: this.shots.getGameData(),
							gameProgress: this.gameProgress
						}
					}));
					
					player.lastRefresh = Date.now();
					player.needsUpdate = true;
				} catch(e) {/*Ignore errors*/}
			}.bind(this), Math.min(90, Math.max(33, Date.now() - player.lastRefresh + player.latency)));
		}
	}.bind(this));
};
Lobby.prototype.pingPlayers = function() {
	this.players.forEach(function(player) {
		player.lastPing = {};
		player.lastPing.timestamp = Date.now();
		player.lastPing.key = Math.floor(Math.random()*65536);

		try {
			player.ws.send(JSON.stringify({
				msgType: MESSAGE.PING,
				data: {
					key: player.lastPing.key
				}
			}));
		} catch(e) {/*Ignore errors*/}
	});
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
		lobby.pingPlayers();
	});
}, 1000);

function monitoring() {
	function genSpaces(amount) {
		for(var spaces = ""; spaces.length !== amount; spaces += " ");
		return spaces;
	}
	process.stdout.write("\u001B[2J\u001B[0;0f");
	console.log("Jumpsuit Server [STATUS: RUNNING]");
	console.log("\nMonitoring Lobbies:");
	var headerSizes = [40, 10, 15],
		headerNames = ["lobby name", "players", "process time", "lifetime"],
		header = "";
	headerSizes.forEach(function(hSize, i) {
		header += (i !== 0 ? " | " : "") + "\u001b[1m" + headerNames[i].toUpperCase() + "\u001b[0m" + genSpaces(hSize - headerNames[i].length);
	});
	console.log(header);
	lobbies.forEach(function(lobby) {
		var info = lobby.name + genSpaces(headerSizes[0] - lobby.name.length),
			amount = lobby.players.amount().toString(),
			processTime = lobby.processTime.toString();
		info += " | " + amount + genSpaces(headerSizes[1] - amount.length);
		info += " | " + processTime;
		console.log(info);
	});
}
if(config.monitor) {
	process.stdout.write("\u001b[?1049h\u001b[H");
	var monitorTimerID = setInterval(monitoring, 500);
}

wss.on("connection", function(ws) {
	function cleanup() {
		lobbies.forEach(function(lobby) {
			lobby.players.some(function(player, i) {
				if (player.ws === ws) {
					lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + player.name + "' has left the game"}}));
					delete lobby.players[i];
					return true;
				}
			});
		});
	}
	var player;
	ws.on("message", function(message) {
		var msg;
		try {
			msg = JSON.parse(message);
			if(config.dev) console.log("received: ", msg);
			switch(msg.msgType) {
				case MESSAGE.CONNECT:
					var lobby = lobbies.getByUid(msg.data.uid);
					if(lobby.players.amount() === lobby.maxPlayers) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NO_SLOT}}));
					else if(lobby.players.some(function(player) { return player.name === msg.data.name; })) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NAME_TAKEN}}));
					else if(lobby === null) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NO_LOBBY}}));
					else {
						player = new engine.Player(msg.data.name, msg.data.appearance, 0, 0, this);
						var pid = lobby.players.firstEmpty();
						lobby.players.splice(pid, 1, player);
						ws.send(JSON.stringify({msgType: MESSAGE.PLAYER_CONNECTED, data: pid}));
						ws.send(JSON.stringify({msgType: MESSAGE.WORLD_DATA, data: {planets: lobby.planets.getWorldData(), enemies: lobby.enemies.getWorldData()}}));
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.PLAYER_SETTINGS, data: lobby.players.getData()}));
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + msg.data.name + "' connected"}}));
						player.lastRefresh = Date.now();
						ws.send(JSON.stringify({msgType: MESSAGE.LOBBY_STATE, data: {state: lobby.state}}));
					}
					break;
				case MESSAGE.GET_LOBBIES:
					var lobbyList = [];
					lobbies.forEach(function(lobby, i) {
						lobbyList.push({uid: lobbies.getUid(i), name: lobby.name, players: lobby.players.amount(), maxPlayers: lobby.maxPlayers});
					});
					ws.send(JSON.stringify({msgType: MESSAGE.SENT_LOBBIES, data: lobbyList}));
					break;
				case MESSAGE.CREATE_LOBBY:
					lobbies.push(new Lobby(msg.data.name, 8));
					break;
				case MESSAGE.PLAYER_SETTINGS:
					var lobby = lobbies.getByUid(msg.data.uid);
					if (lobby === null) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NO_LOBBY}}));
					else {
						var oldName = player.name;
						player.name = msg.data.name;
						player.appearance = msg.data.appearance;
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.PLAYER_SETTINGS, data: lobby.players.getData()}));
						if (oldName !== msg.data.name) lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + oldName + "' changed name to '" + msg.data.name + "'"}}));
					}
					break;
				case MESSAGE.CHAT:
					var lobby = lobbies.getByUid(msg.data.uid);
					if (lobby !== null) {
						i = msg.data.content;
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: i, name: player.name, appearance: player.appearance}}));
					}
					break;
				case MESSAGE.PLAYER_CONTROLS:
					var lobby = lobbies.getByUid(msg.data.uid);
					if (lobby !== null){
						for (var i in msg.data.controls) {
							player.controls[i] = msg.data.controls[i];
						}
					}
					break;
				case MESSAGE.LEAVE_LOBBY:
					cleanup();
					break;
				case MESSAGE.PONG:
					var lobby = lobbies.getByUid(msg.data.uid);
					if(lobby !== null) {
						if(player.lastPing.key === msg.data.key) {
							player.latency = (Date.now() - player.lastPing.timestamp) / 2;
							//up speed is usually faster than down speed so we can send world data at `thisPlayer.latency` pace
						}
					}
					break;
			}
		} catch (err) {
			console.log("ERROR", err, msg);
		}
	});
	ws.on("close", cleanup);
});

lobbies.push(new Lobby("Lobby No. 1", 7));

