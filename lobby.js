"use strict";

module.exports = function(engine) {
	var vinage = require("vinage"),
		MESSAGE = require("./static/message.js");

	function Lobby(maxPlayers) {
		this.players = [];
		this.maxPlayers = maxPlayers;
		this.planets = [];
		this.enemies = [];
		this.shots = [];
		this.processTime = 2;
		this.lobbyState = this.lobbyStates.WARMUP;
		let univSize = 10000;//(1 << 16) - 1 is the max size allowed by the protocol
		this.universe = new vinage.Rectangle(new vinage.Point(0, 0), univSize, univSize/2);
		this.resetWorld();
		this.gameCycleId = setInterval(this.updateGame.bind(this), 16);
	}
	Lobby.prototype.lobbyStates = {
		WARMUP: 0,
		PLAYING: 1,
		DISPLAYING_SCORES: 2
	};
	Lobby.prototype.goToPlayState = function() {
			this.scoreCycleId = setInterval(this.updateScores.bind(this), 1000);

			this.lobbyState = this.lobbyStates.PLAYING;
			this.broadcast(MESSAGE.LOBBY_STATE.serialize(this.lobbyState));
			setTimeout(() => {
				clearInterval(this.gameCycleId);
				clearInterval(this.scoreCycleId);

				this.lobbyState = this.lobbyStates.DISPLAYING_SCORES;
				this.broadcast(MESSAGE.LOBBY_STATE.serialize(this.lobbyState));
				setTimeout(() => {
					this.gameCycleId = setInterval(this.updateGame.bind(this), 16);
					this.goToPlayState();
				}, 5000);
			}, 120000);
	};
	Lobby.prototype.addPlayer = function(player) {
		let retId =  this.players.append(player);
		if (this.lobbyState === this.lobbyStates.WARMUP && this.players.actualLength() >= this.maxPlayers * 0.5) {
			this.goToPlayState();
		}

		return retId;
	}
	Lobby.prototype.broadcast = function(message, exclude) {
		this.players.forEach(function(player) {
			if (player !== exclude) player.send(message);
		});
	};
	Lobby.prototype.close = function() {
		clearInterval(this.gameCycleId);
		clearInterval(this.scoreCycleId);
	};

	Lobby.prototype.updateGame = function() {
		var oldDate = Date.now(), playerData = new Array(this.maxPlayers),
			entitiesDelta = engine.doPhysics(this.universe, this.players, this.planets, this.enemies, this.shots, this.teamScores);

		//if a shot is added and removed at the same moment, don't send it to clients
		entitiesDelta.addedShots.forEach(function(shot, iAdd) { // dat apple fanboy tho
			var iRm = entitiesDelta.removedShots.indexOf(shot);
			if (iRm !== -1) {
				entitiesDelta.addedShots.splice(iAdd, 1);
				entitiesDelta.removedShots.splice(iRm, 1);
			}
		});
		if (entitiesDelta.addedShots.length != 0) this.broadcast(MESSAGE.ADD_ENTITY.serialize([], [], entitiesDelta.addedShots, []));
		//if (entitiesDelta.removedShots.length != 0) this.broadcast(MESSAGE.REMOVE_ENTITY.serialize([], [], entitiesDelta.removedShots, []));

		this.players.forEach(function(player, i) {
			function truncTo(number, decimalNbr) {
				var lel = Math.pow(10, decimalNbr);
				return Math.round(number * lel) / lel;
			}
			playerData[i] = {x: truncTo(player.box.center.x, 3), y: truncTo(player.box.center.y, 3), attachedPlanet: player.attachedPlanet,
				angle: truncTo(player.box.angle, 4), walkFrame: player.walkFrame, health: player.health, fuel: player.fuel,
				name: player.name, appearance: player.appearance, looksLeft: player.looksLeft, jetpack: player.jetpack
			};
		});

		this.players.forEach(function(player) {
			function updPlayer() {
				player.send(MESSAGE.GAME_STATE.serialize(player.health, player.fuel, this.planets, this.enemies, this.players));
				player.needsUpdate = true;
			}
			if (player.needsUpdate || player.needsUpdate === undefined) {
				player.needsUpdate = false;
				setTimeout(updPlayer.bind(this), 50);
			}
		}, this);
		this.processTime = Date.now() - oldDate;
	};
	Lobby.prototype.updateLobby = function() {
	};
	Lobby.prototype.updateScores = function() {
		this.planets.forEach((function(planet) {
			if (planet.progress.value >= 80) this.teamScores[planet.progress.team]++;
		}), this);
		this.broadcast(MESSAGE.SCORES.serialize(this.teamScores));
	};
	Lobby.prototype.pingPlayers = function() {
		this.players.forEach(function(player) {
			player.lastPing = Date.now();
			player.ws.ping(undefined, undefined, true);
		});
	};
	Lobby.prototype.getPlayerId = function(player) {
		var id;
		this.players.some(function(_player, index) {
			if (_player === player) {
				id = index;
				return true;
			}
		});
		return id;
	};
	Lobby.prototype.getScores = function() {
		var i = {}, a;
		for (a in this.teamScores) if (a.indexOf("alien") !== -1) i[a] = this.teamScores[a];
		return i;
	};
	Lobby.prototype.getNextHomographId = function(playerName) {
		var homographId = 0;
		this.players.forEach(function(player) {
			if (player.name === playerName && player.homographId === homographId) ++homographId;
		});
		return homographId;
	};
	Lobby.prototype.resetWorld = function() {//generate world
		this.planets.length = 0;
		this.enemies.length = 0;

		var planetDensity = Math.pow(6400, 2) / 26,
			planetAmount = Math.round((this.universe.width*this.universe.height) / planetDensity),
			enemyDensity = Math.pow(6400, 2) / 15,
			enemyAmount = Math.round((this.universe.width*this.universe.height) / enemyDensity);
		if (planetAmount > 254) planetAmount = 254;//these limits are set
		if (enemyAmount > 255) enemyAmount = 255;//by the protocol
		//the ID of the planets and the enemies is stored on a single byte
		//however, the planet ID value 255 (aka a wrapped -1) is reserved to be used when the player is not attached to a planet (player.attachedPlanet = -1)
		function distanceBetween(box1, box2) {
			var var1 = box2.center.x - box1.center.x, var2 = box2.center.y - box1.center.y;
			return Math.sqrt(var1 * var1 + var2 * var2);
		}
		var maxIterations = planetAmount * 4;
		for (let i = 0, iterations = 0; i !== planetAmount, iterations !== maxIterations; ++i, ++iterations) {
			let newPlanet = new engine.Planet(Math.random()*this.universe.width, Math.random()*this.universe.height, 100 + Math.random()*300);
			if (this.planets.every(function(planet) { return !this.universe.collide(planet.atmosBox, newPlanet.atmosBox); }.bind(this)) &&
				newPlanet.box.center.x - newPlanet.box.radius > 50 && newPlanet.box.center.x + newPlanet.box.radius < this.universe.width - 50 &&
				newPlanet.box.center.y - newPlanet.box.radius > 50 && newPlanet.box.center.y + newPlanet.box.radius < this.universe.height - 50) this.planets.push(newPlanet);
			else --i;//failed to add it, do it again so we have the correct amount
		}
		maxIterations = enemyAmount * 4;
		for (let i = 0, iterations = 0; i !== enemyAmount, iterations !== maxIterations; ++i, ++iterations) {
			let newEnemy = new engine.Enemy(Math.random()*this.universe.width, Math.random()*this.universe.height);
			if (this.planets.every(function(planet) {
				return distanceBetween(planet.box, newEnemy.box) > planet.box.radius + 420;
			}.bind(this)) && this.enemies.every(function(enemy) {
				return distanceBetween(enemy.box, newEnemy.box) > 700;
			}.bind(this))) this.enemies.push(newEnemy);
			else --i;//failed to add it, do it again so we have the correct amount
		}

		this.teams = {};
		this.teamScores = {};
		var _teams = ["alienBeige", "alienBlue", "alienGreen", "alienPink", "alienYellow"];

		for (let teamNumber = 0; teamNumber !== 2; ++teamNumber) {
			let teamIndex = Math.floor(Math.random() * _teams.length);
			this.teams[_teams[teamIndex]] = [];
			this.teamScores[_teams[teamIndex]] = 0;
			_teams.splice(teamIndex, 1);
		}
		this.enabledTeams = Object.keys(this.teamScores);
		this.players.forEach(function(player) {
			player.controls = {};
			player.health
			player.health = 8;
			player.fuel = 300;
			player.velocity = new vinage.Vector(0, 0);
		});
	};
	Lobby.prototype.assignPlayerTeam = function(player) {
		var teamsPlaying = Object.keys(this.teams);
		if (this.teams[teamsPlaying[0]].length === this.teams[teamsPlaying[1]].length) player.appearance = teamsPlaying[Math.round(Math.random())];
		else player.appearance = teamsPlaying[this.teams[teamsPlaying[0]].length > this.teams[teamsPlaying[1]].length ? 1 : 0];
		this.teams[player.appearance].push(player.pid);
		player.box = new vinage.Rectangle(new vinage.Point(0, 0), 0, 0);
		player.box.angle = Math.random() * Math.PI;
		player.attachedPlanet = this.planets.findIndex(function(planet) {
			return planet.progress.team === player.appearance && planet.progress.value > 80;
		});
	};
	Lobby.prototype.sendEntityDelta = function(delta, excludedPlayer) {
		if (delta !== undefined) {
			if (delta.addedEnemies !== undefined || delta.addedPlanet !== undefined || delta.addedPlayer !== undefined || delta.addedShots !== undefined) {
				this.broadcast(MESSAGE.ADD_ENTITY.serialize(delta.addedPlanet, delta.addedEnemies, delta.addedShots, delta.addedPlayer),
					excludedPlayer);
			}
			if (delta.removedEnemies !== undefined || delta.removedPlanet !== undefined || delta.removedPlayer !== undefined || delta.removedShots !== undefined) {
				this.broadcast(MESSAGE.REMOVE_ENTITY.serialize(delta.removedPlanet, delta.removedEnemies, delta.removedShots, delta.removedPlayer),
					excludedPlayer);
			}
		}
	};

	return Lobby;
};
