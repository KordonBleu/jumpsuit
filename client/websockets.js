import settings from './settings.js';
import * as game from './game.js';
import * as ui from './ui.js';

import * as controls from './controls.js';
import * as entities from './entities.js';
import * as message from '../shared/message.js';

let masterSocket = new MasterConnection('wss://' + location.hostname + (location.port === '' ? '' : ':' + location.port));
masterSocket.addEventListener('slave', slaveCo => {
	ui.addServerRow(slaveCo);
});
console.log(masterSocket);

//let masterSocket = new WebSocket('wss://' + location.hostname + (location.port === '' ? '' : ':' + location.port) + '/clients');

export let serverList;
export var currentConnection;
/*
const HISTORY_MENU = 0,
	HISTORY_GAME = 1;

let {encodeLobbyNumber, decodeLobbyNumber} = (() => {
	const pChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~!$&\'()*+,;=:@'; // https://tools.ietf.org/html/rfc3986#section-3.3
	function encodeLobbyNumber(lobbyNb) {
		let upperDigit = Math.trunc(lobbyNb/pChars.length),
			lobbyCode = pChars.charAt(lobbyNb%pChars.length);

		if (upperDigit === 0) return lobbyCode;
		else return encodeLobbyNumber(upperDigit) + lobbyCode;
	}
	function decodeLobbyNumber(lobbyCode) {
		let lobbyNb = 0;

		for (let i = 0; i !== lobbyCode.length; ++i) lobbyNb += Math.pow(pChars.length, lobbyCode.length - i -1) * pChars.indexOf(lobbyCode.charAt(i));

		return lobbyNb;
	}

	return {encodeLobbyNumber, decodeLobbyNumber};
})();

masterSocket.binaryType = 'arraybuffer';
masterSocket.addEventListener('message', msg => {
	function determineUrl(server) {
		let ip;
		if (server.ipv6.isIPv4MappedAddress()) ip = server.ipv6.toIPv4Address().toString();
		else ip = '[' + server.ipv6.toString() + ']';

		return (server.secure ? 'wss://' : 'ws://') + ip + ':' + server.port;
	}
	switch (message.getSerializator(msg.data)) {
		case message.addServers:
			console.log('Got some new servers to add ! :D');
			if (serverList === undefined) {//first time data is inserted
				serverList = message.addServers.deserialize(msg.data);
				serverList.forEach(server => {
					server.url = determineUrl(server);
					ui.addServerRow(server);
				});
				ui.applyLobbySearch();//in case the page was refreshed and the
			} else {
				let newServers = message.addServers.deserialize(msg.data);
				serverList = serverList.concat(newServers);
				newServers.forEach(server => {
					server.url = determineUrl(server);
					ui.addServerRow(server);
				});
			}
			break;
		case message.removeServers:
			console.log('I hafta remove servers :c');
			for (let id of message.removeServers.deserialize(msg.data)) {
				ui.removeServer(id);
			}
			break;
	}
});
*/

class Connection {
	constructor(slaveCo, lobbyId) {// a connection to a game server
		this.lastControls = {};
		this.lastMessage;
		this.lastAngle = 0;

		return new Promise((resolve, reject) => {
			slaveCo.createDataChannel('test').then(dc => {
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
		console.log(messageType, args);
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
		console.log(msg);
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
/*

function connectByHash() {
	if (location.hash === '') return;
	try {
		let [, ip, lobbyId] = location.hash.match(/^#srv=(s?[\d\.:a-f]*)&lobby=([ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\-\._~!$&'()\*\+,;=:@]+)/),
			protocol;
		lobbyId = decodeLobbyNumber(lobbyId);

		if (ip.startsWith('s')) {
			protocol = 'wss://';
			ip = ip.slice(1);
		} else protocol = 'ws://';

		let url = protocol + ip + '/';

		if (currentConnection !== undefined) {
			if (currentConnection.socket.url !== url) {
				currentConnection.close();
				currentConnection = makeNewCurrentConnection(url, lobbyId);
			} else if (!currentConnection.alive()) {
				currentConnection = makeNewCurrentConnection(url, lobbyId);
			}
		} else currentConnection = makeNewCurrentConnection(url, lobbyId);
	} catch (ex) {
		if (currentConnection !== undefined) currentConnection.close();
		console.log(ex, ex.stack);
	}
}*/

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
