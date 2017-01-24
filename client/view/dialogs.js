import * as wsClt from '../websockets.js';
import isMobile from '../model/platform.js';

const settingsBox = document.getElementById('settings-box'),
	menuBoxSettingsButton = document.getElementById('menu-box-settings-button'),
	infoBox = document.getElementById('info-box'),
	menuBoxInfoButton = document.getElementById('menu-box-info-button');

/* Position fix: settings-box and info-box become blurry due decimal number in CSS's transform */
window.addEventListener('resize', resizeHandler);
function resizeHandler() {
	for (let element of document.querySelectorAll('#settings-box, #info-box, #blocked-port-box, #device-not-supported, #device-untested')) {
		element.style['margin-top'] = Math.round(element.clientHeight * -0.5) + 'px';
		element.style['margin-left'] = Math.round(element.clientWidth * -0.5) + 'px';
	}
}

resizeHandler();
/* Buttons */
function addShowBoxListener(button, dialogBox) {
	button.addEventListener('click', function() {
		dialogBox.classList.remove('hidden');
		document.getElementById('shade-box').classList.remove('hidden');
	});
}
// every HTML element with a 'close-parent' class (generally a 'Close' button) will, when clicked, close the dialog it is part of
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


/* Unsupported/untested dialog box */
if (!navigator.userAgent.match(/(?:Firefox)|(?:Chrome)/i)) { // neither Chrome nor Firefox
	document.getElementById('device-not-supported').classList.remove('hidden');
	document.getElementById('shade-box').classList.remove('hidden');
} else if (isMobile) { // Chrome or Firefox mobile
	document.getElementById('device-untested').classList.remove('hidden');
	document.getElementById('shade-box').classList.remove('hidden');
}
