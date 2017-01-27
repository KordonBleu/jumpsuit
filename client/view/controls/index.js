import * as keyboard from './keyboard.js';
import * as gamepad from './gamepad.js';
import * as mouse from './mouse.js';

export { keyboard, gamepad, mouse };

export function enable() {
	window.addEventListener('keydown', keyboard.keyboardHandler);
	window.addEventListener('keyup', keyboard.keyboardHandler);
}
export function disable() {
	window.removeEventListener('keydown', keyboard.keyboardHandler);
	window.removeEventListener('keyup', keyboard.keyboardHandler);
}
