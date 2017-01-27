import * as model from '../../model/index.js';
import * as view from '../../view/index.js';
import * as wsClt from './websockets.js';

if (model.platform.supportsGamepad) {
	view.controls.gamepad.bindGamepadConnection(id => {
		if (model.controls.gamepadId !== null) {
			view.notif.showNotif('Gamepad connected', 'Gamepad #' + id + ' has been ignored because there is already a gamepad connected');
		} else {
			model.controls.setGamepadId(id);
			view.notif.showNotif('Gamepad connected', 'Gamepad #' + id + ' is set as controlling device');
			view.controls.gamepad.bindUpdateControls(updateControls, id);
		}
	});
	view.controls.gamepad.bindGamepadDisconnection(id => {
		view.notif.showNotif('Gamepad disconnected', 'Gamepad #' + id + ' was disconnected');
		if (model.controls.gamepadId === id) {
			clearInterval(intervalId);
			model.controls.setGamepadId(null); // TODO: if there are other gamepads use those
		}
	});
}
function updateControlsViaGamepad(usingGamepad) {
	if (usingGamepad === -1) return;
	let gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
	let g = gamepads[usingGamepad];
	if (typeof(g) !== 'undefined') {
		selfControls['jump'] = g.buttons[0].value;
		selfControls['run'] = g.buttons[1].value;
		selfControls['crouch'] = g.buttons[4].value;
		selfControls['jetpack'] = g.buttons[7].value;

		selfControls['moveLeft'] = 0;
		selfControls['moveRight'] = 0;
		if (g.axes[0] < -0.2 || g.axes[0] > 0.2) selfControls['move' + ((g.axes[0] < 0) ? 'Left' : 'Right')] = Math.abs(g.axes[0]);
		if (g.axes[2] < -0.2 || g.axes[2] > 0.2) drag.x = -canvas.width / 2 * g.axes[2];
		else drag.x = 0;
		if ((g.axes[3] < -0.2 || g.axes[3] > 0.2)) drag.y = -canvas.height / 2 * g.axes[3];
		else drag.y = 0;
		wsClt.currentConnection.refreshControls(selfControls);
	}
}
function updateControls(jump, run, crouch, jetpack, moveLeft, moveRight) {
	model.controls.selfControls.jump = jump;
	model.controls.selfControls.run = run;
	model.controls.selfControls.crouch = crouch;
	model.controls.selfControls.jetpack = jetpack;
	model.controls.selfControls.moveLeft = moveLeft;
	model.controls.selfControls.moveRight = moveRight;

	wsClt.currentConnection.refreshControls(model.control.selfControls);
}
