var ownIdx = null;

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
		data: { uid: uid, name: localStorage.getItem("settings.name") || "Unnamed Player", appearance: "alienGreen" }
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
		data: {uid: this.lobbyUid}
	}));
	game.stop();
};
Connection.prototype.sendSettings = function() {
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.PLAYER_SETTINGS,
		data: {uid: this.lobbyUid, name: players[ownIdx].name, appearance: players[ownIdx].appearance}
	}));
};
Connection.prototype.sendChat = function(content) {
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.CHAT,
		data: {uid: this.lobbyUid, content: content}
	}));
};
Connection.prototype.refreshControls = function(controls) {
	if (typeof lastControls === "undefined") lastControls = {};
	var accordance = 0, b = 0; //checking if every entry is the same, if so no changes & nothing to send
	for (var c in players[ownIdx].controls){
		b++;
		if (lastControls[c] === players[ownIdx].controls[c]) accordance++;
		else lastControls[c] = players[ownIdx].controls[c];
	}
	if (accordance === b) return;
	this.socket.send(JSON.stringify({
		msgType: MESSAGE.PLAYER_CONTROLS,
		data: {uid: this.lobbyUid, controls: controls}
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
				msg.data.forEach(function(lobby) {
					var li = document.createElement("li"),
						el = document.createElement("a");
					el.href = "/lobbies/" + lobby.uid + "/";
					el.textContent = lobby.name + " | (" + lobby.players + " of " + lobby.maxPlayers + ")";
					li.appendChild(el);
					playerListElement.appendChild(li);
				});
				break;
			case MESSAGE.PING:
				this.send(JSON.stringify({
					msgType: MESSAGE.PONG,
					data: {
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
					if (index === ownIdx) li.style.color = "#f33";
					playerListElement.appendChild(li);
				});
				break;
			case MESSAGE.CHAT:
				var element = document.createElement("p"), nameElement = document.createElement("b"), textElement = document.createTextNode(msg.data.content);
				if (msg.data.name === undefined) element.className = "server";
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
				ownIdx = msg.data.index;
				refreshOrLeaveElement.textContent = "Leave Lobby";
				newLobbyElement.disabled = true;

				var i, j;
				planets.length = 0;
				msg.data.planets.forEach(function(planet) {
					planets.push(new Planet(planet.x, planet.y, planet.radius));
				});
				enemies.length = 0;
				msg.data.enemies.forEach(function(enemy) {
					enemies.push(new Enemy(enemy.x, enemy.y, enemy.appearance));
				});
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

				for (var i = 0; i !== Math.max(msg.data.players.length, players.length); i++) {
					if (msg.data.players[i] === undefined && players[i] !== undefined) {
						delete players[i];
						continue;
					}
					if (players[i] === undefined) {
						if (msg.data.players[i] !== undefined) players[i] = new Player(msg.data.players[i].name, msg.data.players[i].appearance, msg.data.players[i].x, msg.data.players[i].y);
						else continue;
					}

					if (i === ownIdx) {
						if(!players[i].jetpack && msg.data.players[i].jetpack) {
							players[i].jetpackSound = jetpackModel.makeSound(soundEffectGain, 1);
							players[i].jetpackSound.start(0);
						} else if(players[i].jetpack && !msg.data.players[i].jetpack && players[ownIdx].jetpackSound !== undefined) {
							players[i].jetpackSound.stop();
						}
					} else {
						if(!players[i].jetpack && msg.data.players[i].jetpack) {
							console.log(players[i].panner);
							setPanner(players[i].panner, players[i].box.center.x - players[ownIdx].box.center.x, players[i].box.center.y - players[ownIdx].box.center.y);
							players[i].jetpackSound = jetpackModel.makeSound(players[i].panner, 1);
							players[i].jetpackSound.start(0);
						} else if(players[i].jetpack && !msg.data.players[i].jetpack && players[i].jetpackSound !== undefined) {
							players[i].jetpackSound.stop();
						}
					}


					msg.data.players[i].x = parseFloat(msg.data.players[i].x);
					msg.data.players[i].y = parseFloat(msg.data.players[i].y);
					msg.data.players[i].angle = parseFloat(msg.data.players[i].angle);

					var p = 1;
					if (players[i].boxInformations[0] === undefined) p = 0;
					if (p === 1) {
						players[i].boxInformations[0].box.center.x = players[i].box.center.x;
						players[i].boxInformations[0].box.center.y = players[i].box.center.y;
						players[i].boxInformations[0].box.angle = players[i].box.angle;
						players[i].boxInformations[0].timestamp += (typeof players[i].boxInformations[1] !== "undefined") ? (Date.now() - players[i].boxInformations[1].timestamp) : 0;
					}
					players[i].boxInformations[p] = {box: new Rectangle(new Point(msg.data.players[i].x, msg.data.players[i].y), 0, 0, msg.data.players[i].angle), timestamp: Date.now()};

					players[i].box.width = resources[players[i].appearance + players[i].walkFrame].width;
					players[i].box.height = resources[players[i].appearance + players[i].walkFrame].height;
					players[i].looksLeft = msg.data.players[i].looksLeft;
					players[i].walkFrame = msg.data.players[i].walkFrame;
					players[i].name = msg.data.players[i].name;
					players[i].appearance = msg.data.players[i].appearance;
					players[i].attachedPlanet = msg.data.players[i].attachedPlanet;
					players[i].jetpack = msg.data.players[i].jetpack;

					if (i === ownIdx) {
						players[ownIdx].health = msg.data.players[i].health;
						[].forEach.call(document.querySelectorAll("#gui-health div"), function (element, index){
							var state = "heartFilled";
							if (index * 2 + 2 <= players[ownIdx].health) state = "heartFilled";
							else if (index * 2 + 1 === players[ownIdx].health) state = "heartHalfFilled";
							else state = "heartNotFilled";
							element.className = state;
						});

						players[ownIdx].fuel = msg.data.players[i].fuel;
						fuelElement.value = msg.data.players[i].fuel;
					}
				}
				for (var i in msg.data.gameProgress){
					if (i.indexOf("alien") === 0) document.getElementById("gui-points-" + i).textContent = msg.data.gameProgress[i];
				}
				if (!game.started) game.start();
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
						errDesc = "The name " + localStorage.getItem("settings.name")  + " is already taken";
						break;
				}

				history.pushState(null, "Main menu", "/");
				alert("Error " + msg.data.code + ":\n" + errDesc);
				break;
			case MESSAGE.PLAY_SOUND:
				msg.data.forEach(function(sound) {
					switch(sound.type) {
						case "laser":
							laserModel.makeSound(makePanner(sound.position.x - players[ownIdx].box.center.x, sound.position.y - players[ownIdx].box.center.y)).start(0);
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
