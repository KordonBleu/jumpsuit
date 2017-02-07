import settings from './settings.js';
import * as bimap from '../../shared/bimap.js';

export let keyMap = new bimap.KeyActionMap(settings.keymap);

export function resetKeyMap() {
	delete settings.keymap;
	keyMap.parse(settings.keymap);
}

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
let lastControls = Object.assign({}, selfControls);
export function refresh() {
	Object.assign(lastControls, selfControls);
}
export function needsRefresh() {
	for (let c in selfControls) {
		if (lastControls[c] !== selfControls[c]) return true;
	}
	return false;
}

export let mouseAngle = 0;
let lastAngle = mouseAngle;
export function setMouseAngle(newAngle) {
	mouseAngle = newAngle;
}
export function angleNeedsRefresh() {
	return mouseAngle !== lastAngle;
}
export function refreshAngle() {
	lastAngle = mouseAngle;
}

export let gamepadId = null;
export function setGamepadId(newGamepadId) {
	gamepadId = newGamepadId;
}

export let zoomFactor = 1;
export function setZoomFactor(newZoomFactor) {
	zoomFactor = Math.max(0.25, Math.min(4, newZoomFactor));
}
