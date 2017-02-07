function resizeHandler() { // Position fix: settings-box and info-box become blurry due decimal number in CSS's transform
	for (let element of document.querySelectorAll('#settings-box, #info-box, #blocked-port-box, #device-not-supported, #device-untested')) {
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

/* Port blocked dialog box */
export function showBlockedPortDialog(portNumber) { // TODO: adapt this code to WebRTC (since we don't get to choose manually the port)
	document.getElementById('blocked-port-box').classList.remove('hidden');
	document.getElementById('port-number').textContent = portNumber;
	showShadow();
}
export function closeBlockedPortBox() {
	document.getElementById('blocked-port-box').classList.add('hidden');
	hideShadow();
}
export function bindCloseBlockedPortBox(handler) {
	document.getElementById('close-blocked-port-box').addEventListener('click', handler);
}


// unsupported box
export function openUnsupportedBox() {
	document.getElementById('device-not-supported').classList.remove('hidden');
	showShadow();
}
export function closeUnsupportedBox() {
	document.getElementById('device-not-supported').classList.add('hidden');
	hideShadow();
}
export function bindCloseUnsupportedBox(handler) {
	document.getElementById('device-not-supported').addEventListener('click', handler);
}

// untested box
export function openUntestedBox() {
	document.getElementById('device-untested').classList.remove('hidden');
	showShadow();
}
export function closeUntestedBox() {
	document.getElementById('device-untested').classList.add('hidden');
	hideShadow();
}
export function bindCloseUntestedBox(handler) {
	document.getElementById('close-untested-box').addEventListener('click', handler);
}
