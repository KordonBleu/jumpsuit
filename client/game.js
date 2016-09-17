import * as entities from './entities.js';
import * as ui from './ui.js';
import * as controls from './controls.js';
import * as draw from './draw.js';

let started = false;

export let animationFrameId = null,
	ownIdx = null,
	state = null,
	scores = null;

export function setState(newState) {
	state = newState;
}
export function setOwnIdx(newOwnIdx) {
	ownIdx = newOwnIdx;
}
export function setScores(newScores) {
	scores = newScores;
}
export function setAnimationFrameId(newAnimationFrameId) {
	animationFrameId = newAnimationFrameId;
}

export function start() {
	if (!started) {
		started = true;
		ui.closeMenu(entities.universe);
		controls.addInputListeners();
		if (ui.spawnMeteorsEnabled) draw.startMeteorSpawning();
		draw.loop();
	}
}
export function stop() {
	if (started) {
		started = false;
		controls.removeInputListeners();
		[].forEach.call(document.getElementById('gui-controls').querySelectorAll('img'), function(element) {
			element.removeAttribute('style');
		});
		entities.players.forEach(function(player) {
			if (player.jetpack) player.jetpackSound.stop();
		});
		ui.clearChat();
		entities.planets.length = 0;
		entities.enemies.length = 0;
		window.cancelAnimationFrame(animationFrameId);
		ui.showMenu();
	}
}
//stop();
