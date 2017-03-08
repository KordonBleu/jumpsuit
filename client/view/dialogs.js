import * as model from '../model/dialogs.js';

function resizeHandler() { // Position fix: settings-box and info-box become blurry due decimal number in CSS's transform
	for (let element of document.querySelectorAll('#settings-box, #info-box')) {
		element.style['margin-top'] = Math.round(element.clientHeight * -0.5) + 'px';
		element.style['margin-left'] = Math.round(element.clientWidth * -0.5) + 'px';
	}
}
window.addEventListener('resize', resizeHandler);
resizeHandler();


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


export function showDialog(title, content) {
	model.setIsModalOpen(true);
	let dialogBox = document.createElement('div'),
		titleElement = document.createElement('h2'),
		contentElement = document.createElement('p'),
		buttonElement = document.createElement('button');

	titleElement.textContent = title;
	contentElement.innerHTML = content;
	buttonElement.id = 'dialog-box-close';
	buttonElement.textContent = 'Got it';
	buttonElement.addEventListener('click', e => {
		model.setIsModalOpen(false);
		document.body.removeChild(e.target.parentElement);
		hideShadow();
	});
	dialogBox.id = 'dialog-box';
	dialogBox.appendChild(titleElement);
	dialogBox.appendChild(contentElement);
	dialogBox.appendChild(buttonElement);

	showShadow();
	document.body.appendChild(dialogBox);
	dialogBox.classList.remove('hidden');
}
