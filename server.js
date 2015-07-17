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


var MESSAGE_ERROR = 0,
	MESSAGE_CONNECT = 1,
	MESSAGE_GET_LOBBIES = 2,
	MESSAGE_SENT_LOBBIES = 3,
	MESSAGE_SETTINGS_CHANGED = 4,
	MESSAGE_CREATE_LOBBY = 5,
	MESSAGE_CONNECT_ERR_FULL = 6,
	MESSAGE_CONNECT_SUCCESSFUL = 7,
	MESSAGE_PLAYER_SETTINGS = 8,
	MESSAGE_PLAYER_POSITIONS = 9,
	MESSAGE_CHUNKS = 10,
	MESSAGE_CHECK_ALIVE = 11,
	MESSAGE_DISCONNECT = 12,
	MESSAGE_LEAVE_LOBBY = 13,
	MESSAGE_PLAYER_CONTROLS = 14,
	MESSAGE_GAME_DATA = 15,
	MESSAGE_CHAT = 16,
	MESSAGE_PLAYER_DATA = 17,
	MESSAGE_PLAYER_CONTROLS = 18;

var lobbies = [],
	wss = new WebSocketServer({server: server});

function Player(name, appearance, ws, width, height){
	this.name = name;
	this.appearance = appearance;
	this.ws = ws;
	this.box = new Rectangle(new Point(0, 0), width, height);
	this.controls = {jump: 0, crouch: 0, jetpack: 0, moveLeft: 0, moveRight: 0, run: 0};
	this.velocity = new Vector(0, 0);
	this.walkFrame = "_stand";
	this.health = 10;
	this.fuel = 400;
	this.attachedPlanet = -1;
	this.planet = 0;
}

function Planet(x, y, radius, color) {
	this.box = new Circle(new Point(x, y), radius);
	this.atmosBox = new Circle(this.box.center, radius * (1.5 + Math.random()/2));
	this.color = color;		
}
function Enemy(x, y) {
	this.box = new Rectangle(new Point(x, y), 0, 0);
	this.appearance = this.resources[Math.floor(Math.random() * this.resources.length)];
	this.aggroBox = new Circle(new Point(x, y), 350);
	this.fireRate = 0;
	this.shots = [];
}
Enemy.prototype.resources = ["Black1", "Black2", "Black3", "Black4", "Black5", "Blue1", "Blue2", "Blue3", "Green1", "Green2", "Red1", "Red2", "Red3"];

function lobby(_name, _maxplayers){
	this.players = new Array(_maxplayers | 8),
	this.planets = [],
	this.enemies = [];		
	this.processtime = 0;
	this.players.firstEmpty = function(){
		for (var i = 0; i < this.length; i++){
			if (this[i] === undefined) return i;
		}
	};
	this.players.amount = function(){
		var i, j = 0;
		for (i = 0; i < this.length; i++){
			j += (this[i] !== undefined) * 1;
		}
		return j;
	};
	this.players.getData = function(){
		var i, j = [];
		for (i = 0; i < this.length; i++){
			if (this[i] !== undefined) j.push({name: this[i].name, appearance: this[i].appearance});
		}
		return j;
	};
	this.enemies.getData = function(){
		var i, j, k, l = [];
		for (i = 0; i < this.length; i++){
			k = [];
			for (j = 0; j < this[i].shots.length; j++){
				k.push({x: this[i].shots[j].box.center.x, y: this[i].shots[j].box.center.y, angle: this[i].shots[j].box.angle, lt: this[i].shots[j]});
			}
			l.push({x: this[i].box.center.x, y: this[i].box.center.y, appearance: this[i].appearance, shots: k, angle: this[i].box.angle});
		}
		return l;
	}
	this.planets.getData = function(){
		var i, j = [];
		for (i = 0; i < this.length; i++){
			j.push({x: this[i].box.center.x, y: this[i].box.center.y, radius: this[i].box.radius});
		}
		return j;
	}	

	function _update(){
		var oldDate = new Date();
		for (var i = 0; i < this.players.length; i++){
			if (this.players[i] === undefined) continue;

			for (var enemy, ei = 0; ei < this.enemies.length; ei++){
				enemy = this.enemies[ei];
				if (!(enemy.aggroBox.collision(this.players[i].box))){
					enemy.box.angle = enemy.box.angle + Math.PI / 150;
					enemy.fireRate = 0;
				} else {
					enemy.box.angle = Math.PI - Math.atan2(enemy.box.center.x - this.players[i].box.center.x, enemy.box.center.y - this.players[i].box.center.y);
					if (++enemy.fireRate >= 20) {
						enemy.fireRate = 0;
						enemy.shots.push({box: new Rectangle(new Point(enemy.box.center.x, enemy.box.center.y), 9, 37, enemy.box.angle - Math.PI), lt: 200});
					}
				}
				for (var shot, si = 0; si < enemy.shots.length; si++){
					shot = enemy.shots[si];
					shot.box.center.x += (shot.lt <= 0) ? 0 : Math.sin(shot.box.angle) * 11;
					shot.box.center.y += (shot.lt <= 0) ? 0 : -Math.cos(shot.box.angle) * 11;
					if (--shot.lt <= -20) enemy.shots.splice(si, 1);
					else if (shot.box.collision(this.players[i].box)){
						this.players[i].health -= (this.players[i].health = 0) ? 0 : 1;
						enemy.shots.splice(si, 1);
					}
				}
			}
			
			if (this.players[i].attachedPlanet >= 0){
				var stepSize = Math.PI * 0.007 * (150 / this.planets[this.players[i].attachedPlanet].box.radius);
				if (this.players[i].controls["moveLeft"] > 0){
					stepSize = stepSize * this.players[i].controls["moveLeft"];
					this.players[i].planet += (this.players[i].controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
					this.players[i].looksLeft = true;
				}
				if (this.players[i].controls["moveRight"] > 0){
					stepSize = stepSize * this.players[i].controls["moveRight"];
					this.players[i].planet -= (this.players[i].controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
					this.players[i].looksLeft = false;
				}
				this.players[i].walkState = (this.players[i].controls["moveLeft"] || this.players[i].controls["moveRight"]);

				if (!this.players[i].walkState) this.players[i].walkFrame = (this.players[i].controls["crouch"]) ? "_duck" : "_stand";
				if (++this.players[i].walkCounter > ((this.players[i].controls["run"]) ? 5 : 9)){
					this.players[i].walkCounter = 0;
					if (this.players[i].walkState) this.players[i].walkFrame = (this.players[i].walkFrame === "_walk1") ? "_walk2" : "_walk1";
				}

				this.players[i].box.center.x = this.planets[this.players[i].attachedPlanet].box.center.x + Math.sin(this.players[i].planet) * (this.planets[this.players[i].attachedPlanet].box.radius + this.players[i].box.height / 2);
				this.players[i].box.center.y = this.planets[this.players[i].attachedPlanet].box.center.y + Math.cos(this.players[i].planet) * (this.planets[this.players[i].attachedPlanet].box.radius + this.players[i].box.height / 2)
				this.players[i].box.angle = Math.PI - this.players[i].planet;
				this.players[i].velocity.x = 0;
				this.players[i].velocity.y = 0;
				this.players[i].fuel = 300;

				if (this.players[i].controls["jump"] > 0) {
					this.players[i].attachedPlanet = -1;

					this.players[i].walkFrame = "_jump";
					this.players[i].velocity.x = Math.sin(this.players[i].box.angle) * 6;
					this.players[i].velocity.y = -Math.cos(this.players[i].box.angle) * 6;

					this.players[i].box.center.x += this.players[i].velocity.x;
					this.players[i].box.center.y += this.players[i].velocity.y;
				}
			} else {			
				for (var j = 0; j < this.planets.length; j++){
					var deltaX = this.planets[j].box.center.x - this.players[i].box.center.x,
						deltaY = this.planets[j].box.center.y - this.players[i].box.center.y,
						distPowFour = Math.pow(Math.pow(deltaX, 2) + Math.pow(deltaY, 2), 2);

					this.players[i].velocity.x += 9000 * this.planets[j].box.radius * deltaX / distPowFour;
					this.players[i].velocity.y += 9000 * this.planets[j].box.radius * deltaY / distPowFour;

					if (this.planets[j].box.collision(this.players[i].box)) {
						this.players[i].attachedPlanet = j;
						this.players[i].planet = Math.atan2(deltaX, deltaY) + Math.PI;
					}
				}
				if (this.players[i].controls["jetpack"] > 0 && this.players[i].fuel > 0 && this.players[i].controls["crouch"] < 1){
					this.players[i].fuel -= this.players[i].controls["jetpack"];
					this.players[i].velocity.x += (Math.sin(this.players[i].box.angle) / 10) * this.players[i].controls["jetpack"];
					this.players[i].velocity.y += (-Math.cos(this.players[i].box.angle) / 10) * this.players[i].controls["jetpack"];
				} else if (this.players[i].controls["crouch"] > 0){
					this.players[i].velocity.x = this.players[i].velocity.x * 0.987;
					this.players[i].velocity.y = this.players[i].velocity.y * 0.987;
				}

				var runMultiplicator = this.players[i].controls["run"] ? 1.7 : 1;
				if (this.players[i].controls["moveLeft"] > 0) this.players[i].box.angle -= (Math.PI / 140) * this.players[i].controls["moveLeft"] * runMultiplicator;
				if (this.players[i].controls["moveRight"] > 0) this.players[i].box.angle += (Math.PI / 140) * this.players[i].controls["moveRight"] * runMultiplicator;

				this.players[i].box.center.x += this.players[i].velocity.x;
				this.players[i].box.center.y += this.players[i].velocity.y;
			}
			var toSend = JSON.stringify({
					msgType: MESSAGE_PLAYER_DATA,
					data: {
						pid: i, x: this.players[i].box.center.x.toFixed(2), y: this.players[i].box.center.y.toFixed(2),
						angle: this.players[i].box.angle.toFixed(4), walkFrame: this.players[i].walkFrame, health: this.players[i].health, fuel: this.players[i].fuel,
						name: this.players[i].name, appearance: this.players[i].appearance, looksLeft: this.players[i].looksLeft
					}
				});			
			this.sendToAll(toSend);		
		}
		var newDate = new Date();
		this.processtime = (oldDate - newDate);
	}
	function _sendToAll(message){
		for (var i = 0; i < this.players.length; i++){
			if (this.players[i] !== undefined) this.players[i].ws.send(message);
		}
	}

	this.planets.push(new Planet(300, 500, 180, "#f33"));
	this.enemies.push(new Enemy(800, -600));

	this.name = _name || "Unnamed Lobby";
	this.maxplayers = _maxplayers | 8;
	this.update = _update;
	this.sendToAll = _sendToAll;
	this.uid = generateUid();
}
lobbies.findLobbyUid = function (uid){
	for (var i = 0; i != lobbies.length; i++){
		lobbies[i].uid === uid;
		return i;
	}
	return -1;
}
function updateLobbies(){
	if (lobbies.length === 0) return;
	for (var i = 0; i < lobbies.length; i++){
		lobbies[i].update();
	}	
}
setInterval(updateLobbies, 16); //update cycle 

var monitoring = function(){
	if (monitoringDisabled !== true){
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
				processtime = lobbies[i].processtime.toString();
			info += " | " + amount + Array(headerSizes[1] - amount.length).join(" ");
			info += " | " + processtime + Array(headerSizes[2] - processtime.length).join(" ");
			console.log(info);
		}
	}
}, monitoringDisabled = true;
setInterval(monitoring, 500);
function generateUid(){
	//hexadecimal form 1048576 to 16777215
	//TODO: make it not repeatable ! (important :D)
	return Math.floor(Math.random() * 16 * 1048576).toString(16);
}

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
					var pid = lobbies[id].players.firstEmpty();
					lobbies[id].players.splice(pid, 1, new Player(msg.data.name, msg.data.appearance, this, msg.data.width, msg.data.height));					
					ws.send(JSON.stringify({msgType: MESSAGE_CONNECT_SUCCESSFUL, data: {pid: pid}}));
					ws.send(JSON.stringify({msgType: MESSAGE_GAME_DATA, data: {planets: lobbies[id].planets.getData(), enemies: lobbies[id].enemies.getData()}}));
					lobbies[id].sendToAll(JSON.stringify({msgType: MESSAGE_PLAYER_SETTINGS, data: lobbies[id].players.getData()}));
					lobbies[id].sendToAll(JSON.stringify({msgType: MESSAGE_CHAT, data: {content: "'" + msg.data.name + "' connected", pid: -1}}));
				}
				break;
			case MESSAGE_GET_LOBBIES:
				var i, j = [];
				for (i = 0; i != lobbies.length; i++){
					j[i] = {uid: lobbies[i].uid, name: lobbies[i].name, players: lobbies[i].players.amount(), maxplayers: lobbies[i].maxplayers};
				}
				ws.send(JSON.stringify({msgType: MESSAGE_SENT_LOBBIES, data: j}));
				break;
			case MESSAGE_CREATE_LOBBY:
				lobbies.push(new lobby(msg.data.name, 8));
				break;
			case MESSAGE_PLAYER_SETTINGS:
				var id = lobbies.findLobbyUid(msg.data.uid);
				if (id >= 0){
					var oldName = lobbies[id].players[msg.data.pid].name;
					lobbies[id].players[msg.data.pid].box = new Rectangle(lobbies[id].players[msg.data.pid].box.center, msg.data.width, msg.data.height);
					lobbies[id].players[msg.data.pid].name = msg.data.name;
					lobbies[id].players[msg.data.pid].appearance = msg.data.appearance;
					lobbies[id].sendToAll(JSON.stringify({msgType: MESSAGE_PLAYER_SETTINGS, data: lobbies[id].players.getData()}));
					if (oldName !== msg.data.name) lobbies[id].sendToAll(JSON.stringify({msgType: MESSAGE_CHAT, data: {content: "'" + oldName + "' changed name to '" + msg.data.name + "'", pid: -1}}));
				} else {
					ws.send(JSON.stringify({msgType: MESSAGE_ERROR, data: {content: "Lobby doesnt exist (anymore)"}}));
				}
				break;
			case MESSAGE_CHAT:
				var id = lobbies.findLobbyUid(msg.data.uid), i;
				if (id >= 0){
				 	i = msg.data.content;
					lobbies[id].sendToAll(JSON.stringify({msgType: MESSAGE_CHAT, data: {content: i, name: lobbies[id].players[msg.data.pid].name, pid: msg.data.pid}}));
				}
				break;
			case MESSAGE_PLAYER_CONTROLS:
				var id = lobbies.findLobbyUid(msg.data.uid), i;
				if (id >= 0){
					for (i in msg.data.controls){
						lobbies[id].players[msg.data.pid].controls[i] = msg.data.controls[i];
					}
				}
				break;
			case MESSAGE_DISCONNECT:
			case MESSAGE_LEAVE_LOBBY:
				var id = lobbies.findLobbyUid(msg.data.uid);
				if (id >= 0){
					lobbies[id].sendToAll(JSON.stringify({msgType: MESSAGE_CHAT, data: {content: "'" + lobbies[id].players[msg.data.pid].name + "' has left the game", pid: -1}}));
					delete lobbies[id].players[msg.data.pid];
				}
				break;
		}		
	});
	ws.on("close", function(e){
		var found = false;
		lobbies.forEach(function (lobby, li){			
			lobby.players.forEach(function (player, i){
				if (player.ws == ws){
					delete lobby.players[i];
					lobby.sendToAll(JSON.stringify({msgType: MESSAGE_CHAT, data: {content: "'" + player.name + "' has left the game", pid: -1}}));
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




function GeometricObject() {
	//to inherit from `GeometricObject`:
	//call `return GeometricObject.call(this);` at the end of any constructor
	//create a new prototype for your object, whose prototype is `GeometricObject.prototype`. Example: `YourConstructor.prototype = Object.create(GeometricObject.prototype);`.
	var handler = {
		set: function(target, name, value) {
			if(target.hasOwnProperty(name)) {
				target._cache.needsUpdate = true;
				target[name] = value;
				return true;
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
GeometricObject.prototype.circleObb = function(circle, rect) {
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
GeometricObject.prototype.obbObb = function(rectOne, rectTwo) {
	//rotate the first OOB to transform it in AABB to simplify calculations
	var rectTwoRot = rectTwo.angle - rectOne.angle,
		rectOne = new Rectangle(rectOne.center, rectOne.width, rectOne.height),
		rectTwo = new Rectangle(rectTwo.center, rectTwo.width, rectTwo.height, rectTwoRot);

	//we can't check against the diagonal because it is too CPU intensive
	var sideSum = rectTwo.width + rectTwo.height;//so we check against the sum of the sides which is > than the diagonal (not to much hopefully)
	if (!this.aabbAabb(rectOne, new Rectangle(new Point(rectTwo.center.x, rectTwo.center.y), sideSum, sideSum))) return false;//eliminates most non-collisions

	var axesVectOne =  [new Vector(1, 0), new Vector(0, 1)],//rectOne is an AABB
		axesVectTwo = [];
	rectTwo.vertices.forEach(function(vertex, index, array) {
		var prevVertex = index === 0 ? array[array.length - 1] : array[index - 1],
		vector = new Vector(vertex, prevVertex).orthogonalVector;//this is stupid for a rectangle, not for a polygon

		axesVectTwo.push(vector);
	});
	var axesVect = axesVectOne.concat(axesVectTwo);

	return !axesVect.some(function(axis) {
		var projOne = rectOne.project(axis),
			projTwo = rectTwo.project(axis);

		return projOne.max < projTwo.min || projTwo.max < projOne.min;//overlapp or not
	});
}
GeometricObject.prototype.aabbAabb = function(rectOne, rectTwo) {
	if(rectOne.center.x - rectTwo.width/2 >= rectOne.center.x + rectOne.width/2
	|| rectTwo.center.x + rectTwo.width/2 <= rectOne.center.x - rectOne.width/2
	|| rectTwo.y - rectTwo.height/2 >= rectOne.center.y + rectOne.height/2
	|| rectTwo.y + rectTwo.height/2 <= rectOne.center.y - rectOne.height/2)
		return false;
	else
		return true;
}


/* Do NOT inherit from the following classes!
   Why? Because the cache will be set to be refreshed if you modify
   any property of the instance of the inheriting class. */
function Point(x, y) {
	this.x = x;
	this.y = y;
	return GeometricObject.call(this);
}

function Vector(argOne, argTwo) {
	if(typeof argOne === "number" && typeof argTwo === "number") {//they are coordinates
		this.x = argOne;
		this.y = argTwo;
	} else if(argOne instanceof Point && argTwo instanceof Point) {
		this.x = argTwo.x - argOne.x;
		this.y = argTwo.y - argOne.y;
	}
	return GeometricObject.call(this);
}
Object.defineProperty(Vector.prototype, "orthogonalVector", {
	get: function() {
		if(this._cache.needsUpdate) {
			this._cache.needsUpdate = false;
			this._cache.orthogonalVector = new Vector(-this.y, this.x);
		}
		return this._cache.orthogonalVector;
	}
});
Vector.prototype.dotProduct = function(vector) {
	return this.x*vector.x + this.y*vector.y;
}

function Rectangle(centerPoint, width, height, angle) {
	this.center = centerPoint;
	this.width = width;
	this.height = height;

	this.angle = angle === undefined ? 0 : angle;

	return GeometricObject.call(this);
}
Rectangle.prototype = Object.create(GeometricObject.prototype);
Object.defineProperties(Rectangle.prototype, {
	"vertices": {
		get: function() {
			if(this._cache.needsUpdate || this.center._cache.needsUpdate) {
				this._cache.needsUpdate = false;
				this.center._cache.needsUpdate = false;

				this._cache.vertices = [];
				this.unrotatedVertices.forEach(function(vertex) {
					var x = vertex.x - this.center.x,
						y = vertex.y - this.center.y,
						newVertex = new Point(
							x*Math.cos(this.angle) - y*Math.sin(this.angle) + this.center.x,
							x*Math.sin(this.angle) + y*Math.cos(this.angle) + this.center.y
					);
					this._cache.vertices.push(newVertex);
				}, this);
			}
			return this._cache.vertices;
		}
	},
	"unrotatedVertices": {
		get: function() {
			return [new Point(this.center.x - this.width/2, this.center.y - this.height/2), new Point(this.center.x + this.width/2, this.center.y + this.height/2), new Point(this.center.x - this.width/2, this.center.y + this.height/2), new Point(this.center.x + this.width/2, this.center.y - this.height/2)];
		}
	}
});
Rectangle.prototype.collision = function(geomObj) {
	if(geomObj instanceof Rectangle) {
		if(this.angle === geomObj.angle) {
			return this.aabbAabb(this, geomObj);
		} else {
			return this.obbObb(this, geomObj);
		}
	} else if(geomObj instanceof Circle) {
			return this.circleObb(geomObj, this);
	} else {
		throw new TypeError("Not a valid geometric object");
	}
}
Rectangle.prototype.project = function(axis) {
	var min = axis.dotProduct(this.vertices[0]),
		max = min;
	for(var i = 1; i !== this.vertices.length - 1; i++) {
		var proj = axis.dotProduct(this.vertices[i]);
		if(proj < min) min = proj;
		else if(proj > max) max = proj;
	}
	return {min: min, max: max};
}

function Circle(centerPoint, radius) {
	this.center = centerPoint;
	this.radius = radius;
}
Circle.prototype = Object.create(GeometricObject.prototype);
Object.defineProperty(Circle.prototype, "collision", {
	value: function(geomObj) {
		if(geomObj instanceof Rectangle) {
			return this.circleObb(this, geomObj);
		} else {
			throw new TypeError("Not a valid geometric object");
		}
	}
});