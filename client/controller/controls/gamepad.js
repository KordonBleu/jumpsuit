import * as model from '../../model/index.js';
import * as view from '../../view/index.js';
import * as wsClt from '../../websockets.js';

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
			model.controls.setGamepadId(null); // TODO: if there are other gamepads use those
		}
	});
}
function updateControls(jump, run, crouch, jetpack, moveLeft, moveRight) {
	model.controls.selfControls.jump = jump;
	model.controls.selfControls.run = run;
	model.controls.selfControls.crouch = crouch;
	model.controls.selfControls.jetpack = jetpack;
	model.controls.selfControls.moveLeft = moveLeft;
	model.controls.selfControls.moveRight = moveRight;

	wsClt.currentConnection.refreshControls(model.controls.selfControls);
}
