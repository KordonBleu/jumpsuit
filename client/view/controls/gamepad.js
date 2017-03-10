/* Gamepads */

export function bindGamepadConnection(handler) {
	window.addEventListener('gamepadconnected', e => {
		handler(e.gamepad.index);
	});
}
export function bindGamepadDisconnection(handler) {
	window.addEventListener('gamepaddisconnected', e => {
		handler(e.gamepad.index);
	});
}

let intervalId = null;
export function bindUpdateControls(handler, gamepadId) {
	intervalId = setInterval(gamepadId => {
		if (gamepadId === -1) return;
		let gamepads = navigator.getGamepads ? navigator.getGamepads() : [],
			g = gamepads[gamepadId];
		if (typeof(g) !== 'undefined') {
			let moveLeft = 0,
				moveRight = 0;
			if (g.axes[0] < -0.2 || g.axes[0] > 0.2) {
				if (g.axes[0] < 0) {
					moveLeft = Math.abs(g.axes[0]);
				} else {
					moveRight = Math.abs(g.axes[0]);
				}
			}
			/*if (g.axes[2] < -0.2 || g.axes[2] > 0.2) drag.x = -canvas.width / 2 * g.axes[2];
			else drag.x = 0;
			if ((g.axes[3] < -0.2 || g.axes[3] > 0.2)) drag.y = -canvas.height / 2 * g.axes[3];
			else drag.y = 0;*/
			handler(
				g.buttons[0].value,
				g.buttons[1].value,
				g.buttons[4].value,
				moveLeft,
				moveRight
			);
		}
	}, 50, gamepadId);
}
export function unbindUpdateControls() {
	clearInterval(intervalId);
}
