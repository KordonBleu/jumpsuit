import Player from '../game/player.js';
import windowBox from './windowbox.js';
import * as chat from './chat.js';
import { resourceAmount } from '../model/resource_loader.js';
import * as model from '../model/index.js';
import { zoomFactor } from '../model/controls.js'; // workaround a Rollup bug because doing model.controls.zoomFactor fails

/* Resource loading view */
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


export function centerElement(element) {
	let type = element.getAttribute('center');
	if (type !== 'x') element.style['margin-top'] = Math.round(element.clientHeight * -0.5) + 'px';
	if (type !== 'y') element.style['margin-left'] = Math.round(element.clientWidth * -0.5) + 'px';
}
/* Center dialogs and windows */
function resizeHandler() {
	for (let element of document.querySelectorAll('*[center]')) centerElement(element);
}
window.addEventListener('resize', resizeHandler);
resizeHandler();

/* Main menu */
export function closeMenu() {
	document.getElementById('menu-box').classList.add('hidden');
}
export function showMenu() {
	document.getElementById('menu-box').classList.remove('hidden');
}

/* Score view */
export function showScores() {
	document.getElementById('player-table').classList.remove('hidden');
	let victor = null,
		a = -Infinity;

	for (let team in model.game.scores) {
		if (model.game.scores[team] > a) {
			a = model.game.scores[team];
			victor = team;
		} else if (model.game.scores[team] === a) victor = null;
	}

	document.getElementById('player-table').textContent = !victor ? 'Tied!' : victor + ' won!';
}
export function hideScores() {
	document.getElementById('player-table').classList.add('hidden');
}
export function updatePlayerList() {
	const playerListElement = document.getElementById('player-list');

	while (playerListElement.firstChild) playerListElement.removeChild(playerListElement.firstChild);
	for (let player of model.entities.players) {
		if (player === undefined) continue;
		let newElement = document.createElement('li');
		newElement.textContent = player.getFinalName();
		playerListElement.appendChild(newElement);
	}
}

/* Game view */
document.getElementById('gui-stamina').max = Player.prototype.maxStamina;

export function resizeCanvas() {
	let	canvas = document.getElementById('canvas');

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	windowBox.width = canvas.clientWidth / zoomFactor;
	windowBox.height = canvas.clientHeight / zoomFactor;

	chat.updateChatOffset();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
