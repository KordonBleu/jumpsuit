function connection(address){
	var socket = new WebSocket(address || "ws://localhost:8080");

	this.alive = function() { return socket.readyState === 1; };
	

	socket.onopen = function(e){
		this.send(JSON.stringify({ msgType: MESSAGE.GET_LOBBIES }));
		document.getElementById("new-lobby").disabled = false;
		document.getElementById("refresh-or-leave").textContent = "Refresh";
		document.getElementById("refresh-or-leave").disabled = false;
	};
	socket.onerror = function(e){
		document.getElementById("new-lobby").disabled = true;
		document.getElementById("refresh-or-leave").disabled = true;
		this.close();
	};
	socket.onmessage = function(message){
		try{
			msg = JSON.parse(message.data);

			switch(msg.msgType){
				case MESSAGE.SENT_LOBBIES:
					document.getElementById("new-lobby").disabled = false;
					var list = document.getElementById("player-list");
					while (list.firstChild) {
						list.removeChild(list.firstChild);
					}
					for (var i = 0, el, li; i != msg.data.length; i++){
						li = document.createElement("li");
						el = document.createElement("a");
						el.href = "#c:" + msg.data[i].uid;
						el.textContent = msg.data[i].name + " | (" + msg.data[i].players + " of " + msg.data[i].maxPlayers + ")";
						li.appendChild(el);
						list.appendChild(li);
					}
					break;
				case MESSAGE.CONNECT_SUCCESSFUL:					
					pid = msg.data.pid;				
					document.getElementById("refresh-or-leave").textContent = "Leave Lobby";
					document.getElementById("new-lobby").disabled = true;
					break;
				case MESSAGE.PLAYER_SETTINGS:
					var list = document.getElementById("player-list");
					while (list.firstChild) {
						list.removeChild(list.firstChild);
					}
					for (var i = 0, li; i != msg.data.length; i++){
						li = document.createElement("li");
						li.textContent = msg.data[i].name;
						if (i === pid) li.style.color = "#f33";
						list.appendChild(li);
					}
					break;
				case MESSAGE.CHAT:
					chat.history.splice(0, 0, msg.data);
					break;
				case MESSAGE.PLAYER_DATA:
					if (msg.data.pid === pid){
						player.box.center.x = msg.data.x;
						player.box.center.y = msg.data.y;					
						player.looksLeft = msg.data.looksLeft;
						player.box.angle = msg.data.angle;
						player.health = msg.data.health;
						player.fuel = msg.data.fuel;
						player.walkFrame = msg.data.walkFrame;
						game.offset.x = ((player.box.center.x - canvas.width / 2 + (game.dragStart.x - game.drag.x)) + 19 * game.offset.x) / 20;
						game.offset.y = ((player.box.center.y - canvas.height / 2 + (game.dragStart.y - game.drag.y)) + 19 * game.offset.y) / 20;
					} else {
						if (otherPlayers[msg.data.pid] === undefined) otherPlayers[msg.data.pid] = new Player(msg.data.name, msg.data.appearance, msg.data.x, msg.data.y);
						otherPlayers[msg.data.pid].box.center.x = msg.data.x;
						otherPlayers[msg.data.pid].box.center.y = msg.data.y;
						otherPlayers[msg.data.pid].box.angle = msg.data.angle;
						otherPlayers[msg.data.pid].looksLeft = msg.data.looksLeft;
						otherPlayers[msg.data.pid].walkFrame = msg.data.walkFrame;
						otherPlayers[msg.data.pid].name = msg.data.name;
						otherPlayers[msg.data.pid].appearance = msg.data.appearance;
					}
					break;
				case MESSAGE.WORLD_DATA:
					var i, j;
					planets.length = 0;
					for (i = 0; i < msg.data.planets.length; i++){
						j = msg.data.planets[i];
						planets.push(new Planet(j.x, j.y, j.radius));
					}
					enemies.length = 0;
					for (i = 0; i < msg.data.enemies.length; i++){
						j = msg.data.enemies[i];
						enemies.push(new Enemy(j.x, j.y, j.appearance));
					}
					break;
				case MESSAGE.GAME_DATA:
					var i, j;
					for (i = 0; i < msg.data.planets.length; i++){
						planets[i].progress = msg.data.planets[i];						
					}
					for (i = 0; i < msg.data.enemies.length; i++){
						enemies[i].box.angle = msg.data.enemies[i].angle;
						enemies[i].shots.length = msg.data.enemies[i].shots.length;
						for (j = 0; j < msg.data.enemies[i].shots.length; j++){
							if (typeof enemies[i].shots[j] === "undefined") enemies[i].shots[j] = {box: new Rectangle(new Point(0, 0), resources["laserBeam"].width, resources["laserBeam"].height, 0), lt: 0};
							enemies[i].shots[j].box.center.x = msg.data.enemies[i].shots[j].x;
							enemies[i].shots[j].box.center.y = msg.data.enemies[i].shots[j].y;
							enemies[i].shots[j].box.angle = msg.data.enemies[i].shots[j].angle;
							enemies[i].shots[j].lt = msg.data.enemies[i].shots[j].lt;
						}
					}
					break;
				case MESSAGE.ERROR:
					var errDesc;
					switch(msg.data.code) {
						case ERROR.NO_LOBBY:
							errDesc = "This lobby doesn't exist (anymore)";
							break;
						case ERROR.NO_SLOT:
							errDesc = "There's no slot left in the lobby";
							break;
						case ERROR.NAME_TAKEN:
							errDesc = "The name" + player.name + "is already taken";
							break;
					}
					alert("Error " + msg.data.code + ":\n" + errDesc);
					break;
			}
		} catch(err) {
			console.log("Badly formated JSON message received:", err);
			console.log("'" + message.data + "'");
		}
	};
	this.close = function(){
		socket.send(JSON.stringify({
			msgType: MESSAGE.DISCONNECT,
			data: {uid: location.hash.substr(3), pid: pid}
		}));
		location.hash = "";
		pid = -1;
		socket.close();
	};
	this.connectLobby = function (){
		socket.send(JSON.stringify({
			msgType: MESSAGE.CONNECT,
			data: {	uid: location.hash.substr(3), name: player.name, appearance: player.appearance }
		}));
	};
	this.createLobby = function (n){
		socket.send(JSON.stringify({
			msgType: MESSAGE.CREATE_LOBBY,
			data: {name: n, privateLobby: false}
		}));
		this.refreshLobbies();
	};
	this.refreshLobbies = function(){
		socket.send(JSON.stringify({ msgType: MESSAGE.GET_LOBBIES }));
	};
	this.leaveLobby = function(){
		socket.send(JSON.stringify({
			msgType: MESSAGE.LEAVE_LOBBY,
			data: {pid: pid, uid: location.hash.substr(3)}
		}));
		location.hash = "";
	};
	this.sendSettings = function (){
		socket.send(JSON.stringify({
			msgType: MESSAGE.PLAYER_SETTINGS,
			data: {pid: pid, uid: location.hash.substr(3), name: player.name, appearance: player.appearance}
		}));
	};
	this.sendChat = function (content){
		socket.send(JSON.stringify({
			msgType: MESSAGE.CHAT,
			data: {pid: pid, uid: location.hash.substr(3), content: content}
		}));	
	}
	this.refreshControls = function (controls){
		socket.send(JSON.stringify({
			msgType: MESSAGE.PLAYER_CONTROLS,
			data: {pid: pid, uid: location.hash.substr(3), controls: controls}
		}));
	}
}

var currentConnection = new connection();

function closeSocket(){
	document.getElementById("new-lobby").disabled = true;
	document.getElementById("refresh-or-leave").textContent = "Refresh";
	document.getElementById("refresh-or-leave").disabled = true;
	currentConnection.close();
}
function openSocket(){
	currentConnection = new connection();
}
function newLobby(name){
	if (!currentConnection.alive()) return;
	currentConnection.createLobby(name);
}

function refreshLobbies(){
	if (!currentConnection.alive()) return;
	currentConnection.refreshLobbies();
}
function leaveLobby(){
	if (!currentConnection.alive()) return;
	currentConnection.leaveLobby();
	currentConnection.refreshLobbies();
	document.getElementById("refresh-or-leave").textContent = "Refresh";
}

function hashChange() {
	if (!currentConnection.alive()) return;
	if (location.hash.indexOf("c:") === 1){
		currentConnection.connectLobby();
	}
}
window.addEventListener("hashchange", hashChange);

function settingsChanged(){
	if (!currentConnection.alive() || location.hash.indexOf("c:") !== 1) return; 
	currentConnection.sendSettings();
	//TODO: save parameters in a cookie
}
