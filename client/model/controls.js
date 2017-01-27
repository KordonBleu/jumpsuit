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
