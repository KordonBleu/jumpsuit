'use strict';

import * as audio from './audio.js';
import * as wsClt from './websocket_client.js';
import { handleInput, defaultKeymap, isMobile } from './controls.js';
import * as draw from './draw.js';
import settings from './settings.js';


// TODO: reimplement the following in HTML whith an event listener on document, triggered in the resource loader
/* Load image assets */
/* let loadProgress = 0; // TODO: fix this shit
function drawBar() {
	context.fillStyle = '#007d6c';
	context.fillRect(0, 0, ((loadProgress) / Object.keys(resList).length) * canvas.width, 15);
}
function loaderLoop() {
	context.textBaseline = 'top';
	context.textAlign = 'center';

	context.fillStyle = '#121012';
	context.fillRect(0, 0, canvas.width, canvas.height);

	context.fillStyle = '#eee';
	context.font = '60px Open Sans';
	context.fillText('JumpSuit', canvas.width / 2, canvas.height * 0.35);
	context.font = '28px Open Sans';
	context.fillText('A canvas game by Getkey & Fju', canvas.width / 2, canvas.height * 0.35 + 80);
	drawBar();
	game.loaderAnimationFrameId = window.requestAnimationFrame(loaderLoop);
}
loaderLoop(); */


let chatFirstElement = document.getElementById('gui-chat-first'),
	chatInput = document.getElementById('gui-chat-input'),
	chatPlayerListElement = document.getElementById('gui-chat-player-list'),

	notifBox = document.getElementById('gui-message'),

	/* boxed windows */
	infoBox = document.getElementById('info-box'),
	settingsBox = document.getElementById('settings-box'),

	/* inside menu-box */
	lobbyTableHeaderRowElement = document.getElementById('lobby-table').firstElementChild.firstElementChild,
	lobbyListElement = document.getElementById('lobby-list'),
	playerListElement = document.getElementById('player-list'),
	menuBoxSettingsButton = document.getElementById('menu-box-settings-button'),
	menuBoxInfoButton = document.getElementById('menu-box-info-button'),

	/* search options */
	searchInput = document.getElementById('search-input'),

	/* inside settings-box */
	nameElement = document.getElementById('name'),
	musicVolumeElement = document.getElementById('music-volume'),
	effectsVolumeElement = document.getElementById('effects-volume'),
	keySettingsElement = document.getElementById('key-settings'),
	keyResetElement = document.getElementById('key-reset'),
	primaryWeaponElement = document.getElementById('primary-weapon'),
	secondaryWeaponElement = document.getElementById('secondary-weapon'),
	particlesElement = document.getElementById('particle-option'),
	meteorsElement = document.getElementById('meteor-option'),

	/* in-game buttons */
	settingsButton = document.getElementById('settings-button'),
	infoButton = document.getElementById('info-button');


if (!navigator.userAgent.match(/(?:Firefox)|(?:Chrome)/i)) {//not Chrome nor Firefox
	document.getElementById('device-not-supported').classList.remove('hidden');
	document.getElementById('shade-box').classList.remove('hidden');
} else if (isMobile) {//Chrome or Firefox mobile
	document.getElementById('device-untested').classList.remove('hidden');
	document.getElementById('shade-box').classList.remove('hidden');
}

/* Buttons */
function addShowBoxListener(button, dialogBox) {
	button.addEventListener('click', function() {
		dialogBox.classList.remove('hidden');
		document.getElementById('shade-box').classList.remove('hidden');
	});
}
//every HTML element with a 'close-parent' class (generally a 'Close' button) will, when clicked, close the dialog it is part of
for (let button of document.getElementsByClassName('close-parent')) {
	button.addEventListener('click', function(e) {
		e.target.parentElement.classList.add('hidden');
		document.getElementById('shade-box').classList.add('hidden');
	});
}
addShowBoxListener(settingsButton, settingsBox);
addShowBoxListener(menuBoxSettingsButton, settingsBox);
addShowBoxListener(infoButton, infoBox);
addShowBoxListener(menuBoxInfoButton, infoBox);
['leave-button', 'menu-box-leave-button'].forEach(function(button) {
	document.getElementById(button).addEventListener('click', function() {
		wsClt.currentConnection.close();
		game.stop();
	});
});

export function noModalOpen() {
	function objsInvisible(elArr) {
		return elArr.every(function(element) {
			return element.classList.contains('hidden');
		});
	}

	return objsInvisible([infoBox, settingsBox]);
}

/* Port blocked dialog box */
export function showBlockedPortDialog(portNumber) {
	document.getElementById('blocked-port-box').classList.remove('hidden');
	document.getElementById('shade-box').classList.remove('hidden');
	document.getElementById('port-number').textContent = portNumber;
}


/* Audio settings */
musicVolumeElement.value = settings.volMusic;
effectsVolumeElement.value = settings.volEffects;

musicVolumeElement.addEventListener('input', function(ev) {
	audio.setMusicGain(ev.target.value);
});
effectsVolumeElement.addEventListener('input', function(ev) {
	audio.setSfxGain(ev.target.value);
});

/* Key settings */
let selectedRow = -1;
keySettingsElement.addEventListener('click', function(e) {
	function reselect(obj){
		document.removeEventListener('keydown', wrap);
		for (let row of keySettingsElement.childNodes) row.classList.remove('selected');
		if (typeof obj !== 'undefined') {
			obj.classList.add('selected');
			let nsr = [].slice.call(obj.parentNode.childNodes, 0).indexOf(obj);
			if (nsr === selectedRow) reselect();
			else selectedRow = nsr;
		} else {
			selectedRow = -1;
			document.removeEventListener('keyup', wrap);
		}
	}
	function handleChangeKey(e) {
		if (selectedRow === -1) return;
		let keyName = e.code,
			action = keySettingsElement.childNodes[selectedRow].firstChild.textContent;

		for (let key in handleInput.keyMap) {
			if (key !== keyName) continue;
			break;
		}
		if (handleInput.reverseKeyMap[action][0] === keyName) handleInput.reverseKeyMap[action].length = 1;
		else handleInput.reverseKeyMap[action][1] = handleInput.reverseKeyMap[action][0];
		handleInput.reverseKeyMap[action][0] = keyName;
		handleInput.initKeymap(true);
	}
	function wrap(nE) {
		nE.preventDefault();
		switch(nE.type) {
			case 'keydown':
				document.removeEventListener('keydown', wrap);
				document.addEventListener('keyup', wrap);
				break;
			case 'keyup':
				handleChangeKey(nE);
				reselect();
				break;
		}
	}
	if (e.target.nodeName === 'TD') {
		reselect(e.target.parentNode);
		document.addEventListener('keydown', wrap);
	}
});
keyResetElement.addEventListener('click', function() {
	handleInput.keyMap = defaultKeymap;
	handleInput.initKeymap(false);
});

/* Name */
nameElement.value = settings.name;
nameElement.addEventListener('keydown', function(e) {
	if (e.key === 'Enter') e.target.blur();
});
nameElement.addEventListener('blur', function(e) {
	settings.name = e.target.value;
	wsClt.currentConnection.setPreferences();
});

/* Weaponry */
let weaponryCycle = ['Lmg', 'Smg', 'Knife', 'Shotgun'],
	weaponNames = {Lmg: 'Borpov', Smg: 'Pezcak', Knife: 'throwable Knife', Shotgun: 'Azard'};

function setGun(element, type) {
	element.dataset.currentWeapon = type;
	element.childNodes[0].src = '/assets/images/' + type.toLowerCase() + '.svg';
	element.childNodes[1].textContent = weaponNames[type];
	if (typeof wsClt.currentConnection !== 'undefined') wsClt.currentConnection.setPreferences();
}
for (let element of document.querySelectorAll('.weapon-select')) {
	element.addEventListener('click', function() {
		let currentIndex = weaponryCycle.findIndex(function(x) { return x === element.dataset.currentWeapon; }),
			nextIndex;
		for (let offset = 1; offset !== weaponryCycle.length; offset++) {
			nextIndex = (currentIndex + offset) % weaponryCycle.length;
			let x = weaponryCycle[nextIndex];
			if (primaryWeaponElement.dataset.currentWeapon !== x && secondaryWeaponElement.dataset.currentWeapon !== x) break;
		}
		setGun(this, weaponryCycle[nextIndex]);
	});
}
setGun(primaryWeaponElement, settings.primary);
setGun(secondaryWeaponElement, settings.secondary);

/* Graphics */
meteorsElement.checked = settings.meteors === 'true';
particlesElement.checked = settings.particles === 'true';

/* Chat */
chatInput.addEventListener('keydown', function(e) {
	if (e.key === 'Enter') {
		if (!wsClt.currentConnection.alive()) return;
		wsClt.currentConnection.sendChat(this.value);
		this.value = '';
		this.blur();
	} else if (e.key === 'Tab') {
		e.preventDefault();
		if (!this.playerSelection) {
			this.playerSelection = true;
			let text = (this.selectionStart === 0) ? '' : this.value.substr(0, this.selectionStart);
			this.search = text.substr((text.lastIndexOf(' ') === -1) ? 0 : text.lastIndexOf(' ') + 1);

			this.searchIndex = 0;
			this.textParts = [this.value.substr(0, this.selectionStart - this.search.length), this.value.substr(this.selectionEnd)];
		}

		printPlayerList(this.search);

		let filteredPlayerList = [];
		for (let pid in players) {
			if (players[pid].name.indexOf(this.search) !== -1) filteredPlayerList.push(players[pid].name);
		}
		if (filteredPlayerList.length !== 0) {
			let cursorPos = this.textParts[0].length + filteredPlayerList[this.searchIndex].length;
			this.value = this.textParts[0] + filteredPlayerList[this.searchIndex] + this.textParts[1];
			chatInput.setSelectionRange(cursorPos, cursorPos);
			this.searchIndex++;
			if (this.searchIndex === filteredPlayerList.length) this.searchIndex = 0;
		}
	} else {
		this.playerSelection = false;
		printPlayerList('');
	}
});
export function printChatMessage(name, appearance, content) {
	let element = document.createElement('p'),
		nameElement = document.createElement('b'),
		textElement = document.createTextNode(content);

	if (name === undefined) element.className = 'server';
	else {
		nameElement.textContent = name + ': ';
		nameElement.className = appearance;
	}
	element.appendChild(nameElement);
	element.appendChild(textElement);
	document.getElementById('gui-chat').appendChild(element);
	updateChatOffset();
}
export function updateChatOffset(){
	let messageHeight = 0,
		chatElement = document.getElementById('gui-chat');
	for (let element of chatElement.querySelectorAll('p:not(#gui-chat-first)')) {
		messageHeight += element.clientHeight + 2;
	}
	chatFirstElement.style.marginTop = Math.min(0, chatElement.clientHeight - 2 - messageHeight) + 'px';
}
export function clearChat() {
	let chatElement = document.getElementById('gui-chat');
	while (chatElement.childNodes.length > 40) chatElement.removeChild(chatElement.childNodes[1]);
}

/* Player list */
chatInput.addEventListener('focus', function() {
	chatPlayerListElement.classList.remove('hidden');
	printPlayerList('');
});
chatInput.addEventListener('blur', function() {
	chatPlayerListElement.classList.add('hidden');
});
export function chatInUse() {
	chatInput === document.activeElement;
}
export function focusChat() {
	chatInput.focus();
}
export function printPlayerList(filter) {
	if (isMobile) chatPlayerListElement.dataset.desc = 'player list';
	else chatPlayerListElement.dataset.desc = 'press tab to complete a player\'s name';
	while (chatPlayerListElement.firstChild) chatPlayerListElement.removeChild(chatPlayerListElement.firstChild);
	players.forEach(function(player, index) {
		if (filter !== '' && player.getFinalName().indexOf(filter) === -1) return;
		let li = document.createElement('li');
		li.textContent = player.getFinalName();
		li.style.color = Planet.prototype.teamColors[player.appearance];
		if (index === ownIdx) li.style.fontWeight = 'bold';
		chatPlayerListElement.appendChild(li);
	});
}

/* Lobby list */
export function addServerRow(server) {
	let row = document.createElement('tr'),
		serverNameTd = document.createElement('td'),
		modNameTd = document.createElement('td'),
		buttonTd = document.createElement('td'),
		button = document.createElement('button');

	serverNameTd.textContent = server.name;
	modNameTd.textContent = server.mod;

	button.textContent = 'Play!';
	button.dataset.url = server.url;

	buttonTd.appendChild(button);
	row.appendChild(serverNameTd);
	row.appendChild(modNameTd);
	row.appendChild(buttonTd);

	lobbyListElement.insertBefore(row, lobbyListElement.firstChild);
	server.tr = row;
}
export function removeServer(id) {
	wsClt.serverList[id].tr.remove();
	wsClt.serverList.splice(id, 1);
}
lobbyListElement.addEventListener('click', function(e) {
	if (e.target.tagName === 'BUTTON' && e.target.dataset.url !== undefined) {
		if (wsClt.currentConnection !== undefined) wsClt.currentConnection.close();
		wsClt.makeNewCurrentConnection(e.target.dataset.url);
	}
});

/* Player list */
export function updatePlayerList() {
	while (playerListElement.firstChild) playerListElement.removeChild(playerListElement.firstChild);
	for (let player of players) {
		if (player === undefined) continue;
		let newElement = document.createElement('li');
		newElement.textContent = player.getFinalName();
		playerListElement.appendChild(newElement);
	}
}

/* Sorting */
lobbyTableHeaderRowElement.addEventListener('click', function(e) {
	if (e.target.tagName === 'IMG') {
		switch (e.target.getAttribute('src')) {
			case '/assets/images/sort_arrow_double.svg':
				e.target.setAttribute('src', '/assets/images/sort_arrow_down.svg');
				for (let elem of lobbyTableHeaderRowElement.children) {
					let arrowImg = elem.lastElementChild;
					if (elem.lastElementChild !== null && e.target !== arrowImg) {
						arrowImg.setAttribute('src', '/assets/images/sort_arrow_double.svg');
					}
				}

				switch (e.target.previousSibling.data.trim()) {
					case 'Lobby name':
						wsClt.serverList.sort(function(a, b) {
							return b.name.trim().localeCompare(a.name.trim());
						});
						break;
					case 'Players':
						wsClt.serverList.sort(function(a, b) {
							if (a.players < b.players || a.players > b.players) return a.players < b.players ? -1 : 1;
							else return a.maxPlayers < b.maxPlayers ? -1 : a.maxPlayers > b.maxPlayers ? 1 : 0;
						});
				}
				break;
			case '/assets/images/sort_arrow_down.svg':
				e.target.setAttribute('src', '/assets/images/sort_arrow_up.svg');
				wsClt.serverList.reverse();
				break;
			case '/assets/images/sort_arrow_up.svg':
				e.target.setAttribute('src', '/assets/images/sort_arrow_down.svg');
				wsClt.serverList.reverse();
				break;
		}
		addServerRow();
	}
});

/* Search filters */
export function applyLobbySearch() {
	wsClt.serverList.forEach(function(lobby, index) {
		//lobbyListElement.children are reversed compared to wsClt.serverList
		let currentElem = lobbyListElement.children[wsClt.serverList.length - index - 1],
			newValue = currentElem.firstChild.textContent;

		if (searchInput.value === '') currentElem.classList.remove('search-hidden');
		else {
			let regx = new RegExp(searchInput.value, 'gi'),
				match,
				offset = 0;
			while ((match = regx.exec(lobby.name)) !== null) {
				newValue = newValue.substr(0, match.index + offset) + '<u>' + newValue.substr(match.index + offset, match[0].length) + '</u>' + newValue.substr(offset + match.index + match[0].length);
				offset += 7; //<u>...</u> inserted so the string length and match indexes change
			}
			if (offset === 0) currentElem.classList.add('search-hidden');
			else currentElem.classList.remove('search-hidden');
		}
		currentElem.firstChild.innerHTML = newValue; //always set the innerHTML in order to clear highlights or re-highlight
	});
}
searchInput.addEventListener('input', applyLobbySearch);

export const notif = {
	previousTimeoutId: -1,
	showMessage: function(title, desc) {
		if (!title && !desc) return;
		if (notif.previousTimeoutId !== -1) clearTimeout(notif.previousTimeoutId);
		notifBox.setAttribute('data-title', title);
		notifBox.setAttribute('data-desc', desc);
		notifBox.classList.remove('hidden');
		notif.previousTimeoutId = setTimeout(function() { notifBox.classList.add('hidden'); notif.previousTimeoutId = -1; }, 4000);
	}
};

/* Position fix: settings-box and info-box become blurry due decimal number in CSS's transform */
window.addEventListener('resize', resizeHandler);
export function resizeHandler() {
	for (let element of document.querySelectorAll('#settings-box, #info-box, #blocked-port-box, #device-not-supported, #device-untested')) {
		element.style['margin-top'] = Math.round(element.clientHeight * -0.5) + 'px';
		element.style['margin-left'] = Math.round(element.clientWidth * -0.5) + 'px';
	}
}

export function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	draw.windowBox.width = canvas.clientWidth / draw.windowBox.zoomFactor;
	draw.windowBox.height = canvas.clientHeight / draw.windowBox.zoomFactor;

	updateChatOffset();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
