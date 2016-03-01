"use strict";

var ownIdx = null,
	enabledTeams = [];

function Connection(address) {
	this.lastControls = {};

	this.socket = new WebSocket(address || "ws://" + location.hostname + (location.port === "" ? "" : ":" + location.port));
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
			var val = MESSAGE.CONNECT_ACCEPTED.deserialize(message.data);
			ownIdx = val.playerId;
			enabledTeams = val.enabledTeams;
			universe.width = val.univWidth;
			universe.height = val.univHeight;


			planets.length = 0;
			val.world.planets.forEach(function(planet) {
				planets.push(new Planet(planet.x, planet.y, planet.radius));
			});

			enemies.length = 0;
			val.world.enemies.forEach(function(enemy) {
				enemies.push(new Enemy(enemy.x, enemy.y, enemy.appearance));
			});

			shots.length = 0;
			val.world.shots.forEach(function(shot) {
				shots.push({box: new Rectangle(new Point(shot.x, shot.y), resources["laserBeam"].width, resources["laserBeam"].height, shot.angle), lt: 200});
			});

			players.length = 0;
			val.world.players.forEach(function(_player) {
				var player = new Player(_player.name, _player.appearance, "_" + _player.walkFrame, _player.attachedPlanet, _player.jetpack);
				player.looksLeft = _player.looksLeft;
				player.box = new Rectangle(new Point(_player.x, _player.y), resources[player.appearance + player.walkFrame].width, resources[player.appearance + player.walkFrame].height, _player.angle);
				players.push(player);
			});
			break;
		case MESSAGE.ADD_ENTITY.value:
			var val = MESSAGE.ADD_ENTITY.deserialize(message.data);

			val.players.forEach(function(player) {
				printChatMessage(undefined, undefined, player.name + " joined the game");
				players.push(new Player(player.name, player.appearance, player.walkFrame, player.attachedPlanet, player.jetpack, player.health));
			});
			val.shots.forEach(function(shot) {
				laserModel.makeSound(makePanner(shot.x - players[ownIdx].box.center.x, shot.y - players[ownIdx].box.center.y)).start(0);
				shots.push(new Shot(shot.x, shot.y, shot.angle));
			});
			break;
		case MESSAGE.REMOVE_ENTITY.value:
			var val = MESSAGE.REMOVE_ENTITY.deserialize(message.data);
			val.playerIds.forEach(function(id) {
				printChatMessage(undefined, undefined, players[id].name + " has left the game");
				players.splice(id, 1);
				if (id < ownIdx) --ownIdx;
			});
			val.shotIds.forEach(function(id) {
				deadShots.push(shots[id]);
				deadShots[deadShots.length - 1].lifeTime = 0;
				shots.splice(id, 1);
			});
			break;
		case MESSAGE.GAME_STATE.value:
			var val = MESSAGE.GAME_STATE.deserialize(message.data, planets.length, enemies.length, shots.length, players.length);

			players[ownIdx].health = val.yourHealth;
			players[ownIdx].fuel = val.yourFuel;

			[].forEach.call(document.querySelectorAll("#gui-health div"), function(element, index) {
				var state = "heartFilled";
				if (index * 2 + 2 <= players[ownIdx].health) state = "heartFilled";
				else if (index * 2 + 1 === players[ownIdx].health) state = "heartHalfFilled";
				else state = "heartNotFilled";
				element.className = state;
			});
			fuelElement.value = val.yourFuel;

			val.planets.forEach(function(planet, i) {
				planets[i].progress.team = planet.ownedBy;
				planets[i].progress.value = planet.progress;
				planets[i].updateColor();
			});
			val.enemies.forEach(function(enemyAngle, i) {
				enemies[i].box.angle = enemyAngle;
			});
			val.shots.forEach(function(shot, i) {
				shots[i].box.center.x = shot.x;
				shots[i].box.center.y = shot.y;
			});
			val.players.forEach(function(player, i) {
				if (i === ownIdx) {
					if (!players[i].jetpack && player.jetpack) {
						players[i].jetpackSound = jetpackModel.makeSound(soundEffectGain, 1);
						players[i].jetpackSound.start(0);
					} else if (players[i].jetpack && !player.jetpack && players[ownIdx].jetpackSound !== undefined) {
						players[i].jetpackSound.stop();
					}
				} else {
					if(!players[i].jetpack && player.jetpack) {
						setPanner(players[i].panner, players[i].box.center.x - players[ownIdx].box.center.x, players[i].box.center.y - players[ownIdx].box.center.y);
						players[i].jetpackSound = jetpackModel.makeSound(players[i].panner, 1);
						players[i].jetpackSound.start(0);
					} else if(players[i].jetpack && !player.jetpack && players[i].jetpackSound !== undefined) {
						players[i].jetpackSound.stop();
					}
				}

				var p = 1;
				if (players[i].boxInformations[0] === undefined) p = 0;
				if (p === 1) {
					players[i].boxInformations[0].box.center.x = players[i].box.center.x;
					players[i].boxInformations[0].box.center.y = players[i].box.center.y;
					players[i].boxInformations[0].box.angle = players[i].box.angle;
					players[i].boxInformations[0].timestamp = (players[i].boxInformations[1] !== undefined) ? players[i].boxInformations[1].timestamp : Date.now();
				}
				players[i].boxInformations[p] = {box: new Rectangle(new Point(player.x, player.y), 0, 0, player.angle), timestamp: Date.now()};

				players[i].looksLeft = player.looksLeft;
				players[i].walkFrame = "_" + player.walkFrame;
				players[i].attachedPlanet = player.attachedPlanet;
				players[i].jetpack = player.jetpack;
			});
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
