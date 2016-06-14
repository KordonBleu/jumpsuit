"use strict";

var ownIdx = null,
	enabledTeams = [],
	masterSocket = new WebSocket("ws://" + location.hostname + (location.port === "" ? "" : ":" + location.port) + "/clients"),
	serverList,
	currentConnection;

const HISTORY_MENU = 0;
const HISTORY_GAME = 1;

masterSocket.binaryType = "arraybuffer";
masterSocket.addEventListener("message", function(message) {
	switch (new Uint8Array(message.data, 0, 1)[0]) {
		case MESSAGE.ADD_SERVERS.value:
			console.log("Got some new servers to add ! :D");
			if (serverList === undefined) {//first time data is inserted
				serverList = MESSAGE.ADD_SERVERS.deserialize(message.data);
				serverList.forEach(addServerRow);
				applyLobbySearch();//in case the page was refreshed and the
			} else {
				console.log(MESSAGE.ADD_SERVERS.deserialize(message.data), serverList);
				let newServers = MESSAGE.ADD_SERVERS.deserialize(message.data);
				serverList = serverList.concat(newServers);
				newServers.forEach(addServerRow);
			}
			break;
		case MESSAGE.REMOVE_SERVERS.value:
			console.log("I hafta remove servers :c");
			MESSAGE.REMOVE_SERVERS.deserialize(message.data).forEach(function(id) {
				removeServer(id);
			});
			break;
	}
});

function Connection(url, lobbyId) {// a connection to a game server
	this.lastControls = {};
	try {
		this.socket = new WebSocket(url);
	} catch (err) {
		showBlockedPortDialog(url.match(/:(\d+)/)[1]);
	}
	this.socket.binaryType = "arraybuffer";

	this.socket.addEventListener("open", function() {
		this.setName.call(this);
		this.sendMessage.call(this, MESSAGE.CONNECT, lobbyId);
	}.bind(this));
	this.socket.addEventListener("error", this.errorHandler);
	this.socket.addEventListener("message", this.messageHandler);
	//this should return a Promise, dontcha think?

}
Connection.prototype.alive = function() { return this.socket.readyState === 1; };
Connection.prototype.sendMessage = function(messageType) {
	try {
		this.socket.send(messageType.serialize.apply(messageType, [].slice.call(arguments, 1)));
	} catch(err) {
		console.log(err);
		//TODO: display "connection lost" and get back to the main menu
		//or is that redudant with the event listener on "error"?
	}
}
Connection.prototype.createLobby = function(name, playerAmount) {
	if (!currentConnection.alive()) return;
	this.socket.send(MESSAGE.CREATE_LOBBY.serialize(name, playerAmount));
};
Connection.prototype.close = function() {
	this.socket.close();
	this.socket.removeEventListener("error", this.errorHandler);
	this.socket.removeEventListener("message", this.messageHandler);
	game.stop();
//	history.pushState(HISTORY_MENU, "", "/");
	while (chatElement.childNodes.length > 1) chatElement.removeChild(chatElement.childNodes[1]);
};
Connection.prototype.setName = function() {
	this.sendMessage(MESSAGE.SET_NAME, settings.name);
};
Connection.prototype.sendChat = function(content) {
	this.sendMessage(MESSAGE.CHAT, content);
	printChatMessage(players[ownIdx].getFinalName(), players[ownIdx].appearance, content);
};
Connection.prototype.refreshControls = function(controls) {
	var accordance = 0, b = 0; //checking if every entry is the same, if so no changes & nothing to send
	for (var c in players[ownIdx].controls) {
		b++;
		if (this.lastControls[c] === players[ownIdx].controls[c]) accordance++;
		else this.lastControls[c] = players[ownIdx].controls[c];
	}
	if (accordance === b) return;
	this.socket.send(MESSAGE.PLAYER_CONTROLS.serialize(controls));
};
Connection.prototype.sendMousePos = function(angle) {
	if (!currentConnection.alive()) return;
	if (this.lastAngle === undefined) this.lastAngle = 0;
	if (this.lastAngle !== angle) this.sendMessage(MESSAGE.AIM_ANGLE, angle);
	this.lastAngle = angle;
};
Connection.prototype.errorHandler = function() {
	//TODO: go back to main menu
	this.close();
};
Connection.prototype.messageHandler = function(message) {
	switch (new Uint8Array(message.data, 0, 1)[0]) {
		case MESSAGE.ERROR.value:
			var errDesc;
			switch(MESSAGE.ERROR.deserialize(message.data)) {
				case MESSAGE.ERROR.NO_LOBBY:
					errDesc = "This lobby doesn't exist anymore";//TODO: show this message in a pop-up with "See the other servers button" to get back to the menu
					break;
				case MESSAGE.ERROR.NO_SLOT:
					errDesc = "There's no slot left in the lobby";
					break;
			}

			alert("Error:\n" + errDesc);
			break;
		case MESSAGE.CONNECT_ACCEPTED.value:
			planets.length = 0;
			enemies.length = 0;
			shots.length = 0;
			players.length = 0;
			var val = MESSAGE.CONNECT_ACCEPTED.deserialize(message.data,
				function(x, y, radius, type) {//add planets
					planets.push(new Planet(x, y, radius, type));
				},
				function(x, y, appearance) {//add enemies
					enemies.push(new Enemy(x, y, appearance));
				},
				function(x, y, angle) {//add shots
					shots.push(new Shot(x, y, angle));
				},
				function(pid, x, y, attachedPlanet, angle, looksLeft, jetpack, appearance, walkFrame, name, homographId, armedWeapon, carriedWeapon) {//add players
					var player = new Player(name, appearance, "_" + walkFrame, attachedPlanet, jetpack, undefined, undefined, armedWeapon, carriedWeapon);
					player.looksLeft = looksLeft;
					player.homographId = homographId;
					player.pid = pid;
					player.lastSound = 0;
					player.box = new Rectangle(new Point(x, y), resources[appearance + "_" + walkFrame].width, resources[appearance + "_" + walkFrame].height, angle);
					players.push(player);
				}
			);
			ownIdx = val.playerId;
			enabledTeams = val.enabledTeams;

			universe.width = val.univWidth;
			universe.height = val.univHeight;

			var hashSocket = this.url.replace(/wss\:\/\/|ws\:\/\//, function(match, p1, p2){
				if (p1) return "s";
				else if (p2) return "";
			});
			location.hash = "#srv=" + hashSocket.substr(0, hashSocket.length - 1) + "&lobby=" + encodeLobbyNumber(val.lobbyId);
			if (!game.started) game.start();
			break;
		case MESSAGE.ADD_ENTITY.value:
			MESSAGE.ADD_ENTITY.deserialize(message.data,
				function(x, y, radius, type) {},//add planets
				function(x, y, appearance) {},//add enemies
				function(x, y, angle, origin, type) {//add shots
					laserModel.makeSound(makePanner(x - players[ownIdx].box.center.x, y - players[ownIdx].box.center.y)).start(0);
					var shot = new Shot(x, y, angle, origin, type);
					shots.push(shot);
					var param1 = players.find(function(element) { return element.pid === origin; });
					if (param1) param1.muzzleFlash = type === shot.shotEnum.bullet;
				},
				function(pid, x, y, attachedPlanet, angle, looksLeft, jetpack, appearance, walkFrame, name, homographId, armedWeapon, carriedWeapon) {//add players
					var newPlayer = new Player(name, appearance, walkFrame, attachedPlanet, jetpack, undefined, undefined, armedWeapon, carriedWeapon);
					newPlayer.pid = pid;
					newPlayer.box.center.x = x;
					newPlayer.box.center.y = y;
					newPlayer.looksLeft = looksLeft;
					newPlayer.homographId = homographId;
					printChatMessage(undefined, undefined, newPlayer.getFinalName() + " joined the game");
					players.push(newPlayer);
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
					printChatMessage(undefined, undefined, players[id].getFinalName() + " has left the game");
					players.splice(id, 1);
					if (id < ownIdx) --ownIdx;
				}
			);
			break;
		case MESSAGE.GAME_STATE.value:
			var val = MESSAGE.GAME_STATE.deserialize(message.data, planets.length, enemies.length, players.length,
				function(id, ownedBy, progress) {
					planets[id].progress.team = ownedBy;
					planets[id].progress.value = progress;
					planets[id].updateColor();
				},
				function(id, angle) {
					enemies[id].box.angle = angle;
				},
				function(id, x, y, attachedPlanet, angle, looksLeft, jetpack, hurt, walkFrame, armedWeapon, carriedWeapon, aimAngle) {
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
					var param1 = Date.now(), param2 = players[id];

					if ("timestamp" in players[id].predictionTarget) param1 = param2.predictionTarget.timestamp;
					players[id].predictionTarget = {timestamp: Date.now(), box: new Rectangle(new Point(x, y), 0, 0, angle), aimAngle: aimAngle};
					players[id].predictionBase = {timestamp: param1, box: new Rectangle(new Point(param2.box.center.x, param2.box.center.y), 0, 0, param2.box.angle), aimAngle: param2.aimAngle};
					players[id].looksLeft = looksLeft;
					if ((players[id].walkFrame === "_walk1" && walkFrame === "walk2") || (players[id].walkFrame === "_walk2" && walkFrame === "walk1")) {
						let type = planets[players[id].attachedPlanet].type,
							stepSound = stepModels[type][players[id].lastSound].makeSound(makePanner(x - players[ownIdx].box.center.x, y - players[ownIdx].box.center.y));
						if (stepSound.buffer !== undefined) {
							stepSound.playbackRate.value = Math.random() + 0.5;//pitch is modified from 50% to 150%
						} else {//hack for Chrome (doesn't sound as good)
							stepSound.mediaElement.playbackRate = Math.random() + 0.5;
						}
						stepSound.start(0);
						players[id].lastSound = (players[id].lastSound + 1) % 5;
					}
					players[id].walkFrame = "_" + walkFrame;
					players[id].setBoxSize();
					players[id].hurt = hurt;
					players[id].jetpack = jetpack;

					players[id].attachedPlanet = attachedPlanet;
					players[id].weaponry.armed = armedWeapon;
					players[id].weaponry.carrying = carriedWeapon;
				}
			);

			players[ownIdx].health = val.yourHealth;
			players[ownIdx].fuel = val.yourFuel;

			[].forEach.call(document.querySelectorAll("#gui-health div"), function(element, index) {
				var state = "heartFilled";
				if (index * 2 + 2 <= players[ownIdx].health) state = "heartFilled";
				else if (index * 2 + 1 === players[ownIdx].health) state = "heartHalfFilled";
				else state = "heartNotFilled";
				element.className = state;
			});
			if (fuelElement.value !== val.yourFuel) fuelElement.value = val.yourFuel;

			break;
		case MESSAGE.CHAT_BROADCAST.value:
			var val = MESSAGE.CHAT_BROADCAST.deserialize(message.data);
			printChatMessage(players[val.id].getFinalName(), players[val.id].appearance, val.message);
			break;
		case MESSAGE.SET_NAME_BROADCAST.value:
			var val = MESSAGE.SET_NAME_BROADCAST.deserialize(message.data);
			let oldName = players[val.id].getFinalName();
			players[val.id].name = val.name;
			players[val.id].homographId = val.homographId;
			printChatMessage(undefined, undefined, "\"" + oldName + "\" is now known as \"" + players[val.id].getFinalName() + "\"");
			printPlayerList();
			break;
		case MESSAGE.SCORES.value:
			var val = MESSAGE.SCORES.deserialize(message.data, enabledTeams);

			for (var team in val) {
				var element = document.getElementById("gui-points-" + team);
				if (element !== null) {
					element.textContent = val[team];
					element.style.display = "inline-block";
				}
			}
			//TODO: when game ends, display scores
			break;
	}
};


function connectByHash() {
	if (location.hash === "") return;
	try {
		var a = location.hash.substr(1).split("&"), b, url, protocol = "ws://", ws, lobbyId;
		for (b in a) {
			if (a[b].indexOf("srv=") === 0) url = a[b].substr(4);
			else if (a[b].indexOf("lobby=") === 0) lobbyId = a[b].substr(6);
		}
		if (url.indexOf("s") === 0) {
			protocol = "wss://";
			url = url.substr(1);
		}
		ws = protocol + url + "/";
		if (currentConnection !== undefined) {
			if (currentConnection.socket.url !== ws) {
				currentConnection.close();
				currentConnection = new Connection(ws, lobbyId);
			} else if (!currentConnection.alive()) {
				currentConnection = new Connection(ws, lobbyId);
			}
		} else currentConnection = new Connection(ws, lobbyId);
	} catch (ex) {
		if (currentConnection !== undefined) currentConnection.close();
		console.log(ex, ex.stack);
	}
}

function handleHistoryState() {
	//modifies default history entries due hash changes
	if (location.hash !== "") history.replaceState(HISTORY_GAME, "", "/" + location.hash);
	else history.replaceState(HISTORY_MENU, "", "/");
	console.log(history.state);
	if (history.state === HISTORY_MENU) {
		//if navigated to / stop the game + display menu
		if (currentConnection !== undefined) currentConnection.close();
		game.stop();
	} else if (history.state === HISTORY_GAME) connectByHash();
}
window.addEventListener("popstate", handleHistoryState);

