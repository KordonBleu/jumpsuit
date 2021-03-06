import settings from './settings.js';
import * as bimap from '../../shared/bimap.js';

export let keyMap = new bimap.KeyActionMap(settings.keymap);

export function resetKeyMap() {
	delete settings.keymap;
	keyMap.parse(settings.keymap);
}

export let selfAngle = 0;

export let selfControls = {
	changeWeapon: 0,
	crouch: 0,
	jetpack: 0,
	jump: 0,
	moveLeft: 0,
	moveRight: 0,
	run: 0,
	shoot: 0
};

export function clean() {
	selfAngle = 0;
	for (let key in selfControls) {
		selfControls[key] = 0;
	}
}

export let gamepadId = null;
export function setGamepadId(newGamepadId) {
	gamepadId = newGamepadId;
}

export let zoomFactor = 1;
export function setZoomFactor(newZoomFactor) {
	zoomFactor = Math.max(0.25, Math.min(4, newZoomFactor));
}
