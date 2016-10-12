import * as engine from '<@engine@>';
import Planet from '<@Planet@>';
import Enemy from '<@Enemy@>';
import * as message from '../shared/message.js';
const vinage = require('vinage');

export let lobbies = [];

export function addLobby() {
	return lobbies.append(new Lobby(3));
}

class Lobby {
	constructor(maxPlayers) {
		this.maxPlayers = maxPlayers;
		this.players = [];
		this.planets = [];
		this.enemies = [];
		this.shots = [];

		this.processTime = 2;
		this.lobbyState = 'warmup';
		let univSize = 10000; // (1 << 16) - 1 is the max size allowed by the protocol
		this.universe = new vinage.Rectangle(new vinage.Point(0, 0), univSize, univSize/2);
		this.resetWorld();
		this.gameCycleId = setInterval(this.updateGame.bind(this), 16);
	}

	warmupToPlaying() {
		this.lobbyState = 'playing';
		console.log(this.lobbyState);

		this.updateScores();
		this.scoreCycleId = setInterval(this.updateScores.bind(this), 1000);

		setTimeout(this.playingToDisplaying.bind(this), 120000);
	}
	playingToDisplaying() {
		this.lobbyState = 'displaying_scores';
		console.log(this.lobbyState);

		clearInterval(this.gameCycleId);
		clearInterval(this.scoreCycleId);
		this.broadcast(message.displayScores.serialize(this.getScores()));

		setTimeout(() => {
			this.displayingToWarmup.bind(this)();
			if (this.enoughPlayers()) this.warmupToPlaying.bind(this)();
		}, 5000);
	}
	displayingToWarmup() {
		this.lobbyState = 'warmup';
		console.log(this.lobbyState);

		this.resetWorld();
		let thisLobbyId = lobbies.findIndex((lobby) => {
			return this === lobby;
		});
		this.players.forEach(player => {
			player.send(message.warmup.serialize(this.getScores(), thisLobbyId, player.pid, this.universe.width, this.universe.height, this.planets, this.enemies, this.shots, this.players));
		});
		this.gameCycleId = setInterval(this.updateGame.bind(this), 16);
	}

	enoughPlayers() {
		return this.players.actualLength() >= this.maxPlayers * 0.5;
	}
	addPlayer(player) {
		let retId =  this.players.append(player);
		if (this.lobbyState === 'warmup' && this.enoughPlayers()) {
			this.warmupToPlaying();
		}

		return retId;
	}
	broadcast(message, exclude) {
		this.players.forEach(function(player) {
			if (player !== exclude) player.send(message);
		});
	}
	close() {
		clearInterval(this.gameCycleId);
		clearInterval(this.scoreCycleId);
	}

	updateGame() {
		let oldDate = Date.now(),
			entitiesDelta = engine.doPhysics(this.universe, this.players, this.planets, this.enemies, this.shots, this.teamScores);

		//if a shot is added and removed at the same moment, don't send it to clients
		entitiesDelta.addedShots.forEach(function(shot, iAdd) { // dat apple fanboy tho
			let iRm = entitiesDelta.removedShots.indexOf(shot);
			if (iRm !== -1) {
				entitiesDelta.addedShots.splice(iAdd, 1);
				entitiesDelta.removedShots.splice(iRm, 1);
			}
		});
		if (entitiesDelta.addedShots.length != 0) this.broadcast(message.addEntity.serialize([], [], entitiesDelta.addedShots, []));
		//if (entitiesDelta.removedShots.length != 0) this.broadcast(message.removeEntity.serialize([], [], entitiesDelta.removedShots, [])); // Why is this disabled?


		this.players.forEach(function(player) {
			function updPlayer() {
				player.send(message.gameState.serialize(player.health, player.fuel, this.planets, this.enemies, this.players));
				player.needsUpdate = true;
			}
			if (player.needsUpdate || player.needsUpdate === undefined) {
				player.needsUpdate = false;
				setTimeout(updPlayer.bind(this), 50);
			}
		}, this);
		this.processTime = Date.now() - oldDate;
	}
	updateScores() {
		this.planets.forEach((function(planet) {
			if (planet.progress.value >= 80) this.teamScores[planet.progress.team]++;
		}), this);
		this.broadcast(message.scores.serialize(this.teamScores));
	}
	pingPlayers() {
		this.players.forEach(function(player) {
			player.lastPing = Date.now();
			player.ws.ping(undefined, undefined, true);
		});
	}
	getPlayerId(player) {
		let id;
		this.players.some(function(_player, index) {
			if (_player === player) {
				id = index;
				return true;
			}
		});
		return id;
	}
	getScores() {
		let i = {}, a;
		for (a in this.teamScores) if (a.indexOf('alien') !== -1) i[a] = this.teamScores[a];
		return i;
	}
	getNextHomographId(playerName) {
		let homographId = 0;
		this.players.forEach(function(player) {
			if (player.name === playerName && player.homographId === homographId) ++homographId;
		});
		return homographId;
	}
	resetWorld() {//generate world
		this.planets.length = 0;
		this.enemies.length = 0;

		for (let player of this.players) {
			if (player === undefined) continue;
			player.attachedPlanet = -1;
		}

		let planetDensity = Math.pow(6400, 2) / 26,
			planetAmount = Math.round((this.universe.width*this.universe.height) / planetDensity),
			enemyDensity = Math.pow(6400, 2) / 15,
			enemyAmount = Math.round((this.universe.width*this.universe.height) / enemyDensity);
		if (planetAmount > 254) planetAmount = 254;//these limits are set
		if (enemyAmount > 255) enemyAmount = 255;//by the protocol
		//the ID of the planets and the enemies is stored on a single byte
		//however, the planet ID value 255 (aka a wrapped -1) is reserved to be used when the player is not attached to a planet (player.attachedPlanet = -1)
		function distanceBetween(box1, box2) {
			let var1 = box2.center.x - box1.center.x, var2 = box2.center.y - box1.center.y;
			return Math.sqrt(var1 * var1 + var2 * var2);
		}
		let maxIterations = planetAmount * 4;
		for (let i = 0, iterations = 0; i !== planetAmount, iterations !== maxIterations; ++i, ++iterations) {
			let newPlanet = new Planet(Math.random()*this.universe.width, Math.random()*this.universe.height, 100 + Math.random()*300);
			if (this.planets.every(function(planet) { return !this.universe.collide(planet.atmosBox, newPlanet.atmosBox); }.bind(this)) &&
				newPlanet.box.center.x - newPlanet.box.radius > 50 && newPlanet.box.center.x + newPlanet.box.radius < this.universe.width - 50 &&
				newPlanet.box.center.y - newPlanet.box.radius > 50 && newPlanet.box.center.y + newPlanet.box.radius < this.universe.height - 50) this.planets.push(newPlanet);
			else --i;//failed to add it, do it again so we have the correct amount
		}
		maxIterations = enemyAmount * 4;
		for (let i = 0, iterations = 0; i !== enemyAmount, iterations !== maxIterations; ++i, ++iterations) {
			let newEnemy = new Enemy(Math.random()*this.universe.width, Math.random()*this.universe.height);
			if (this.planets.every(function(planet) {
				return distanceBetween(planet.box, newEnemy.box) > planet.box.radius + 420;
			}.bind(this)) && this.enemies.every(function(enemy) {
				return distanceBetween(enemy.box, newEnemy.box) > 700;
			}.bind(this))) this.enemies.push(newEnemy);
			else --i;//failed to add it, do it again so we have the correct amount
		}

		this.teams = {};
		this.teamScores = {};
		let _teams = ['alienBeige', 'alienBlue', 'alienGreen', 'alienPink', 'alienYellow'];

		for (let teamNumber = 0; teamNumber !== 2; ++teamNumber) {
			let teamIndex = Math.floor(Math.random() * _teams.length);
			this.teams[_teams[teamIndex]] = [];
			this.teamScores[_teams[teamIndex]] = 0;
			_teams.splice(teamIndex, 1);
		}
		this.enabledTeams = Object.keys(this.teamScores);
		this.players.forEach(function(player) {
			player.controls = {};
			player.health = 8;
			player.fuel = 300;
			player.velocity = new vinage.Vector(0, 0);
		});
	}
	assignPlayerTeam(player) {
		let teamsPlaying = Object.keys(this.teams);
		if (this.teams[teamsPlaying[0]].length === this.teams[teamsPlaying[1]].length) player.appearance = teamsPlaying[Math.round(Math.random())];
		else player.appearance = teamsPlaying[this.teams[teamsPlaying[0]].length > this.teams[teamsPlaying[1]].length ? 1 : 0];
		this.teams[player.appearance].push(player.pid);
		player.box = new vinage.Rectangle(new vinage.Point(0, 0), 0, 0);
		player.box.angle = Math.random() * Math.PI;
		player.attachedPlanet = this.planets.findIndex(function(planet) {
			return planet.progress.team === player.appearance && planet.progress.value > 80;
		});
	}
	sendEntityDelta(delta, excludedPlayer) {
		if (delta !== undefined) {
			if (delta.addedEnemies !== undefined || delta.addedPlanet !== undefined || delta.addedPlayer !== undefined || delta.addedShots !== undefined) {
				this.broadcast(message.addEntity.serialize(delta.addedPlanet, delta.addedEnemies, delta.addedShots, delta.addedPlayer),
					excludedPlayer);
			}
			if (delta.removedEnemies !== undefined || delta.removedPlanet !== undefined || delta.removedPlayer !== undefined || delta.removedShots !== undefined) {
				this.broadcast(message.removeEntity.serialize(delta.removedPlanet, delta.removedEnemies, delta.removedShots, delta.removedPlayer),
					excludedPlayer);
			}
		}
	}
}
