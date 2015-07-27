var fs = require("fs"),
	readline = require("readline"),
	http = require("http"),
	WebSocketServer = require("ws").Server,
	MESSAGE = require("./static/message.js").MESSAGE,
	ERROR = require("./static/message.js").ERROR,
	collisions = require("./static/collisions.js"),
	engine = require("./static/engine.js");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on("line", function (cmd) {
	//allowing to output variables on purpose
	console.log(eval(cmd));
});

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
	this.enemies.getData = function(){
		var serEnemies = [];
		for (var i = 0; i < this.length; i++){
			var serShots = [];
			for (var j = 0; j < this[i].shots.length; j++){
				serShots.push({x: this[i].shots[j].box.center.x, y: this[i].shots[j].box.center.y, angle: this[i].shots[j].box.angle, lt: this[i].shots[j].lt});
			}
			serEnemies.push({x: this[i].box.center.x, y: this[i].box.center.y, appearance: this[i].appearance, shots: serShots, angle: this[i].box.angle});
		}
		return serEnemies;
	}
	this.planets.getData = function(){
		var j = [];
		for (var i = 0; i < this.length; i++){
			j.push({x: this[i].box.center.x, y: this[i].box.center.y, radius: this[i].box.radius, progress: this[i].progress});
		}
		return j;
	}


	this.planets.push(new engine.Planet(300, 500, 180));
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
	var oldDate = new Date();
	engine.doPhysics(this.players, this.planets, this.enemies);
	this.processTime = new Date() - oldDate;

	for (var i = 0; i < this.players.length; i++){
		if (this.players[i] === undefined) continue;
		var toSend = JSON.stringify({
			msgType: MESSAGE.PLAYER_DATA,
			data: {
				pid: i, x: this.players[i].box.center.x.toFixed(2), y: this.players[i].box.center.y.toFixed(2),
				angle: this.players[i].box.angle.toFixed(4), walkFrame: this.players[i].walkFrame, health: this.players[i].health, fuel: this.players[i].fuel,
				name: this.players[i].name, appearance: this.players[i].appearance, looksLeft: this.players[i].looksLeft
			}
		});
		this.broadcast(toSend);
	}
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

function updateLobbies(){
	lobbies.forEach(function(lobby) {
		lobby.update();
	});
}
setInterval(updateLobbies, 16);//update cycle
//note that 16ms actually means 16 up to 16 + ~5

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

wss.on("connection", function(ws){
	ws.on("message", function(message){
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
						ws.send(JSON.stringify({msgType: MESSAGE.GAME_DATA, data: {planets: lobby.planets.getData(), enemies: lobby.enemies.getData()}}));
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
						lobby.broadcast(JSON.stringify({msgType: MESSAGE.CHAT, data: {content: "'" + lobby.players[msg.data.pid].name + "' has left the game", pid: -1}}));
						delete lobby.players[msg.data.pid];
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
