"use strict";

var ownIdx = null,
	enabledTeams = [],
	masterSocket = new WebSocket((location.protocol === "http:" ? "ws://" : "wss://") + location.hostname + (location.port === "" ? "" : ":" + location.port) + "/clients"),
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
				applyEmptinessCheck();//inputs left in a modified state
			} else {
				serverList = serverList.concat(MESSAGE.ADD_SERVERS.deserialize(message.data));
				addServerRow();
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
	console.log(lobbyId);
	this.socket = new WebSocket(url);
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
	printChatMessage(players[ownIdx].name, players[ownIdx].appearance, content);
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
Connection.prototype.sendActionOne = function(angle) {
	if(!currentConnection.alive()) return;
	this.socket.send(MESSAGE.ACTION_ONE.serialize(angle));
}
Connection.prototype.sendActionTwo = function(angle) {
	if(!currentConnection.alive()) return;
	this.socket.send(MESSAGE.ACTION_TWO.serialize(angle));
}
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
				function(x, y, radius, type) {//add planets
					planets.push(new Planet(x, y, radius, type));
				},
				function(x, y, appearance) {//add enemies
					enemies.push(new Enemy(x, y, appearance));
				},
				function(x, y, angle) {//add shots
					shots.push(new Shot(x, y, angle));
				},
				function(x, y, attachedPlanet, angle, looksLeft, jetpack, appearance, walkFrame, name) {//add players
					console.log(appearance, walkFrame);
					var player = new Player(name, appearance, "_" + walkFrame, attachedPlanet, jetpack);
					player.looksLeft = looksLeft;
					player.lastSound = 0;
					player.box = new Rectangle(new Point(x, y), resources[appearance + "_" + walkFrame].width, resources[appearance + "_" + walkFrame].height, angle);
					players.push(player);
				}
			);
			ownIdx = val.playerId;
			enabledTeams = val.enabledTeams;

			console.log(val.univWidth, val.univHeight);
			universe.width = val.univWidth;
			universe.height = val.univHeight;

			var hashSocket = this.url.replace(/wss\:\/\/|ws\:\/\//, function(match, p1, p2){
				if (p1) return "s";
				else if (p2) return "";
			});
			location.hash = "#srv=" + hashSocket.substr(0, hashSocket.length - 1) + "&lobby=" + encodeLobbyNumber(val.lobbyId);
			break;
		case MESSAGE.ADD_ENTITY.value:
			MESSAGE.ADD_ENTITY.deserialize(message.data,
				function(x, y, radius, type) {},//add planets
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

					var _offset = {x: 0, y: 0, angle: 0};
					if (players[id].boxInformations[0] === undefined) players[id].boxInformations[0] = new Rectangle(new Point(x, y), 0, 0, angle);
					if (Math.abs(x - players[id].box.center.x) >= universe.width - 400) _offset.x = (x < players[id].box.center.x) ? 0 : universe.width;
					if (Math.abs(y - players[id].box.center.y) >= universe.height - 400) _offset.y = (y < players[id].box.center.y) ? 0 : universe.height;
					if (Math.abs(angle - players[id].box.angle) >= 5) _offset.angle = (angle < players[id].box.angle) ? -2*Math.PI : 2*Math.PI;

					players[id].boxInformations[0].center.x = players[id].box.center.x + _offset.x;
					players[id].boxInformations[0].center.y = players[id].box.center.y + _offset.y;
					players[id].boxInformations[0].angle = players[id].box.angle + _offset.angle;
					players[id].boxInformations[1] = new Rectangle(new Point(x, y), 0, 0, angle);

					players[id].looksLeft = looksLeft;
					if ((players[id].walkFrame === "_walk1" && walkFrame === "walk2") || (players[id].walkFrame === "_walk2" && walkFrame === "walk1")) {
						let type = planets[players[id].attachedPlanet].type,
							stepSound = stepModels[type][players[id].lastSound].makeSound(makePanner(x - players[ownIdx].box.center.x, y - players[ownIdx].box.center.y));
						if (stepSound.buffer !== undefined) {
							stepSound.playbackRate.value = Math.random() + 0.5;//picth is modified from 50% to 150%
						} else {//hack for Chrome (doesn't sound as good)
							stepSound.mediaElement.playbackRate = Math.random() + 0.5;//picth is modified from 50% to 150%
						}
						stepSound.start(0);
						players[id].lastSound = (players[id].lastSound + 1)%5;
					}
					players[id].walkFrame = "_" + walkFrame;
					players[id].attachedPlanet = attachedPlanet;
					players[id].jetpack = jetpack;
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
			fuelElement.value = val.yourFuel;

			if (!game.started) game.start();
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

			for (var team in val) {
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

window.addEventListener("popstate", function(e) {
	//modifies default history entries due hash changes
	if (location.hash !== "") history.replaceState(HISTORY_GAME, "", "/" + location.hash);
	else history.replaceState(HISTORY_MENU, "", "/");

	if (history.state === HISTORY_MENU) {
		//if navigated to / stop the game + display menu
		if (currentConnection !== undefined) currentConnection.close();
		game.stop();
	} else if (history.state === HISTORY_GAME) connectByHash();
});
history.replaceState(HISTORY_MENU, "", "/");
