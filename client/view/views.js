import Player from '../player.js';
import * as entities from '../model/entities.js';
import windowBox from '../windowbox.js';
import * as chat from './chat.js';
import { resourceAmount } from '../model/resource_loader.js';
import * as model from '../model/index.js';

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


/* Main menu */
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

/* Score view */
export function showScores() {
	document.getElementById('player-table').classList.remove('hidden');
}
export function hideScores() {
	document.getElementById('player-table').classList.add('hidden');
}
export function updatePlayerList() {
	const playerListElement = document.getElementById('player-list');

	while (playerListElement.firstChild) playerListElement.removeChild(playerListElement.firstChild);
	for (let player of entities.players) {
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
	windowBox.width = canvas.clientWidth / model.controls.zoomFactor;
	windowBox.height = canvas.clientHeight / model.controls.zoomFactor;

	chat.updateChatOffset();
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
