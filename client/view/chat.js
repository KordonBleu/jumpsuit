import Planet from '../planet.js';
import * as wsClt from '../websockets.js';
import * as entities from '../entities.js';
import * as controls from '../controls.js';

const chatInput = document.getElementById('gui-chat-input'),
	chatPlayerListElement = document.getElementById('gui-chat-player-list');

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
	while (chatElement.childNodes.length > 1) chatElement.removeChild(chatElement.childNodes[1]);
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
