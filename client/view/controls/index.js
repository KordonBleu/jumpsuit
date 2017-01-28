import * as keyboard from './keyboard.js';
import * as gamepad from './gamepad.js';
import * as pointer from './pointer.js';

export { keyboard, gamepad, pointer };

export function enable() {
	window.addEventListener('keydown', keyboard.keyboardHandler);
	window.addEventListener('keyup', keyboard.keyboardHandler);

	window.addEventListener('touchstart', pointer.handleInputMobile);
	window.addEventListener('touchmove', pointer.handleInputMobile);
	window.addEventListener('touchend', pointer.handleInputMobile);
}
export function disable() {
	window.removeEventListener('keydown', keyboard.keyboardHandler);
	window.removeEventListener('keyup', keyboard.keyboardHandler);

	window.removeEventListener('touchstart', pointer.handleInputMobile);
	window.removeEventListener('touchmove', pointer.handleInputMobile);
	window.removeEventListener('touchend', pointer.handleInputMobile);
}
