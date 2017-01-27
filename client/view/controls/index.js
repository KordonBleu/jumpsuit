import * as keyboard from './keyboard.js';

export { keyboard };

export function enable() {
	window.addEventListener('keydown', keyboard.keyboardHandler);
	window.addEventListener('keyup', keyboard.keyboardHandler);
}
export function disable() {
	window.removeEventListener('keydown', keyboard.keyboardHandler);
	window.removeEventListener('keyup', keyboard.keyboardHandler);
}
