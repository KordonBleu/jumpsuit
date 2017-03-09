import * as model from '../model/dialogs.js';
import { centerElement } from './views.js';


function showShadow() {
	document.getElementById('shade-box').classList.remove('hidden');
}
function hideShadow() {
	document.getElementById('shade-box').classList.add('hidden');
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
	showShadow();
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
	showShadow();
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

export function bindDialogCloseButton() {
	document.getElementById('dialog-box-close').addEventListener('click', e => {
		e.target.parentElement.classList.add('hidden');
		model.setIsModalOpen(false);
		hideShadow();
	});
}

export function showDialog(title, content) {
	model.setIsModalOpen(true);
	let dialogBox = document.getElementById('dialog-box');
	dialogBox.querySelector('h2').textContent = title;
	dialogBox.querySelector('p').innerHTML = content;
	dialogBox.classList.remove('hidden');
	showShadow();
	centerElement(dialogBox);
}
