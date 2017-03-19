import * as model from '../model/dialogs.js';
import * as history from './history.js';
import { centerElement } from './views.js';
import { currentConnection } from '../controller/socket.js';


let shadowHandler;
function showShadow(handler) {
	model.setIsModalOpen(true);

	let box = document.getElementById('shade-box');
	box.classList.remove('hidden');
	shadowHandler = handler;
	if (shadowHandler) box.addEventListener('click', shadowHandler);
}
function hideShadow() {
	model.setIsModalOpen(false);

	let box = document.getElementById('shade-box');
	box.classList.add('hidden');
	if (shadowHandler) box.removeEventListener('click', shadowHandler);
}

// settings
export function bindSettingsButtons(handler) {
	for (let button of document.querySelectorAll('#settings-button, #menu-box-settings-button')) {
		button.addEventListener('click', handler);
	}
}
export function bindCloseSettingsButton(handler) {
	document.getElementById('close-settings-button').addEventListener('click', handler);
}
export function openSettingsBox() {
	document.getElementById('settings-box').classList.remove('hidden');
	showShadow(closeSettingsBox);
}
export function closeSettingsBox() {
	document.getElementById('settings-box').classList.add('hidden');
	hideShadow();
}

// info
export function bindInfoButton(handler) {
	for (let button of document.querySelectorAll('#info-button, #menu-box-info-button')) {
		button.addEventListener('click', handler);
	}
}
export function bindCloseInfoButton(handler) {
	document.getElementById('close-info-button').addEventListener('click', handler);
}

export function openInfoBox() {
	document.getElementById('info-box').classList.remove('hidden');
	showShadow(closeInfoBox);
}
export function closeInfoBox() {
	document.getElementById('info-box').classList.add('hidden');
	hideShadow();
}

// leave
export function bindLeaveButtons(handler) {
	for (let button of document.querySelectorAll('#leave-button, #menu-box-leave-button')) {
		button.addEventListener('click', handler);
	}
}

// dialog
export function bindDialogCloseButton() {
	document.getElementById('dialog-box-close').addEventListener('click', e => {
		e.target.parentElement.classList.add('hidden');
		hideShadow();
	});
}
export function showDialog(title, content) {
	let dialogBox = document.getElementById('dialog-box');
	dialogBox.querySelector('h2').textContent = title;
	dialogBox.querySelector('p').innerHTML = content;
	dialogBox.classList.remove('hidden');
	showShadow();
	centerElement(dialogBox);
}

// auto connect
let autoconnectHandler, autoconnectHid, autoconnectIter;
export function bindAutoConnectSearch(handler) {
	autoconnectHandler = handler;
}

export function showAutoConnect() {
	autoconnectIter = 0;
	showShadow();
	document.getElementById('autoconnect-box').classList.remove('hidden');
	document.getElementById('autoconnect-cancel').addEventListener('click', hideAutoConnect);
	autoconnectHid = setInterval(() => {
		autoconnectHandler(++autoconnectIter);
	}, 100);
}
export function hideAutoConnect() {
	hideShadow();
	clearInterval(autoconnectHid);
	document.getElementById('autoconnect-box').classList.add('hidden');
	document.getElementById('autoconnect-cancel').removeEventListener('click', autoconnectHandler);
	if (!currentConnection) history.reset();
}
