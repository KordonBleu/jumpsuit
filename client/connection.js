import settings from './model/settings.js';
import * as loop from './controller/loop.js';
import * as view from './view/index.js';

import * as entities from './model/entities.js';
import * as message from '../shared/message.js';

import * as model from './model/index.js';

export default class Connection {
	constructor(slaveCo, lobbyId) {// a connection to a game server
		this.lastControls = {};
		this.lastMessage;
		this.lastAngle = 0;

		this.slaveCo = slaveCo;
		this.lobbyId = lobbyId;

		return new Promise((resolve, reject) => {
			slaveCo.createDataChannel('test', {
				ordered: false,
				maxRetransmits: 0, // unreliable
				protocol: 'JumpSuit'
			}).then(dc => {
				dc.binaryType = 'arraybuffer';

				console.log(slaveCo);

				dc.addEventListener('message', this.constructor.messageHandler.bind(this));
				dc.addEventListener('error', this.constructor.errorHandler);

				this.fastDc = dc;

				this.sendMessage.call(this, message.connect, lobbyId, settings);

				this.latencyHandlerId = setInterval(this.constructor.latencyHandler.bind(this), 100);
				this.mouseAngleUpdateHandlerId = setInterval(this.constructor.mouseAngleUpdateHandler.bind(this), 80);

				resolve(this);
			}).catch(reject);
		});
	}
	alive() {
		return this.fastDc.readyState === 'open';
	}
	sendMessage(messageType, ...args) {
		try {
			this.fastDc.send(messageType.serialize.apply(messageType, args));
		} catch(err) {
			console.error(err);
			//TODO: display 'connection lost' and get back to the main menu
			//or is that redudant with the event listener on 'error'?
		}
	}
	close() { // stop the game and displays menu
		clearInterval(this.latencyHandlerId);
		clearInterval(this.mouseAngleUpdateHandlerId);
		this.fastDc.close();
		this.fastDc.removeEventListener('error', this.constructor.errorHandler);
		this.fastDc.removeEventListener('message', this.constructor.messageHandler);
		loop.stop();
		view.views.showMenu();
		entities.players.length = 0;
		document.getElementById('lobby-table').classList.remove('hidden');
		view.views.hideScores();
		view.chat.clearChat();
		view.history.push(); // go to the menu
	}
	setPreferences() {
		this.sendMessage(message.setPreferences, settings);
	}
	sendChat(content) {
		this.sendMessage(message.chat, content);
		view.chat.printChatMessage(entities.players[model.game.ownIdx].getFinalName(), entities.players[model.game.ownIdx].appearance, content);
	}
	refreshControls(selfControls) {
		let accordance = 0, b = 0; //checking if every entry is the same, if so no changes & nothing to send
		for (let c in selfControls) {
			b++;
			if (this.lastControls[c] === selfControls[c]) accordance++;
			else this.lastControls[c] = selfControls[c];
		}
		if (accordance === b) return;
		this.fastDc.send(message.playerControls.serialize(selfControls));
	}
	sendMousePos(angle) {
		if (this.lastAngle !== angle) this.sendMessage(message.aimAngle, angle);
		this.lastAngle = angle;
	}
	static errorHandler(err) {
		//TODO: go back to main menu
		console.error(err);
		this.close();
	}
	static latencyHandler() {
		if (model.game.state !== 'playing') return;
		let param1 = document.getElementById('gui-bad-connection');
		if (Date.now() - this.lastMessage > 2000) param1.classList.remove('hidden');
		else param1.classList.add('hidden');

		if (this.lastMessage !== undefined && Date.now() - this.lastMessage > 7000) {
			this.close();
		}
	}
	static mouseAngleUpdateHandler() {
		this.sendMousePos(model.controls.mouseAngle);
	}
	static messageHandler(msg) {
		this.lastMessage = Date.now();
		switch (message.getSerializator(msg.data)) {
			case message.error: {
				let errDesc;
				switch(message.error.deserialize(msg.data)) {
					case message.error.NO_LOBBY:
						errDesc = 'This lobby doesn\'t exist anymore';//TODO: show this message in a pop-up with 'See the other servers button' to get back to the menu
						break;
					case message.error.NO_SLOT:
						errDesc = 'There\'s no slot left in the lobby';
						break;
				}
				location.hash = '';
				alert('Error:\n' + errDesc);
				break;
			}
			case message.warmup: {
				console.log('warmup');
				entities.planets.length = 0;
				entities.enemies.length = 0;
				entities.shots.length = 0;
				entities.players.length = 0;

				let val = message.warmup.deserialize(msg.data,
					entities.addPlanet,
					entities.updatePlanet,
					entities.addEnemy,
					entities.updateEnemy,
					entities.addShot,
					entities.addPlayer,
					entities.updatePlayer
				);

				model.game.setState('warmup');
				console.log(val.scoresObj);
				model.game.setScores(val.scoresObj);
				let pointsElement = document.getElementById('gui-points');
				while (pointsElement.firstChild) pointsElement.removeChild(pointsElement.firstChild); // clear score count GUI
				for (let team in val.scoresObj) {
					let teamItem = document.createElement('div');
					teamItem.id = 'gui-points-' + team;
					pointsElement.appendChild(teamItem);
				}

				console.log('my ownIdx is:', val.playerId);
				model.game.setOwnIdx(val.playerId);
				entities.universe.width = val.univWidth;
				entities.universe.height = val.univHeight;

				view.history.push(this.slaveCo.id, val.lobbyId);

				document.getElementById('menu-box').classList.add('hidden');
				document.getElementById('gui-warmup').classList.remove('hidden');
				document.getElementById('lobby-table').classList.add('hidden');
				view.views.hideScores();

				loop.start();

				break;
			}
			case message.addEntity:
				message.addEntity.deserialize(msg.data,
					entities.addPlanet,
					entities.updatePlanet,
					entities.addEnemy,
					entities.updateEnemy,
					entities.addShot,
					entities.addPlayer,
					entities.updatePlayer
				);
				view.views.updatePlayerList();
				break;
			case message.removeEntity:
				message.removeEntity.deserialize(msg.data,
					id => {//remove planets
						console.log('TODO: implement planet removal', id);
					},
					id => {//remove enemies
						console.log('TODO: implement enemy removal', id);
					},
					id => {//remove shots
						entities.deadShots.push(entities.shots[id]);
						entities.deadShots[entities.deadShots.length - 1].lifeTime = 0;
						entities.shots.splice(id, 1);
					},
					id => {//remove players
						view.chat.printChatMessage(undefined, undefined, entities.players[id].getFinalName() + ' has left the game');
						console.log('We\'re gonna remove a player');
						delete entities.players[id];
					}
				);
				view.views.updatePlayerList();
				break;
			case message.gameState: {
				let val = message.gameState.deserialize(msg.data, entities.planets.length, entities.enemies.length,
					entities.updatePlanet,
					entities.updateEnemy,
					entities.updatePlayer
				);

				model.game.setOwnHealth(val.yourHealth);
				model.game.setOwnFuel(val.yourFuel);

				Array.prototype.forEach.call(document.querySelectorAll('#gui-health div'), (element, index) => {
					let state = 'heartFilled';
					if (index * 2 + 2 <= model.game.ownHealth) state = 'heartFilled';
					else if (index * 2 + 1 === model.game.ownHealth) state = 'heartHalfFilled';
					else state = 'heartNotFilled';
					element.className = state;
				});
				let staminaElem = document.getElementById('gui-stamina');
				if (staminaElem.value !== val.yourFuel) staminaElem.value = val.yourFuel;
				break;
			}
			case message.chatBroadcast: {
				let val = message.chatBroadcast.deserialize(msg.data);
				view.chat.printChatMessage(entities.players[val.id].getFinalName(), entities.players[val.id].appearance, val.message);
				break;
			}
			case message.setNameBroadcast: {
				let val = message.setNameBroadcast.deserialize(msg.data),
					oldName = entities.players[val.id].getFinalName();
				entities.players[val.id].name = val.name;
				entities.players[val.id].homographId = val.homographId;
				view.chat.printChatMessage(undefined, undefined, '"' + oldName + '" is now known as "' + entities.players[val.id].getFinalName() + '"');
				view.chat.printPlayerList();
				break;
			}
			case message.scores: {
				console.log('scores');
				let val = message.scores.deserialize(msg.data, model.game.scores);
				model.game.setScores(val);

				if (model.game.state === 'warmup') {
					model.game.setState('playing');
					document.getElementById('gui-warmup').classList.add('hidden');
				}

				for (let team in val) {
					let element = document.getElementById('gui-points-' + team);
					if (element !== null) element.textContent = val[team];
				}
				break;
			}
			case message.displayScores: {
				console.log('displayScores');
				view.views.showScores();
				let victor = null,
					a = -Infinity,
					playerTableVictoryElement = document.getElementById('player-table');

				for (let team in model.game.scores) {
					if (model.game.scores[team] > a) {
						a = model.game.scores[team];
						victor = team;
					} else if (model.game.scores[team] === a) victor = null;
				}

				playerTableVictoryElement.textContent = !victor ? 'Tied!' : victor + ' won!';

				loop.stop();
				break;
			}
		}
	}
}
