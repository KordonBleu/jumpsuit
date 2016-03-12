"use strict";

var ownIdx = null,
	enabledTeams = [];

function Connection() {
	this.lastControls = {};

	this.socket = new WebSocket((location.protocol === "http:" ? "ws://" : "wss://") + location.hostname + (location.port === "" ? "" : ":" + location.port));
	this.socket.binaryType = "arraybuffer";

	this.alive = function() { return this.socket.readyState === 1; };

	this.lobbyUid = null;

	this.socket.addEventListener("open", function() {
		this.setName.call(this);
		this.refreshLobbies.call(this)
	}.bind(this));
	this.socket.addEventListener("error", this.errorHandler);
	this.socket.addEventListener("message", this.messageHandler);
}
Connection.prototype.close = function() {
	this.leaveLobby();
	this.socket.close();
};
Connection.prototype.connectLobby = function(lobbyId) {
	if(!currentConnection.alive()) return;

	this.socket.send(MESSAGE.CONNECT.serialize(lobbyId));
	this.lobbyUid = lobbyId;
};
Connection.prototype.createLobby = function(name, playerAmount) {
	if (!currentConnection.alive()) return;
	this.socket.send(MESSAGE.CREATE_LOBBY.serialize(name, playerAmount));
	this.refreshLobbies();
};
Connection.prototype.refreshLobbies = function() {
	this.socket.send(MESSAGE.GET_LOBBIES.serialize());
};
Connection.prototype.leaveLobby = function() {
	this.socket.send(MESSAGE.LEAVE_LOBBY.serialize());
	game.stop();
};
Connection.prototype.setName = function() {
	if(!currentConnection.alive()) return;

	this.socket.send(MESSAGE.SET_NAME.serialize(settings.name));
};
Connection.prototype.sendChat = function(content) {
	if(!currentConnection.alive()) return;

	this.socket.send(MESSAGE.CHAT.serialize(content));
};
Connection.prototype.refreshControls = function(controls) {
	var accordance = 0, b = 0; //checking if every entry is the same, if so no changes & nothing to send
	for (var c in players[ownIdx].controls){
		b++;
		if (this.lastControls[c] === players[ownIdx].controls[c]) accordance++;
		else this.lastControls[c] = players[ownIdx].controls[c];
	}
	if (accordance === b) return;
	this.socket.send(MESSAGE.PLAYER_CONTROLS.serialize(controls));
};
Connection.prototype.sendActionOne = function(angle) {
	if(!currentConnection.alive()) return;

	this.socket.send(MESSAGE.ACTION_ONE.serialize(angle));
}
Connection.prototype.sendActionTwo = function(angle) {
	if(!currentConnection.alive()) return;

	this.socket.send(MESSAGE.ACTION_TWO.serialize(angle));
}
Connection.prototype.errorHandler = function() {
	this.close();
};
Connection.prototype.messageHandler = function(message) {
	switch (new Uint8Array(message.data, 0, 1)[0]) {
		case MESSAGE.ERROR.value:
			var errDesc;
			switch(MESSAGE.ERROR.deserialize(message.data)) {
				case MESSAGE.ERROR.NO_LOBBY:
					errDesc = "This lobby doesn't exist (anymore)";
					break;
				case MESSAGE.ERROR.NO_SLOT:
					errDesc = "There's no slot left in the lobby";
					break;
				case MESSAGE.ERROR.NAME_TAKEN:
					errDesc = "The name " + localStorage.getItem("settings.name") + " is already taken";
					break;
			}

			history.pushState(null, "Main menu", "/");
			alert("Error:\n" + errDesc);
			break;
		case MESSAGE.LOBBY_STATE.value:
			var val = MESSAGE.LOBBY_STATE.deserialize(message.data);
			if (val.state === 0){
				statusElement.textContent = "Waiting for players... " + val.timer;
				teamListElement.className = "hidden";
			} else if (val.state === 1) {
				if (!game.started && players.length !== 0) game.start();
				teamListElement.className = "hidden";
				statusElement.textContent = "Match is running " + val.timer;
			} else if (val.state === 2) {
				if (game.started) game.stop();
				teamListElement.className = "";
				statusElement.textContent = "Match is over " + val.timer;
			}
			break;
		case MESSAGE.CONNECT_ACCEPTED.value:
			planets.length = 0;
			enemies.length = 0;
			shots.length = 0;
			players.length = 0;
			var val = MESSAGE.CONNECT_ACCEPTED.deserialize(message.data,
				function(x, y, radius) {//add planets
					planets.push(new Planet(x, y, radius));
				},
				function(x, y, appearance) {//add enemies
					enemies.push(new Enemy(x, y, appearance));
				},
				function(x, y, angle) {//add shots
					shots.push(new Shot(x, y, angle));
				},
				function(x, y, attachedPlanet, angle, looksLeft, jetpack, appearance, walkFrame, name) {//add players
					var player = new Player(name, appearance, "_" + walkFrame, attachedPlanet, jetpack);
					player.looksLeft = looksLeft;
					player.box = new Rectangle(new Point(x, y), resources[appearance + "_" + walkFrame].width, resources[appearance + "_" + walkFrame].height, angle);
					players.push(player);
				}
			);
			ownIdx = val.playerId;
			enabledTeams = val.enabledTeams;
			universe.width = val.univWidth;
			universe.height = val.univHeight;

			break;
		case MESSAGE.ADD_ENTITY.value:
			MESSAGE.ADD_ENTITY.deserialize(message.data,
				function(x, y, radius) {},//add planets
				function(x, y, appearance) {},//add enemies
				function(x, y, angle) {//add shots
					laserModel.makeSound(makePanner(x - players[ownIdx].box.center.x, y - players[ownIdx].box.center.y)).start(0);
					shots.push(new Shot(x, y, angle));
				},
				function(x, y, attachedPlanet, angle, looksLeft, jetpack, appearance, walkFrame, name) {//add players
					printChatMessage(undefined, undefined, name + " joined the game");
					players.push(new Player(name, appearance, walkFrame, attachedPlanet, jetpack));
					players[players.length - 1].box.center.x = x;
					players[players.length - 1].box.center.y = y;
					players[players.length - 1].looksLeft = looksLeft;
				}
			);
			break;
		case MESSAGE.REMOVE_ENTITY.value:
			MESSAGE.REMOVE_ENTITY.deserialize(message.data,
				function(id) {},//remove planets
				function(id) {},//remove enemies
				function(id) {//remove shots
					deadShots.push(shots[id]);
					deadShots[deadShots.length - 1].lifeTime = 0;
					shots.splice(id, 1);
				},
				function(id) {//remove players
					printChatMessage(undefined, undefined, players[id].name + " has left the game");
					players.splice(id, 1);
					if (id < ownIdx) --ownIdx;
				}
			);
			break;
		case MESSAGE.GAME_STATE.value:
			var val = MESSAGE.GAME_STATE.deserialize(message.data, planets.length, enemies.length, shots.length, players.length,
				function(id, ownedBy, progress) {
					planets[id].progress.team = ownedBy;
					planets[id].progress.value = progress;
					planets[id].updateColor();
				},
				function(id, angle) {
					enemies[id].box.angle = angle;
				},
				function(id, x, y) {
					shots[id].box.center.x = x;
					shots[id].box.center.y = y;
				},
				function(id, x, y, attachedPlanet, angle, looksLeft, jetpack, walkFrame) {
					if (id === ownIdx) {
						if (!players[id].jetpack && jetpack) {
							players[id].jetpackSound = jetpackModel.makeSound(soundEffectGain, 1);
							players[id].jetpackSound.start(0);
						} else if (players[id].jetpack && !jetpack && players[ownIdx].jetpackSound !== undefined) {
							players[id].jetpackSound.stop();
						}
					} else {
						if(!players[id].jetpack && jetpack) {
							setPanner(players[id].panner, players[id].box.center.x - players[ownIdx].box.center.x, players[id].box.center.y - players[ownIdx].box.center.y);
							players[id].jetpackSound = jetpackModel.makeSound(players[id].panner, 1);
							players[id].jetpackSound.start(0);
						} else if(players[id].jetpack && !jetpack && players[id].jetpackSound !== undefined) {
							players[id].jetpackSound.stop();
						}
					}

					var p = 1;
					if (players[id].boxInformations[0] === undefined) p = 0;
					if (p === 1) {
						players[id].boxInformations[0].box.center.x = players[id].box.center.x;
						players[id].boxInformations[0].box.center.y = players[id].box.center.y;
						players[id].boxInformations[0].box.angle = players[id].box.angle;
						players[id].boxInformations[0].timestamp = (players[id].boxInformations[1] !== undefined) ? players[id].boxInformations[1].timestamp : Date.now();
					}
					players[id].boxInformations[p] = {box: new Rectangle(new Point(x, y), 0, 0, angle), timestamp: Date.now()};

					players[id].looksLeft = looksLeft;
					players[id].walkFrame = "_" + walkFrame;
					players[id].attachedPlanet = attachedPlanet;
					players[id].jetpack = jetpack;
				}
			);

			players[ownIdx].health = val.yourHealth;
			players[ownIdx].fuel = val.yourFuel;

			Array.prototype.forEach.call(document.querySelectorAll("#gui-health div"), function(element, index) {
				var state = "heartFilled";
				if (index * 2 + 2 <= players[ownIdx].health) state = "heartFilled";
				else if (index * 2 + 1 === players[ownIdx].health) state = "heartHalfFilled";
				else state = "heartNotFilled";
				element.className = state;
			});
			fuelElement.value = val.yourFuel;

			if (!game.started) game.start();
			break;
		case MESSAGE.LOBBY_LIST.value:
			if (printLobbies.list === undefined) {//first time data is inserted
				printLobbies.list = MESSAGE.LOBBY_LIST.deserialize(message.data);
				printLobbies();
				applyLobbySearch();//in case the page was refreshed and the
				applyEmptinessCheck();//inputs left in a modified state
			} else {
				printLobbies.list = MESSAGE.LOBBY_LIST.deserialize(message.data);
				printLobbies();
			}
			break;
		case MESSAGE.CHAT_BROADCAST.value:
			var val = MESSAGE.CHAT_BROADCAST.deserialize(message.data);
			printChatMessage(players[val.id].name, players[val.id].appearance, val.message);
			break;
		case MESSAGE.SET_NAME_BROADCAST.value:
			var val = MESSAGE.SET_NAME_BROADCAST.deserialize(message.data);
			printChatMessage(undefined, undefined, "\"" + players[val.id].name + "\" is now known as \"" + val.name + "\"");
			players[val.id].name = val.name;
			printPlayerList();
			break;
		case MESSAGE.SCORES.value:
			var val = MESSAGE.SCORES.deserialize(message.data, enabledTeams);

			for (let team in val) {
				var element = document.getElementById("gui-points-" + team);
				if (element !== null) {
					element.textContent = val[team];
					element.style.display = "inline-block";
				}
			}
			//TODO: when game ends, display scores
			//below is some old code that used to do this
			/*for (a in val) b.push([a, val[a]]);
			b.sort(function(a, c){ return a[1]-c[1]; });
			b.forEach(function(a, i){
				if (a[0].indexOf("alien") !== -1) document.getElementById("team" + a[0].substr(5)).textContent = "[" + (5-i) + "] " + a[1];
			});*/
			break;
	}
};

var currentConnection = new Connection();
Promise.all([
	allImagesLoaded,
	new Promise(function(resolve, reject) {
		currentConnection.socket.addEventListener("open", function() {
			resolve();
		});
	})
]).then(function() {
		var lobbyUid = location.pathname.replace(/^\/lobbies\/([0-9a-f]+)\/$/, "$1");
		if(location.pathname !== lobbyUid) currentConnection.connectLobby(lobbyUid);
});

function refreshLobbies() {
	if (!currentConnection.alive()) return;
	currentConnection.refreshLobbies();
}
function leaveLobby() {
	if (!currentConnection.alive()) return;
	currentConnection.leaveLobby();
	history.pushState(null, "Main menu", "/");
	currentConnection.refreshLobbies();
	while (chatElement.childNodes.length > 1) chatElement.removeChild(chatElement.childNodes[1]);
}


window.addEventListener("popstate", function(e) {
	if(location.pathname === "/") leaveLobby();
	else {
		var lobbyUid = location.pathname.replace(/^\/lobbies\/([0-9a-f]+)\/$/, "$1");
		if(lobbyUid !== null && lobbyUid[0] !== undefined) currentConnection.connectLobby(lobbyUid[0]);
	}
});
