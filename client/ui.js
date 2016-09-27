import * as game from './game.js';
import * as audio from './audio.js';
import Planet from './planet.js';
import * as wsClt from './websockets.js';
import * as controls from './controls.js';
import * as entities from './entities.js';
import settings from './settings.js';
import { resourceAmount } from './resource_loader.js';
import * as draw from './draw.js';


let loadingProgressElem = document.getElementById('loading-progress');
loadingProgressElem.setAttribute('max', resourceAmount);
document.addEventListener('resource loaded', function loadBarHandler() {
	let newVal = parseInt(loadingProgressElem.getAttribute('value')) + 1;
	loadingProgressElem.setAttribute('value',  newVal);
	if (newVal === resourceAmount) {
		document.removeEventListener('resource loaded', loadBarHandler);
		document.getElementById('loading').classList.add('hidden'); // hide container
		document.body.removeAttribute('class');
	}
});


let chatInput = document.getElementById('gui-chat-input'),
	chatPlayerListElement = document.getElementById('gui-chat-player-list'),

	/* boxed windows */
	infoBox = document.getElementById('info-box'),
	settingsBox = document.getElementById('settings-box'),

	/* inside menu-box */
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
	keyResetElement = document.getElementById('key-reset'),
	primaryWeaponElement = document.getElementById('primary-weapon'),
	secondaryWeaponElement = document.getElementById('secondary-weapon'),
	particlesElement = document.getElementById('particle-option');


if (!navigator.userAgent.match(/(?:Firefox)|(?:Chrome)/i)) {//not Chrome nor Firefox
	document.getElementById('device-not-supported').classList.remove('hidden');
	document.getElementById('shade-box').classList.remove('hidden');
} else if (controls.isMobile) {//Chrome or Firefox mobile
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
addShowBoxListener(document.getElementById('settings-button'), settingsBox);
addShowBoxListener(menuBoxSettingsButton, settingsBox);
addShowBoxListener(document.getElementById('info-button'), infoBox);
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
function initKeyTable() {
	let keySettingsTbody = document.getElementById('key-settings-body');

	while (keySettingsTbody.firstChild) {
		keySettingsTbody.removeChild(keySettingsTbody.firstChild);
	}
	for (let {action, associatedKeys} of controls.keyMap) {
		let rowEl = document.createElement('tr'),
			actionEl = document.createElement('th');
		actionEl.textContent = action;
		rowEl.appendChild(actionEl);

		for (let key of associatedKeys) {
			let keyEl = document.createElement('td');
			keyEl.textContent = key;
			rowEl.appendChild(keyEl);
		}
		for (let i = associatedKeys.size; i < 2; ++i) {
			// add empty cells if needed
			let keyEl = document.createElement('td');
			rowEl.appendChild(keyEl);
		}

		keySettingsTbody.appendChild(rowEl);
	}
}
initKeyTable();

let selectedCell = null;
function deselectRow() {
	selectedCell.classList.remove('selected');
	selectedCell = null;
	document.getElementById('key-settings-body').classList.remove('highlight-disabled');
	document.removeEventListener('keyup', handleChangeKey);
}
function handleChangeKey(e) {
	try {
		if (selectedCell.textContent !== '') controls.keyMap.deleteKey(selectedCell.textContent);
		let action = selectedCell.parentElement.firstElementChild.textContent;
		controls.keyMap.addMapping(action, e.code);
		selectedCell.textContent = e.code;
		deselectRow();
		settings.keymap = controls.keyMap.stringify();
	} catch (err) {
		alert(err);
	}
}
document.getElementById('key-settings-body').addEventListener('click', function(e) {
	if (e.target.nodeName === 'TD') {
		if (selectedCell === e.target) deselectRow(); // user clicks again on same row
		else {
			if (selectedCell !== null) deselectRow();

			selectedCell = e.target;
			selectedCell.classList.add('selected');
			document.getElementById('key-settings-body').classList.add('highlight-disabled');
			document.addEventListener('keyup', handleChangeKey);
		}
	}
});
keyResetElement.addEventListener('click', function() {
	controls.resetKeyMap();
	initKeyTable();
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
	weaponNames = {
		Lmg: 'Borpov',
		Smg: 'Pezcak',
		Knife: 'throwable Knife',
		Shotgun: 'Azard'
	};

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
const meteorsElement = document.getElementById('meteor-option');
meteorsElement.checked = settings.meteors === 'true';
meteorsElement.addEventListener('change', (e) => {
	if (e.target.checked) draw.stopMeteorSpawning();
	settings.meteors = e.target.checked;
});
export function spawnMeteorsEnabled() {
	return meteorsElement.checked;
}
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
		for (let pid in entities.players) {
			if (entities.players[pid].name.indexOf(this.search) !== -1) filteredPlayerList.push(entities.players[pid].name);
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
	document.getElementById('gui-chat-first').style.marginTop = Math.min(0, chatElement.clientHeight - 2 - messageHeight) + 'px';
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
	return chatInput === document.activeElement;
}
export function focusChat() {
	chatInput.focus();
}
export function printPlayerList(filter) {
	if (controls.isMobile) chatPlayerListElement.dataset.desc = 'player list';
	else chatPlayerListElement.dataset.desc = 'press tab to complete a player\'s name';
	while (chatPlayerListElement.firstChild) chatPlayerListElement.removeChild(chatPlayerListElement.firstChild);
	entities.players.forEach(function(player) {
		if (filter !== '' && player.getFinalName().indexOf(filter) === -1) return;
		let li = document.createElement('li');
		li.textContent = player.getFinalName();
		li.style.color = Planet.prototype.teamColors[player.appearance];
		//if (index === ownIdx) li.style.fontWeight = 'bold';
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
	for (let player of entities.players) {
		if (player === undefined) continue;
		let newElement = document.createElement('li');
		newElement.textContent = player.getFinalName();
		playerListElement.appendChild(newElement);
	}
}

/* Sorting */
let lobbyTableHeaderRowElement = document.getElementById('lobby-table').firstElementChild.firstElementChild;
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

		let notifBox = document.getElementById('gui-message');
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
	let	canvas = document.getElementById('canvas');

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	entities.windowBox.width = canvas.clientWidth / entities.windowBox.zoomFactor;
	entities.windowBox.height = canvas.clientHeight / entities.windowBox.zoomFactor;

	updateChatOffset();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

export function closeMenu(universe) {
	let minimapCanvas = document.getElementById('gui-minimap-canvas');
	//the minimap ALWAYS has the same SURFACE, the dimensions however vary depending on the universe size
	let minimapSurface = Math.pow(150, 2),//TODO: make it relative to the window, too
	//(width)x * (height)x = minimapSurface
		unitSize = Math.sqrt(minimapSurface/(universe.width*universe.height));//in pixels
	minimapCanvas.width = unitSize*universe.width;
	minimapCanvas.height = unitSize*universe.height;

	document.getElementById('menu-box').classList.add('hidden');
}
export function showMenu() {
	document.getElementById('menu-box').classList.remove('hidden');
}
