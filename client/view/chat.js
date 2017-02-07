import Planet from '../game/planet.js';
import * as model from '../model/index.js';

const chatInput = document.getElementById('gui-chat-input'),
	chatPlayerListElement = document.getElementById('gui-chat-player-list');

export function bindChatKeyDown(handler) { // used by the controller
	chatInput.addEventListener('keydown', (e) => {
		if (e.key === 'Tab') e.preventDefault();
		handler(e.key, chatInput.value, chatInput.selectionStart, chatInput.selectionEnd);
	});
}
export function clearChatInput() {
	chatInput.value = '';
	chatInput.blur();
}
export function autoComplete() {
	let filteredPlayerList = model.chat.getFilteredPlayerList();

	if (filteredPlayerList.length !== 0) {
		let cursorPos = model.chat.textParts[0].length + filteredPlayerList[model.chat.searchIndex].length;
		chatInput.value = model.chat.textParts[0] + filteredPlayerList[model.chat.searchIndex] + model.chat.textParts[1];
		chatInput.setSelectionRange(cursorPos, cursorPos);
	}
}
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
	if (model.platform.isMobile) chatPlayerListElement.dataset.desc = 'player list';
	else chatPlayerListElement.dataset.desc = 'press tab to complete a player\'s name';
	while (chatPlayerListElement.firstChild) chatPlayerListElement.removeChild(chatPlayerListElement.firstChild);
	model.entities.players.forEach(function(player) {
		if (filter !== '' && player.getFinalName().indexOf(filter) === -1) return;
		let li = document.createElement('li');
		li.textContent = player.getFinalName();
		li.style.color = Planet.prototype.teamColors[player.appearance];
		//if (index === ownIdx) li.style.fontWeight = 'bold';
		chatPlayerListElement.appendChild(li);
	});
}
