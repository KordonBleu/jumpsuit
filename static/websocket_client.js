function Connection(address) {
	var lastControls;

	this.socket = new WebSocket(address || "ws://" + location.hostname + (location.port === "" ? "" : ":" + location.port));

	this.alive = function() { return this.socket.readyState === 1; };

	this.socket.addEventListener("open", this.openHandler);
	this.socket.addEventListener("error", this.errorHandler);
	this.socket.addEventListener("message", this.messageHandler);
}
Connection.prototype.close = function() {
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.DISCONNECT,
		data: {uid: location.hash.substr(3), pid: pid}
	}));
	location.hash = "";
	pid = -1;
	this.socket.close();
};
Connection.prototype.connectLobby = function() {
	if(!currentConnection.alive() || location.hash.indexOf("c:") !== 1) return;

	this.socket.send(JSON.stringify({
		msgType: MESSAGE.CONNECT,
		data: {	uid: location.hash.substr(3), name: player.name, appearance: player.appearance }
	}));
	document.getElementById("multiplayer-box").classList.add("hidden");
};
Connection.prototype.createLobby = function(n) {
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.CREATE_LOBBY,
		data: {name: n, privateLobby: false}
	}));
	this.refreshLobbies();
};
Connection.prototype.refreshLobbies = function() {
	this.socket.send(JSON.stringify({ msgType: MESSAGE.GET_LOBBIES }));
};
Connection.prototype.leaveLobby = function() {
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.LEAVE_LOBBY,
		data: {pid: pid, uid: location.hash.substr(3)}
	}));
	location.hash = "";
	game.stop();
};
Connection.prototype.sendSettings = function() {
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.PLAYER_SETTINGS,
		data: {pid: pid, uid: location.hash.substr(3), name: player.name, appearance: player.appearance}
	}));
};
Connection.prototype.sendChat = function(content) {
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.CHAT,
		data: {pid: pid, uid: location.hash.substr(3), content: content}
	}));
};
Connection.prototype.refreshControls = function(controls) {
	if (typeof lastControls === "undefined") lastControls = {};
	var accordance = 0, b = 0; //checking if every entry is the same, if so no changes & nothing to send
	for (var c in player.controls){
		b++;
		if (lastControls[c] === player.controls[c]) accordance++;
		else lastControls[c] = player.controls[c];
	}
	if (accordance === b) return;
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.PLAYER_CONTROLS,
		data: {pid: pid, uid: location.hash.substr(3), controls: controls}
	}));
};
Connection.prototype.errorHandler = function() {
	document.getElementById("new-lobby").disabled = true;
	document.getElementById("refresh-or-leave").disabled = true;
	this.close();
};
Connection.prototype.openHandler = function() {
	this.send(JSON.stringify({ msgType: MESSAGE.GET_LOBBIES }));
	document.getElementById("new-lobby").disabled = false;
	document.getElementById("refresh-or-leave").textContent = "Refresh";
	document.getElementById("refresh-or-leave").disabled = false;
};
Connection.prototype.messageHandler = function(message) {
	try{
		msg = JSON.parse(message.data);
		switch(msg.msgType){
			case MESSAGE.SENT_LOBBIES:
				document.getElementById("new-lobby").disabled = false;
				document.getElementById("status").textContent = "Choose a lobby";
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
			case MESSAGE.PING:
				this.send(JSON.stringify({
					msgType: MESSAGE.PONG,
					data: {
						pid: pid,
						key: msg.data.key,
						uid: location.hash.substr(3)
					}
				}));
				break;
			case MESSAGE.PLAYER_SETTINGS:
				var list = document.getElementById("player-list");
				document.getElementById("status").textContent = "Connected to a lobby";
				while (list.firstChild) {
					list.removeChild(list.firstChild);
				}
				msg.data.forEach(function(player, index) {
					li = document.createElement("li");
					li.textContent = player.name;
					if (index === pid) li.style.color = "#f33";
					list.appendChild(li);
				});
				break;
			case MESSAGE.CHAT:
				var element = document.createElement("p"), nameElement = document.createElement("b"), textElement = document.createTextNode(msg.data.content), chatElement = document.getElementById("gui-chat");
				if (msg.data.pid === -1) element.className = "server";
				else {
					nameElement.textContent = msg.data.name + ": ";
					nameElement.className = msg.data.appearance;
				}
				element.appendChild(nameElement);
				element.appendChild(textElement);
				chatElement.appendChild(element);
				while (chatElement.childNodes.length > 40) chatElement.removeChild(chatElement.lastChild);
				break;
			case MESSAGE.WORLD_DATA:
				pid = msg.data.pid;
				document.getElementById("refresh-or-leave").textContent = "Leave Lobby";
				document.getElementById("new-lobby").disabled = true;

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
				game.start();
				break;
			case MESSAGE.GAME_DATA:
				var i, j;
				for (i = 0; i < msg.data.planets.length; i++){
					planets[i].progress = msg.data.planets[i];
				}
				for(i = 0; i < msg.data.enemies.length; i++) {
					enemies[i].box.angle = msg.data.enemies[i].angle;
				}
				shots.length = msg.data.shots.length;
				for (j = 0; j < msg.data.shots.length; j++){
					if (typeof shots[j] === "undefined") shots[j] = {box: new Rectangle(new Point(0, 0), resources["laserBeam"].width, resources["laserBeam"].height, 0), lt: 0};
					shots[j].box.center.x = msg.data.shots[j].x;
					shots[j].box.center.y = msg.data.shots[j].y;
					shots[j].box.angle = msg.data.shots[j].angle;
					shots[j].lt = msg.data.shots[j].lt;
				}

				player.timestamps._old = player.timestamps._new || 0;
				player.timestamps._new = Date.now();

				msg.data.players.forEach(function(_player, i) {
					if (i === pid){
						player.box.center.x = _player.x;
						player.box.center.y = _player.y;
						player.looksLeft = _player.looksLeft;
						player.box.angle = _player.angle;
						player.health = _player.health;
						player.fuel = _player.fuel;
						player.walkFrame = _player.walkFrame;
						player.jetpack = _player.jetpack;
						game.offset.x = (Math.abs(game.offset.x - (player.box.center.x - canvas.width / 2)) > 2000) ? player.box.center.x - canvas.width / 2 : ((player.box.center.x - canvas.width / 2 + (game.dragStart.x - game.drag.x)) + 19 * game.offset.x) / 20;
						game.offset.y = (Math.abs(game.offset.y - (player.box.center.y - canvas.height / 2)) > 2000) ? player.box.center.y - canvas.height / 2 : ((player.box.center.y - canvas.height / 2 + (game.dragStart.y - game.drag.y)) + 19 * game.offset.y) / 20;
					} else {
						if (_player === null){
							delete otherPlayers[i];
							return;
						}
						if (otherPlayers[i] === undefined) otherPlayers[i] = new Player(_player.name, _player.appearance, _player.x, _player.y);
						otherPlayers[i].timestamps._old = otherPlayers[i].timestamps._new || Date.now();
						otherPlayers[i].timestamps._new = Date.now();

						otherPlayers[i].lastBox.center.x = otherPlayers[i].box.center.x;
						otherPlayers[i].lastBox.center.y = otherPlayers[i].box.center.y;
						otherPlayers[i].lastBox.angle = otherPlayers[i].box.angle;

						otherPlayers[i].box.center.x = parseFloat(_player.x, 10);
						otherPlayers[i].box.center.y = parseFloat(_player.y, 10);
						otherPlayers[i].box.width = resources[otherPlayers[i].appearance + otherPlayers[i].walkFrame].width;
						otherPlayers[i].box.height = resources[otherPlayers[i].appearance + otherPlayers[i].walkFrame].height;

						otherPlayers[i].box.angle = parseFloat(_player.angle, 10);

						otherPlayers[i].predictedBox.center.x = otherPlayers[i].box.center.x;
						otherPlayers[i].predictedBox.center.y = otherPlayers[i].box.center.y;
						otherPlayers[i].predictedBox.angle = otherPlayers[i].box.angle;

						otherPlayers[i].looksLeft = _player.looksLeft;
						otherPlayers[i].walkFrame = _player.walkFrame;
						otherPlayers[i].name = _player.name;
						otherPlayers[i].appearance = _player.appearance;
						otherPlayers[i].attachedPlanet = _player.attachedPlanet;
						otherPlayers[i].jetpack = _player.jetpack;
					}

				});
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
						errDesc = "The name " + player.name + " is already taken";
						break;
				}
				document.getElementById("multiplayer-box").classList.remove("hidden");
				location.hash = "";
				alert("Error " + msg.data.code + ":\n" + errDesc);
				break;
			case MESSAGE.PLAY_SOUND:
				msg.data.forEach(function(sound) {
					playSound(sound.type, sound.position.x - player.box.center.x, sound.position.y - player.box.center.y);
				});
				break;
		}
	} catch(err) {
		console.log("Badly formated JSON message received:", err);
		console.log("'" + message.data + "'");
	}
};

var currentConnection = new Connection();
function autoConnect() {
	if(autoConnect.counter === 1) currentConnection.connectLobby();//resources loaded & socket open
	else autoConnect.counter += 1;
}
autoConnect.counter = 0;
currentConnection.socket.addEventListener("open", autoConnect);
document.addEventListener("res loaded", autoConnect);

function closeSocket() {
	document.getElementById("new-lobby").disabled = true;
	document.getElementById("refresh-or-leave").textContent = "Refresh";
	document.getElementById("refresh-or-leave").disabled = true;
	document.getElementById("gui-chat").innerHTML = "";
	currentConnection.close();
}
function openSocket() {
	currentConnection = new Connection();
}
function newLobby(name) {
	if (!currentConnection.alive()) return;
	currentConnection.createLobby(name);
}

function refreshLobbies() {
	if (!currentConnection.alive()) return;
	currentConnection.refreshLobbies();
}
function leaveLobby() {
	if (!currentConnection.alive()) return;
	currentConnection.leaveLobby();
	currentConnection.refreshLobbies();
	document.getElementById("gui-chat").innerHTML = "";
	document.getElementById("refresh-or-leave").textContent = "Refresh";
}


window.addEventListener("hashchange", function(){ currentConnection.connectLobby(); });

function settingsChanged() {
	if (!currentConnection.alive() || location.hash.indexOf("c:") !== 1) return;
	currentConnection.sendSettings();
}
