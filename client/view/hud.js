import * as model from '../model/index.js';

export function readyPointCounter(scoresObj) {
	let pointsElement = document.getElementById('gui-points');
	while (pointsElement.firstChild) pointsElement.removeChild(pointsElement.firstChild); // clear score count GUI
	for (let team in scoresObj) {
		let teamItem = document.createElement('div');
		teamItem.id = 'gui-points-' + team;
		pointsElement.appendChild(teamItem);
	}
}
export function updatePointCounter() {
	for (let team in model.game.scores) {
		let element = document.getElementById('gui-points-' + team);
		if (element !== null) element.textContent = model.game.scores[team];
	}
}

export function initMinimap() {
	let minimapCanvas = document.getElementById('gui-minimap-canvas');
	//the minimap ALWAYS has the same SURFACE, the dimensions however vary depending on the universe size
	let minimapSurface = Math.pow(150, 2),//TODO: make it relative to the window, too
	//(width)x * (height)x = minimapSurface
		unitSize = Math.sqrt(minimapSurface/(model.entities.universe.width*model.entities.universe.height));//in pixels
	minimapCanvas.width = unitSize*model.entities.universe.width;
	minimapCanvas.height = unitSize*model.entities.universe.height;
}

export function showWarmupStatus() {
	document.getElementById('gui-warmup').classList.remove('hidden');
}
export function hideWarmupStatus() {
	document.getElementById('gui-warmup').classList.add('hidden');
}

export function updateHealth() {
	Array.prototype.forEach.call(document.querySelectorAll('#gui-health div'), (element, index) => {
		let state = 'heartFilled';
		if (index * 2 + 2 <= model.game.ownHealth) state = 'heartFilled';
		else if (index * 2 + 1 === model.game.ownHealth) state = 'heartHalfFilled';
		else state = 'heartNotFilled';
		element.className = state;
	});
}
export function updateFuel() {
	let staminaElem = document.getElementById('gui-stamina');
	if (staminaElem.value !== model.game.ownFuel) staminaElem.value = model.game.ownFuel;
}
