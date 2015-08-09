var fs = require("fs"),
	readline = require("readline"),
	http = require("http"),
	WebSocketServer = require("ws").Server,
	MESSAGE = require("./static/message.js").MESSAGE,
	ERROR = require("./static/message.js").ERROR,
	collisions = require("./static/collisions.js"),
	engine = require("./static/engine.js");

var serverParams = {
	private: false,
	name: "Another Jumpsuit Server",
	port: 8080,
	debug: false
};

if (fs.existsSync("config.json")) {
	var content = fs.readFileSync("config.json", {encoding: ""}).toString(),
		parameters;	
	try {
		parameters = JSON.parse(content);
	} catch (e) {
		console.log("[ERROR] Error occured while loading config file!");
	}
	serverParams.private = Boolean(parameters.private);
	serverParams.name = parameters.name || "Another Jumpsuit Server";
	serverParams.port = parseInt(parameters.port, 10) || 8080;
	serverParams.debug = Boolean(parameters.debug);
}
for (param in serverParams)	console.log(param + " = '" + serverParams[param] + "'");

if (serverParams.debug === true){
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on("line", function (cmd) {
		//allowing to output variables on purpose
		console.log(eval(cmd));
	});
}

function createPlainConfigFile(){
	fs.writeFile("config.json", JSON.stringify(serverParams));
}

//send static files
var server = http.createServer(function (req, res){
	if(req.url === "/") req.url = "/index.html";
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
	fs.readFile(__dirname + "/static" + req.url, function (err, data){
		if (err) {
			if(err.code === "ENOENT"){
				res.writeHead(404);
				res.end("Error 404:\n" + JSON.stringify(err) + __dirname);
			} else {
				res.writeHead(500);
				res.end("Error 500:\n" + JSON.stringify(err));
			}
			return;
		}
		res.setHeader("Content-Type", mime);
		res.writeHead(200);
		res.end(data);
	});
});
server.listen(8080);

var lobbies = [],
	wss = new WebSocketServer({server: server});


function Lobby(name, maxPlayers){
	this.players = new Array(maxPlayers || 8);
	this.planets = [];
	this.enemies = [];
	this.processTime = 0;
	this.players.firstEmpty = function(){
		for (var i = 0; i < this.length; i++){
			if (this[i] === undefined) return i;
		}
		return -1;
	};
	this.players.amount = function(){
		var amount = 0;
		this.forEach(function(player) {
			amount += 1;
		});
		return amount;
	};
	this.players.getData = function(){
		var plData = [];
		this.forEach(function(player) {
			plData.push({name: player.name, appearance: player.appearance});
		});
		return plData;
	};
	this.enemies.getWorldData = function(){
		var enemData = [];
		for (var i = 0; i < this.length; i++){			
			enemData.push({x: this[i].box.center.x, y: this[i].box.center.y, appearance: this[i].appearance, angle: this[i].box.angle});
		}
		return enemData;
	};
	this.enemies.getGameData = function(){
		var enemData = [], enemShotData;
		for (var i = 0; i < this.length; i++){
			enemShotData = [];
			for (var j = 0; j < this[i].shots.length; j++){
				enemShotData.push({x: this[i].shots[j].box.center.x, y: this[i].shots[j].box.center.y, angle: this[i].shots[j].box.angle, lt: this[i].shots[j].lt});
			}
			enemData.push({angle: this[i].box.angle, shots: enemShotData});
		}
		return enemData;
	};
	this.planets.getWorldData = function(){
		var pltData = [];
		for (var i = 0; i < this.length; i++){
			pltData.push({x: this[i].box.center.x, y: this[i].box.center.y, radius: this[i].box.radius});
		}
		return pltData;
	};
	this.planets.getGameData = function(){
		var pltData = [];
		for (var i = 0; i < this.length; i++){
			//pltData.push(this[i].progress);
			pltData.push({color: this[i].progress.color, value: this[i].progress.value});
		}
		return pltData;
	};

	
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
	this.enemies.push(new engine.Enemy(800, -600));

	this.name = name || "Unnamed Lobby";
	this.maxPlayers = maxPlayers || 8;
}
Lobby.prototype.broadcast = function(message) {
	this.players.forEach(function(player) {
		try {
			player.ws.send(message);
		} catch(e) {/*Ignore errors*/}
	});
}
Lobby.prototype.update = function() {
	var oldDate = Date.now(), playerData = [];
	engine.doPhysics(this.players, this.planets, this.enemies);
	this.processTime = Date.now() - oldDate;

	this.players.forEach(function(player, i) {
		function truncTo(number, decimalNbr) {
			var lel = Math.pow(10, decimalNbr);
			return Math.round(number * lel) / lel;
		}
		playerData[i] = (player !== undefined) ? {x: truncTo(player.box.center.x, 5), y: truncTo(player.box.center.y, 5), attachedPlanet: player.attachedPlanet,
			angle: truncTo(player.box.angle, 7), walkFrame: player.walkFrame, health: player.health, fuel: player.fuel,
			name: player.name, appearance: player.appearance, looksLeft: player.looksLeft
		} : undefined;		
	});
	this.players.forEach(function(player, i) {
		setTimeout(function() {
			if (player === undefined) return;
			try {
				player.ws.send(JSON.stringify({
					msgType: MESSAGE.PLAYER_DATA,
					data: playerData
				}));
				player.ws.send(JSON.stringify({
					msgType: MESSAGE.GAME_DATA,
					data: {
						planets: this.planets.getGameData(),
						enemies: this.enemies.getGameData()
					}
				}));
			player.lastRefresh = Date.now();
			} catch(e) {/*Ignore errors*/}
		}.bind(this), Math.max(16, Date.now() - player.lastRefresh + player.latency));
	}.bind(this));

}
Lobby.prototype.pingPlayers = function() {
	this.players.forEach(function(player) {
		player.lastPing = {};
		player.lastPing.timestamp = Date.now();
		player.lastPing.key = Math.floor(Math.random()*65536);

		player.ws.send(JSON.stringify({
			msgType: MESSAGE.PING,
			data: {
				key: player.lastPing.key
			}
		}));
	});
}
lobbies.getUid = function(index) {
	var uid = index.toString(16);
	while(uid.length !== 6) {
		uid = "0" + uid;
	}
	return uid;
}
lobbies.getByUid = function(uid) {
	var index = parseInt(uid, 16);
	if(index === NaN || !isFinite(index) || index % 1 !== 0) return null;
	return this[index];
}

setInterval(function() {
	lobbies.forEach(function(lobby) {
		lobby.update();
	});
}, 16);

setInterval(function() {
	if(lobbies[0].players[0]) console.log("latency", lobbies[0].players[0].latency);
	lobbies.forEach(function(lobby) {
		lobby.pingPlayers();
	});
}, 1000);

function monitoring(){
	process.stdout.write('\033c');
	console.log("Jumpsuit Server [STATUS: RUNNING]");
	console.log("\nMonitoring Lobbies:");
	var headerSizes = [40, 10, 20],
		headerNames = ["lobby name", "player", "process time", "lifetime"],
		header = "";
	for (var i = 0; i < headerSizes.length; i++){
		header += (i !== 0 ? " | " : "") + headerNames[i].toUpperCase() + Array(headerSizes[i] - headerNames[i].length).join(" ");
	}
	console.log(header);
	for (var i = 0; i < lobbies.length; i++){
		var info = lobbies[i].name + Array(headerSizes[0] - lobbies[i].name.length).join(" "),
			amount = lobbies[i].players.amount().toString(),
			processTime = lobbies[i].processTime.toString();
		info += " | " + amount + Array(headerSizes[1] - amount.length).join(" ");
		info += " | " + processTime + Array(headerSizes[2] - processTime.length).join(" ");
		console.log(info);
	}
}
if(process.argv[2] === "-m") setInterval(monitoring, 500);

wss.on("connection", function(ws) {
	ws.on("message", function(message) {
		var msg;
		try {
			msg = JSON.parse(message);
			console.log("received: ", msg);
			switch(msg.msgType){
				case MESSAGE.CONNECT:
					var lobby = lobbies.getByUid(msg.data.uid);
					if(lobby.players.amount() === lobby.maxPlayers) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NO_SLOT}}));
					else if(lobby.players.some(function(player) { return player.name === msg.data.name; })) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NAME_TAKEN}}));
					else if(lobby === null) ws.send(JSON.stringify({msgType: MESSAGE.ERROR, data: {code: ERROR.NO_LOBBY}}));
					else {
						var pid = lobby.players.firstEmpty();
						lobby.players.splice(pid, 1, new engine.Player(msg.data.name, msg.data.appearance, 0, 0, this));
						ws.send(JSON.stringify({msgType: MESSAGE.CONNECT_SUCCESSFUL, data: {pid: pid}}));
						ws.send(JSON.stringify({msgType: MESSAGE.WORLD_DATA, data: {planets: lobby.planets.getWorldData(), enemies: lobby.enemies.getWorldData()}}));
						lobby.players[pid].lastRefresh = Date.now();
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.PLAYER_SETTINGS, data: lobby.players.getData()}));
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + msg.data.name + "' connected", pid: -1}}));
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
						var oldName = lobby.players[msg.data.pid].name;
						lobby.players[msg.data.pid].name = msg.data.name;
						lobby.players[msg.data.pid].appearance = msg.data.appearance;
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.PLAYER_SETTINGS, data: lobby.players.getData()}));
						if (oldName !== msg.data.name) lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + oldName + "' changed name to '" + msg.data.name + "'", pid: -1}}));
					}
					break;
				case MESSAGE.CHAT:
					var lobby = lobbies.getByUid(msg.data.uid);
					if (lobby !== null){
						i = msg.data.content;
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: i, name: lobby.players[msg.data.pid].name, pid: msg.data.pid}}));
					}
					break;
				case MESSAGE.PLAYER_CONTROLS:
					var lobby = lobbies.getByUid(msg.data.uid);
					if (lobby !== null){
						for (i in msg.data.controls){
							lobby.players[msg.data.pid].controls[i] = msg.data.controls[i];
						}
					}
					break;
				case MESSAGE.DISCONNECT:
				case MESSAGE.LEAVE_LOBBY:
					var lobby = lobbies.getByUid(msg.data.uid);
					if (lobby !== null){
						delete lobby.players[msg.data.pid];
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + lobby.players[msg.data.pid].name + "' has left the game", pid: -1}}));						
					}
					break;
				case MESSAGE.PONG:
					var lobby = lobbies.getByUid(msg.data.uid);
					if(lobby !== null) {
						var thisPlayer = lobby.players[msg.data.pid];
						if(thisPlayer.lastPing.key === msg.data.key) {
							thisPlayer.latency = (Date.now() - thisPlayer.lastPing.timestamp) / 2;
							//up speed is usually faster than down speed so we can send world data at `thisPlayer.latency` pace
						}
					}
					break;
			}
		} catch (e){
			console.log("ERROR", e, msg);
		}
	});
	ws.on("close", function(e){
		var found = false;
		lobbies.forEach(function (lobby){
			lobby.players.forEach(function (player, i){
				if (player.ws == ws){
					delete lobby.players[i];
					lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + player.name + "' has left the game", pid: -1}}));
					found = true;
					return;
				}
			});
			if (found) return;
		});
	});
});

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

lobbies.push(new Lobby("Lobby No. 1", 7));
