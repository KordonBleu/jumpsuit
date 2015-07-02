var fs = require("fs"),
	readline = require("readline"),
	http = require("http"),
	WebSocketServer = require("ws").Server;

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
		res.writeHead(200);
		res.end(data);
	});
});
server.listen(8080);


var lobbies = [],
	wss = new WebSocketServer({server: server});

lobbies.createLobby = function(_name, _maxPlayers){
	var n = (typeof(_name) === "undefined") ? "Unnamed Lobby" : _name,
		m = (typeof(_maxPlayers) === "undefined") ? 8 : _maxPlayers,
		f = function(){
			var o = [];
			this.players.forEach(function(p, i){
				o[i] = (p === 0) ? 0 : {name: p.name, appearance: p.appearance};
			});
			return o;
		},
		chunks = [],
		planets = [],
		planetColours = [
			"rgb(255,51,51)",
			"rgb(220,170,80)",
			"rgb(120, 240,60)",
			"rgb(12,135,242)",
			"rgb(162,191,57)",
			"rgb(221,86,41)",
			"rgb(54,38,127)",
			"rgb(118,33,129)"
		], chunkSize = 4000;

	function Planet(x, y, radius, color, enemies) {
		this.box = new Circle(new Point(x, y), radius);
		this.color = color;
		this.player = -1;
		this.enemies = enemies;
	}
	function Enemy(x, y, appereal){	
		this.x = x;
		this.y = y;
		this.appereal = appereal;
		this.fireRate = 0;
		this.angle = 0
		this.shots = [];
	}
	chunks.chunkExist = function(x, y){
		var result = -1;
		this.forEach(function (element, index){
			if (element.x == x && element.y == y){
				result = index;
				return;
			}
		});
		return result;
	}
	chunks.removeChunk = function (x, y){
		var c = this.chunkExist(x, y);
		if (c < 0) return;
		for (var i = 0; i < planets.length; i++){
			if (planets[i].box.center.x >= x * chunkSize && planets[i].box.center.x <= (x + 1) * chunkSize && planets[i].box.center.y >= y * chunkSize && planets[i].box.center.y <= (y + 1) * chunkSize){
				planets.splice(i,1);
				i--;
			}
		}
		chunks.splice(c, 1);
	}
	chunks.addChunk = function (x, y){
		if (this.chunkExist(x, y) >= 0) return;
		var planetsAmount = Math.floor(Math.map(Math.random(), 0, 1, 2, 6));
		
		for (var i = 0; i < planetsAmount; i++){
			var planetRadius = Math.map(Math.random(), 0, 1, 150, (chunkSize - 150) / (3 * planetsAmount)),
				planetColour = planetColours[Math.floor(Math.random() * planetColours.length)],
				enemyAmount = Math.floor(Math.map(Math.random(), 0, 1, 0, (planetRadius < 200) ? 2 : 4)),
				planetPosition = {px: (((i + 1) / planetsAmount) + x) * chunkSize, py: Math.map(Math.random(), 0, 1, y * chunkSize, (y + 1) * chunkSize)}; 		

			var lastEnemyAng = 0, enemies = [];
			for (var j = 0; j < enemyAmount; j++){
				var enemyAng = Math.map(Math.random(), 0, 1, lastEnemyAng + Math.PI / 4, lastEnemyAng + Math.PI * 1.875),
					enemyDistance = Math.floor(Math.map(Math.random(), 0, 1, planetRadius * 1.5, planetRadius * 4)),
					enemyResources = ["Black1", "Black2", "Black3", "Black4", "Black5", "Blue1", "Blue2", "Blue3", "Green1", "Green2", "Red1", "Red2", "Red3"];
				enemies[j] = new Enemy(Math.sin(enemyAng) * enemyDistance, -Math.cos(enemyAng) * enemyDistance, "enemy" + enemyResources[Math.floor(Math.random() * enemyResources.length)]);
				lastEnemyAng = enemyAng;
			}
			planets.push(new Planet(planetPosition.px, planetPosition.py, planetRadius, planetColour, enemies));
		}
		chunks.push({x: x, y: y});
	}
	chunks.addChunk(0, 0);
	this.push({uid: generateUid(), lobbyName: n, players: Array.apply(null, Array(m)).map(Number.prototype.valueOf, 0), playersAmount: 0, getPlayerData: f, chunks: chunks, planets: planets});
}
lobbies.findLobbyUid = function (uid){
	for (var i = 0; i != lobbies.length; i++){
		lobbies[i].uid === uid;
		return i;
	}
	return -1;
}

function generateUid(){
	//hexadecimal form 1048576 to 16777215
	//TODO: make it not repeatable ! (important :D)
	return Math.floor(Math.random() * 16 * 1048576).toString(16);
}

var MESSAGE_ERROR = 0,
	MESSAGE_CONNECT = 1,
	MESSAGE_GET_LOBBIES = 2,
	MESSAGE_SENT_LOBBIES = 3,
	MESSAGE_SETTINGS_CHANGED = 4,
	MESSAGE_CREATE_LOBBY = 5,
	MESSAGE_CONNECT_ERR_FULL = 6,
	MESSAGE_CONNECT_SUCCESSFUL = 7,
	MESSAGE_PLAYER_DATA = 8,
	MESSAGE_PLAYER_POSITIONS = 9,
	MESSAGE_CHUNKS = 10,
	MESSAGE_CHECK_ALIVE = 11,
	MESSAGE_DISCONNECT = 12,
	MESSAGE_LEAVE_LOBBY = 13,
	MESSAGE_PLAYER_CONTROLS = 14,
	MESSAGE_GAME_PLANETS = 15;

wss.on("connection", function(ws){	
	ws.on("message", function(message){
		var msg;
		try{
			msg = JSON.parse(message);
			console.log("received: ", msg);
		} catch(e) {
			console.log(e, message);
			return;
		}
		switch(msg.msgType){
			case MESSAGE_CONNECT:
				var id = lobbies.findLobbyUid(msg.data.uid);
				if (id >= 0){
					if (lobbies[id].players.length === lobbies[id].maxplayers){
						ws.send(JSON.stringify({msgType: MESSAGE_CONNECT_ERR_FULL}));
					} else {
						var pid = lobbies[id].players.indexOf(0), data;
						lobbies[id].players.splice(pid, 1, ({name: msg.data.name, appearance: msg.data.appearance, ws: this}));
						lobbies[id].playersAmount++;
						ws.send(JSON.stringify({msgType: MESSAGE_CONNECT_SUCCESSFUL, data: {pid: pid}}));							
						ws.send(JSON.stringify({msgType: MESSAGE_PLAYER_DATA, data: lobbies[id].getPlayerData()}));
						ws.send(JSON.stringify({msgType: MESSAGE_GAME_PLANETS, data: lobbies[id].planets}));
					}
				}
				break;
			case MESSAGE_GET_LOBBIES:
				var i, j = [];
				for (i = 0; i != lobbies.length; i++){
					j[i] = {uid: lobbies[i].uid, name: lobbies[i].lobbyName, players: lobbies[i].playersAmount, maxplayers: lobbies[i].players.length};
				}
				ws.send(JSON.stringify({msgType: MESSAGE_SENT_LOBBIES, data: j}));
				break;
			case MESSAGE_CREATE_LOBBY:
				lobbies.createLobby(msg.data.name, 8);
				break;
			case MESSAGE_PLAYER_DATA:
				var id = lobbies.findLobbyUid(msg.data.uid);
				if (id >= 0){
					lobbies[id].players[msg.data.pid] = {name: msg.data.name, appearance: msg.data.appearance, ws: this};
					ws.send(JSON.stringify({msgType: MESSAGE_PLAYER_DATA, data: lobbies[id].getPlayerData()}));
				} else {
					ws.send(JSON.stringify({msgType: MESSAGE_ERROR, data: {content: "Lobby doesnt exist (anymore)"}}));
				}
				break;
			case MESSAGE_DISCONNECT:
			case MESSAGE_LEAVE_LOBBY:
				var id = lobbies.findLobbyUid(msg.data.uid);
				if (id >= 0){
					lobbies[id].players[msg.data.pid] = 0;
					lobbies[id].playersAmount--;
				}
				break;
		}		
	});
	ws.on("close", function(e){
		var found = false;
		console.log("testing....");
		lobbies.forEach(function (lobby){			
			lobby.players.forEach(function (player, i){
				if (player.ws == ws){
					console.log("player found in " + lobby.lobbyName + " : " + i);
					lobby.players[i] = 0;
					lobby.playersAmount--;
					found = true;
					return;	
				}
			});
			if (found) return;
		});
		if (!found) console.log("No player found / wasnt connected to a lobby");
	});
});

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}





//collision.js
function CachedObject(){
	//call `return CachedObject.call(this);` at the end of any constructor
	//to make it inherit from `CachedObject`
	var handler = {
		set: function(target, name, value){
			if(target.hasOwnProperty(name)){
				target._cache.needsUpdate = true;
				target[name] = value;
			} else {
				throw new ReferenceError("This object doesn't allow properties to be added");
			}
		}
	}
	this._cache = {
		needsUpdate: true
	};
	if(typeof Proxy !== "undefined"){
		var proxy = new Proxy(this, handler);
		return proxy;
	}
}

/* Do NOT inherit from the following classes!
   Why? Because the cache will be set to be refreshed if you modify
   any property of the instance of the inheriting class. */
function Point(x, y){
	this.x = x;
	this.y = y;
	return CachedObject.call(this);
}

function Vector(argOne, argTwo){
	if(typeof argOne === "number" && typeof argTwo === "number", typeof x){//they are coordinates
		this.x = argOne;
		this.y = argTwo;
	} else if(argOne instanceof Point && argoTwo instanceof Point){
		this.x = argTwo.x - argOne.x;
		this.y = argTwo.y - argOne.y;
	}
	return CachedObject.call(this);
}
Object.defineProperty(Vector.prototype, "orthogonalVector", {
	get: function(){
		if(this._cache.needsUpdate){
			this._cache.needsUpdate = false;
			this._cache.orthogonalVector = new Vector(-this.y, this.x);
		}
		return this._cache.orthogonalVector;
	}
});

function Rectangle(centerPoint, width, height, angle){
	this.center = centerPoint;
	this.width = width;
	this.height = height;

	this.angle = angle === undefined ? 0 : angle;

	this._unrotatedVertices = [new Point(this.center.x - this.width/2, this.center.y - this.height/2), new Point(this.center.x + this.width/2, this.center.y + this.height/2), new Point(this.center.x - this.width/2, this.center.y + this.height/2), new Point(this.center.x + this.width/2, this.center.y - this.height/2)];
	return CachedObject.call(this);
}
Object.defineProperties(Rectangle.prototype, {
	"vertices": {
		get: function(){
			if(this._cache.needsUpdate || this.center._cache.needsUpdate){
				console.log("let's update this shit");
				this._cache.needsUpdate = false;
				this.center._cache.needsUpdate = false;

				this._cache.vertices = [];
				this._unrotatedVertices.forEach(function(vertex, index){
					var newVertex = new Point(
						vertex.x*Math.cos(this.angle) - vertex.y*Math.sin(this.angle),
						vertex.x*Math.sin(this.angle) - vertex.y*Math.cos(this.angle)
					);
					this._cache.vertices[index] = newVertex;
				}, this);
			}
			return this._cache.vertices;
		}
	},
	"collision": {
		value: function(geomObj){
			if(geomObj instanceof Rectangle) {
				console.log(this);
				if(this.angle === 0 && geomObj.angle === 0) {
					return Collib.aabbAabb(this, geomObj);
				} else {
					return Collib.obbObb(this, geomObj);
				}
			} else if(geomObj instanceof Circle) {
					return Collib.circleObb(geomObj, this);
			} else {
				throw new TypeError("Not a valid geometric object");
			}
		}
	}
});

function Circle(centerPoint, radius) {
	this.center = centerPoint;
	this.radius = radius;
}
Object.defineProperty(Circle.prototype, "collision", {
	value: function(geomObj){
		if(geomObj instanceof Rectangle) {
			return Collib.circleObb(this, geomObj);
		} else {
			throw new TypeError("Not a valid geometric object");
		}
	}
});



var Collib = new function(){
	this.circleObb = function(circle, rect) {
		var rot = rect.angle > 0 ? -rect.angle : -rect.angle + Math.PI,
			deltaX = circle.center.x - rect.center.x,
			deltaY = circle.center.y - rect.center.y,
			tCircleX = Math.cos(rot) * deltaX - Math.sin(rot) * deltaY + rect.center.x,//rotate the circle around the center of the OOB
			tCircleY = Math.sin(rot) * deltaX + Math.cos(rot) * deltaY + rect.center.y;//so that the OBB can be treated as an AABB
		deltaX = Math.abs(tCircleX - rect.center.x);
		deltaY = Math.abs(tCircleY - rect.center.y);

		if(deltaX > rect.width / 2 + circle.radius || deltaY > rect.height / 2 + circle.radius) return false;

		if(deltaX <= rect.width / 2 || deltaY <= rect.height / 2) return true;

		return Math.pow(deltaX - rect.height/2, 2) + Math.pow(deltaY - rect.width/2, 2) <= Math.pow(circle.radius, 2);
	}

	this.obbObb = function(rectOne, rectTwo) {
		//rotate the first OOB to transform it in AABB to simplify calculations
		var rectTwoRot = rectTwo.angle - rectOne.angle;

		//we can't check against the diagonal because it is too CPU intensive
		var sideSum = rectTwo.width + rectTwo.height;//so we check against the sum of the sides which is > than the diagonal (not to much hopefully)
		if (!this.aabbAabb(rectOne, new Rectangle(new Point(rectTwo.center.x, rectTwo.center.y), sideSum, sideSum))) return false;//eliminates most non-collisions

		var axesVectOne =  [{x: 1, y: 0}, {x:0, y:1}],//rectOne is an AABB
			axesVectTwo = [];
			rectTwo.vertices.forEach(function(vertex, index, array) {
				var prevVertex = index === 0 ? array[array.length - 1] : array[index - 1],
				vector = new Vector(vertex - prevVertex).orthogonalVector;

				axesVectTwo.push(vector);
		});
	}

	this.aabbAabb = function(rectOne, rectTwo){
		//if(rectOne.angle !== 0 || rectTwo.angle !== 0) throw new TypeError("At least one of the submitted rectangle is not an AABB");
		if(rectOne.center.x - rectTwo.width/2 >= rectOne.center.x + rectOne.width/2
		|| rectTwo.center.x + rectTwo.width/2 <= rectOne.center.x - rectOne.width/2
		|| rectTwo.y - rectTwo.height/2 >= rectOne.center.y + rectOne.height/2
		|| rectTwo.y + rectTwo.height/2 <= rectOne.center.y - rectOne.height/2)
			return false;
		else
			return true;
	}
}
