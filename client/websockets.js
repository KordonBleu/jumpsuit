import settings from './settings.js';
import * as game from './game.js';
import * as ui from './ui.js';

import * as controls from './controls.js';
import * as entities from './entities.js';
import * as url from './url.js';
import * as message from '../shared/message.js';

let masterSocket = new MasterConnection((location.protocol === 'http:' ? 'ws://' : 'wss://') + location.hostname + (location.port === '' ? '' : ':' + location.port));
masterSocket.addEventListener('slaveadded', slaveCo => {
	ui.addServerRow(slaveCo);
	//TODO: ui.applyLobbySearch();//in case the page was refreshed
});
masterSocket.addEventListener('slaveremoved', slaveCo => {
	ui.removeServer(slaveCo);
});

export var currentConnection;

const HISTORY_MENU = 0,
	HISTORY_GAME = 1;

class Connection {
	constructor(slaveCo, lobbyId) {// a connection to a game server
		this.lastControls = {};
		this.lastMessage;
		this.lastAngle = 0;

		this.slaveCo = slaveCo;
		this.lobbyId = lobbyId;

		return new Promise((resolve, reject) => {
			slaveCo.createDataChannel('test', {
				ordered: false,
				protocol: 'JumpSuit'
			}).then(dc => {
				console.log(dc);

				dc.addEventListener('message', this.constructor.messageHandler.bind(this));
				dc.addEventListener('error', this.constructor.errorHandler);

				currentConnection = this;
				this.socket = dc;

				this.sendMessage.call(this, message.connect, lobbyId, settings);

				this.latencyHandlerId = setInterval(this.constructor.latencyHandler, 100);
				this.mouseAngleUpdateHandlerId = setInterval(this.constructor.mouseAngleUpdateHandler.bind(this), 80);

				resolve(this);
			}).catch(reject);
		});

		/*return new Promise((resolve, reject) => {
			try {
				this.socket = new WebSocket(url);
			} catch (err) {
				reject(err);
				ui.showBlockedPortDialog(url.match(/:(\d+)/)[1]);
			}
			this.socket.binaryType = 'arraybuffer';
			this.socket.addEventListener('error', this.constructor.errorHandler);
			this.socket.addEventListener('message', this.constructor.messageHandler.bind(this));

			this.socket.addEventListener('open', () => {
				this.sendMessage.call(this, message.connect, lobbyId, settings);

				this.latencyHandlerId = setInterval(this.constructor.latencyHandler, 100);
				this.mouseAngleUpdateHandlerId = setInterval(this.constructor.mouseAngleUpdateHandler.bind(this), 80);

				resolve(this);
			});
		});*/
	}
	alive() {
		return this.socket.readyState === 1;
	}
	sendMessage(messageType, ...args) {
		//console.log(messageType, args);
		try {
			this.socket.send(messageType.serialize.apply(messageType, args));
		} catch(err) {
			console.log(err);
			//TODO: display 'connection lost' and get back to the main menu
			//or is that redudant with the event listener on 'error'?
		}
	}
	close() { // stop the game and displays menu
		clearInterval(this.latencyHandlerId);
		clearInterval(this.mouseAngleUpdateHandlerId);
		this.socket.close();
		this.socket.removeEventListener('error', this.constructor.errorHandler);
		this.socket.removeEventListener('message', this.constructor.messageHandler);
		game.stop();
		ui.showMenu();
		entities.players.length = 0;
		document.getElementById('lobby-table').classList.remove('hidden');
		ui.hideScores();
		history.pushState(HISTORY_MENU, '', '/');
		let chatElement = document.getElementById('gui-chat');
		while (chatElement.childNodes.length > 1) chatElement.removeChild(chatElement.childNodes[1]);
	}
	setPreferences() {
		this.sendMessage(message.setPreferences, settings);
	}
	sendChat(content) {
		this.sendMessage(message.chat, content);
		ui.printChatMessage(entities.players[game.ownIdx].getFinalName(), entities.players[game.ownIdx].appearance, content);
	}
	refreshControls(selfControls) {
		let accordance = 0, b = 0; //checking if every entry is the same, if so no changes & nothing to send
		for (let c in selfControls) {
			b++;
			if (this.lastControls[c] === selfControls[c]) accordance++;
			else this.lastControls[c] = selfControls[c];
		}
		if (accordance === b) return;
		this.socket.send(message.playerControls.serialize(selfControls));
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
		if (game.state !== 'playing') return;
		let param1 = document.getElementById('gui-bad-connection');
		if (Date.now() - this.lastMessage > 2000) param1.classList.remove('hidden');
		else param1.classList.add('hidden');

		if (this.lastMessage !== undefined && Date.now() - this.lastMessage > 7000) {
			currentConnection.close();
		}
	}
	static mouseAngleUpdateHandler() {
		this.sendMousePos(controls.mouseAngle);
	}
	static messageHandler(msg) {
		console.log(message.getSerializator(msg.data));
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

				game.setState('warmup');
				console.log(val.scoresObj);
				game.setScores(val.scoresObj);
				let pointsElement = document.getElementById('gui-points');
				while (pointsElement.firstChild) pointsElement.removeChild(pointsElement.firstChild); // clear score count GUI
				for (let team in val.scoresObj) {
					let teamItem = document.createElement('div');
					teamItem.id = 'gui-points-' + team;
					pointsElement.appendChild(teamItem);
				}

				console.log('my ownIdx is:', val.playerId);
				game.setOwnIdx(val.playerId);
				entities.universe.width = val.univWidth;
				entities.universe.height = val.univHeight;

				//let hashSocket = this.socket.url.replace(/^ws(s)?\:\/\/(.+)(:?\/)$/, '$1$2');
				//location.hash = '#srv=' + hashSocket + '&lobby=' + encodeLobbyNumber(val.lobbyId);

				document.getElementById('menu-box').classList.add('hidden');
				document.getElementById('gui-warmup').classList.remove('hidden');
				document.getElementById('lobby-table').classList.add('hidden');
				ui.hideScores();

				game.start();

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
				ui.updatePlayerList();
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
						ui.printChatMessage(undefined, undefined, entities.players[id].getFinalName() + ' has left the game');
						console.log('We\'re gonna remove a player');
						delete entities.players[id];
					}
				);
				ui.updatePlayerList();
				break;
			case message.gameState: {
				let val = message.gameState.deserialize(msg.data, entities.planets.length, entities.enemies.length,
					entities.updatePlanet,
					entities.updateEnemy,
					entities.updatePlayer
				);

				game.setOwnHealth(val.yourHealth);
				game.setOwnFuel(val.yourFuel);

				Array.prototype.forEach.call(document.querySelectorAll('#gui-health div'), (element, index) => {
					let state = 'heartFilled';
					if (index * 2 + 2 <= game.ownHealth) state = 'heartFilled';
					else if (index * 2 + 1 === game.ownHealth) state = 'heartHalfFilled';
					else state = 'heartNotFilled';
					element.className = state;
				});
				let staminaElem = document.getElementById('gui-stamina');
				if (staminaElem.value !== val.yourFuel) staminaElem.value = val.yourFuel;
				break;
			}
			case message.chatBroadcast: {
				let val = message.chatBroadcast.deserialize(msg.data);
				ui.printChatMessage(entities.players[val.id].getFinalName(), entities.players[val.id].appearance, val.message);
				break;
			}
			case message.setNameBroadcast: {
				let val = message.setNameBroadcast.deserialize(msg.data),
					oldName = entities.players[val.id].getFinalName();
				entities.players[val.id].name = val.name;
				entities.players[val.id].homographId = val.homographId;
				ui.printChatMessage(undefined, undefined, '"' + oldName + '" is now known as "' + entities.players[val.id].getFinalName() + '"');
				ui.printPlayerList();
				break;
			}
			case message.scores: {
				console.log('scores');
				let val = message.scores.deserialize(msg.data, game.scores);
				game.setScores(val);

				if (game.state === 'warmup') {
					game.setState('playing');
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
				ui.showScores();
				let victor = null,
					a = -Infinity,
					playerTableVictoryElement = document.getElementById('player-table');

				for (let team in game.scores) {
					if (game.scores[team] > a) {
						a = game.scores[team];
						victor = team;
					} else if (game.scores[team] === a) victor = null;
				}

				playerTableVictoryElement.textContent = !victor ? 'Tied!' : victor + ' won!';

				game.stop();
				break;
			}
		}
	}
}

export function makeNewCurrentConnection(slaveCo, id) {
	new Connection(slaveCo, id).then((connection) => {
		currentConnection = connection;
	}).catch((err) => {
		console.error(err);
	});
}


function connectByHash() {
	if (location.hash === '') return;
	try {
		let [, serverId, lobbyId] = location.hash.match(new RegExp('^#srv=([' + url.urlSafeChars + ']+)&lobby=([' + url.urlSafeChars + ']+)'));
		serverId = url.decodeUint(serverId);
		lobbyId = url.decodeUint(lobbyId);

		if (currentConnection.slaveCo == masterSocket.servers[serverId].slaveCo && currentConnection.lobbyId == masterSocket.servers[serverId].lobbyId) return;
		if (currentConnection !== undefined) {
			currentConnection.close();
		}
		currentConnection = makeNewCurrentConnection(masterSocket.servers[serverId], lobbyId);
	} catch (ex) {
		if (currentConnection !== undefined) currentConnection.close();
		console.log(ex, ex.stack);
	}
}

export function handleHistoryState() {
	//modifies default history entries due hash changes
	if (location.hash !== '') history.replaceState(HISTORY_GAME, '', '/' + location.hash);
	else history.replaceState(HISTORY_MENU, '', '/');
	if (history.state === HISTORY_MENU) {
		//if navigated to / stop the game + display menu
		if (currentConnection !== undefined) currentConnection.close();
	} else if (history.state === HISTORY_GAME) connectByHash();
}
window.addEventListener('popstate', handleHistoryState);
