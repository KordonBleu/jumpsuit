function Connection(address) {
	var lastControls;

	this.socket = new WebSocket(address || "ws://" + location.hostname + (location.port === "" ? "" : ":" + location.port));

	this.alive = function() { return this.socket.readyState === 1; };

	this.lobbyUid = null;

	this.socket.addEventListener("open", this.openHandler);
	this.socket.addEventListener("error", this.errorHandler);
	this.socket.addEventListener("message", this.messageHandler);
}
Connection.prototype.close = function() {
	this.leaveLobby();
	this.socket.close();
};
Connection.prototype.connectLobby = function(uid) {
	if(!currentConnection.alive()) return;

	this.socket.send(JSON.stringify({
		msgType: MESSAGE.CONNECT,
		data: { uid: uid, name: player.name, appearance: player.appearance }
	}));
	this.lobbyUid = uid;
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
		data: {pid: pid, uid: this.lobbyUid}
	}));
	game.stop();
};
Connection.prototype.sendSettings = function() {
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.PLAYER_SETTINGS,
		data: {pid: pid, uid: this.lobbyUid, name: player.name, appearance: player.appearance}
	}));
};
Connection.prototype.sendChat = function(content) {
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.CHAT,
		data: {pid: pid, uid: this.lobbyUid, content: content}
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
		data: {pid: pid, uid: this.lobbyUid, controls: controls}
	}));
};
Connection.prototype.errorHandler = function() {
	newLobbyElement.disabled = true;
	refreshOrLeaveElement.disabled = true;
	this.close();
};
Connection.prototype.openHandler = function() {
	this.send(JSON.stringify({ msgType: MESSAGE.GET_LOBBIES }));
	newLobbyElement.disabled = false;
	refreshOrLeaveElement.textContent = "Refresh";
	refreshOrLeaveElement.disabled = false;
};
Connection.prototype.messageHandler = function(message) {
	try {
		msg = JSON.parse(message.data);
		switch(msg.msgType) {
			case MESSAGE.SENT_LOBBIES:
				newLobbyElement.disabled = false;
				statusElement.textContent = "Choose a lobby";
				while (playerListElement.firstChild) playerListElement.removeChild(playerListElement.firstChild);
				for(var i = 0, el, li; i != msg.data.length; i++) {
					li = document.createElement("li");
					el = document.createElement("a");
					el.href = "/lobbies/" + msg.data[i].uid + "/";
					el.textContent = msg.data[i].name + " | (" + msg.data[i].players + " of " + msg.data[i].maxPlayers + ")";
					li.appendChild(el);
					playerListElement.appendChild(li);
				}
				break;
			case MESSAGE.PING:
				this.send(JSON.stringify({
					msgType: MESSAGE.PONG,
					data: {
						pid: pid,
						key: msg.data.key,
						uid: currentConnection.lobbyUid
					}
				}));
				break;
			case MESSAGE.PLAYER_SETTINGS:
				statusElement.textContent = "Connected to a lobby";
				while (playerListElement.firstChild) playerListElement.removeChild(playerListElement.firstChild);
				msg.data.forEach(function(player, index) {
					li = document.createElement("li");
					li.textContent = player.name;
					if (index === pid) li.style.color = "#f33";
					playerListElement.appendChild(li);
				});
				break;
			case MESSAGE.CHAT:
				var element = document.createElement("p"), nameElement = document.createElement("b"), textElement = document.createTextNode(msg.data.content);
				if (msg.data.pid === -1) element.className = "server";
				else {
					nameElement.textContent = msg.data.name + ": ";
					nameElement.className = msg.data.appearance;
				}
				element.appendChild(nameElement);
				element.appendChild(textElement);
				chatElement.appendChild(element);
				while (chatElement.childNodes.length > 40) chatElement.removeChild(chatElement.childNodes[1]);
				var messageHeight = 0;
				[].forEach.call(chatElement.querySelectorAll("p:not(#gui-chat-first)"), function(element){
					messageHeight += element.clientHeight + 2;
				});
				chatFirstElement.style.marginTop = Math.min(0, chatElement.clientHeight - 2 - messageHeight) + "px";
				break;
			case MESSAGE.WORLD_DATA:
				pid = msg.data.pid;
				refreshOrLeaveElement.textContent = "Leave Lobby";
				newLobbyElement.disabled = true;

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
				msg.data.planets.forEach(function(planet, i) {
					planets[i].progress = planet;
				});
				msg.data.enemies.forEach(function(enemy, i) {
					enemies[i].box.angle = enemy.angle;
				});
				shots.length = msg.data.shots.length;
				msg.data.shots.forEach(function(shot, i) {
					if (typeof shots[j] === "undefined") shots[i] = {box: new Rectangle(new Point(shot.x, shot.y), resources["laserBeam"].width, resources["laserBeam"].height, shot.angle), lt: shot.lt};
					else {
						shots[i].box.center.x = shot.x;
						shots[i].box.center.y = shot.y;
						shots[i].box.angle = shot.angle;
						shots[i].lt = shot.lt;
					}
				});

				msg.data.players.forEach(function(_player, i) {
					if (_player === null){
						delete otherPlayers[i];
						return;
					}
					if (otherPlayers[i] === undefined) otherPlayers[i] = new Player(_player.name, _player.appearance, _player.x, _player.y);


					if (i === pid) {
						if(!player.jetpack && _player.jetpack) {
							player.jetpackSound = jetpackModel.makeSound(soundEffectGain, 1);
							player.jetpackSound.start(0);
						} else if(player.jetpack && !_player.jetpack && player.jetpackSound !== undefined) {
							player.jetpackSound.stop();
						}
					} else {
						if(!otherPlayers[i].jetpack && _player.jetpack) {
							console.log("bam");
							setPanner(otherPlayers[i].panner, otherPlayers[i].box.center.x - player.box.center.x, otherPlayers[i].box.center.y - player.box.center.y);
							otherPlayers[i].jetpackSound = jetpackModel.makeSound(otherPlayers[i].panner, 1);
							otherPlayers[i].jetpackSound.start(0);
						} else if(otherPlayers[i].jetpack && !_player.jetpack && otherPlayers[i].jetpackSound !== undefined) {
							console.log("bim");
							otherPlayers[i].jetpackSound.stop();
						}
					}


					_player.x = parseFloat(_player.x);
					_player.y = parseFloat(_player.y);
					_player.angle = parseFloat(_player.angle);

					var p = 1;
					if (otherPlayers[i].boxInformations[0] === undefined) p = 0;
					if (p === 1) {
						otherPlayers[i].boxInformations[0].box.center.x = otherPlayers[i].box.center.x;
						otherPlayers[i].boxInformations[0].box.center.y = otherPlayers[i].box.center.y;
						otherPlayers[i].boxInformations[0].box.angle = otherPlayers[i].box.angle;
						otherPlayers[i].boxInformations[0].timestamp += (typeof otherPlayers[i].boxInformations[1] !== "undefined") ? (Date.now() - otherPlayers[i].boxInformations[1].timestamp) : 0;
					}
					otherPlayers[i].boxInformations[p] = {box: new Rectangle(new Point(_player.x, _player.y), 0, 0, _player.angle), timestamp: Date.now()};

					otherPlayers[i].box.width = resources[otherPlayers[i].appearance + otherPlayers[i].walkFrame].width;
					otherPlayers[i].box.height = resources[otherPlayers[i].appearance + otherPlayers[i].walkFrame].height;
					otherPlayers[i].looksLeft = _player.looksLeft;
					otherPlayers[i].walkFrame = _player.walkFrame;
					otherPlayers[i].name = _player.name;
					otherPlayers[i].appearance = _player.appearance;
					otherPlayers[i].attachedPlanet = _player.attachedPlanet;
					otherPlayers[i].jetpack = _player.jetpack;
					otherPlayers[i].fuel = _player.fuel;

					if (i === pid) for (var prop in otherPlayers[i]) player[prop] = otherPlayers[i][prop]; //apply everything to the player shortcut
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

				history.pushState(null, "Main menu", "/");
				alert("Error " + msg.data.code + ":\n" + errDesc);
				break;
			case MESSAGE.PLAY_SOUND:
				msg.data.forEach(function(sound) {
					switch(sound.type) {
						case "laser":
							laserModel.makeSound(makePanner(sound.position.x - player.box.center.x, sound.position.y - player.box.center.y)).start(0);
							break;
					}
				});
				break;
		}
	} catch(err) {
		console.error(err, err.stack);
	}
};

var currentConnection = new Connection();
function autoConnect() {
	if(autoConnect.counter === 1) {//resources loaded & socket open
		var lobbyUid = location.pathname.replace(/^\/lobbies\/([0-9a-f]+)\/$/, "$1");
		if(location.pathname !== lobbyUid) currentConnection.connectLobby(lobbyUid);
	}
	else autoConnect.counter += 1;
}
autoConnect.counter = 0;
currentConnection.socket.addEventListener("open", autoConnect);
document.addEventListener("res loaded", autoConnect);

function closeSocket() {
	newLobbyElement.disabled = true;
	refreshOrLeaveElement.textContent = "Refresh";
	refreshOrLeaveElement.disabled = true;
	while (chatElement.childNodes.length > 1) chatElement.removeChild(chatElement.childNodes[1]);
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
	while (chatElement.childNodes.length > 1) chatElement.removeChild(chatElement.childNodes[1]);
	refreshOrLeaveElement.textContent = "Refresh";
}


playerListElement.addEventListener("click", function(e) {
	if(e.target.tagName == "A") {
		e.preventDefault();
		var lobbyUid = e.target.getAttribute("href").replace(/^\/lobbies\/([0-9a-f]+)\/$/, "$1");
		currentConnection.connectLobby(lobbyUid);
		history.pushState(null, "Lobby" + lobbyUid, "/lobbies/" + lobbyUid + "/");
	}
});
window.addEventListener("popstate", function(e) {
	console.log(e, location);
	if(location.pathname === "/") leaveLobby();
	else {
		var lobbyUid = location.pathname.replace(/^\/lobbies\/([0-9a-f]+)\/$/, "$1");
		if(lobbyUid !== null && lobbyUid[0] !== undefined) currentConnection.connectLobby(lobbyUid[0]);
	}
});

function settingsChanged() {
	if (!currentConnection.alive() || currentConnection.lobbyUid === null) return;
	currentConnection.sendSettings();
}
