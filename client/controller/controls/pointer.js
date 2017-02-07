import * as model from '../../model/index.js';
import * as view from '../../view/index.js';
import * as socket from '../socket.js';


view.controls.pointer.bindMouseMove(angle => {
	model.controls.setMouseAngle(angle);
});

view.controls.pointer.bindWheel(deltaY => {
	if (!view.chat.chatInUse() && !model.dialogs.modalOpen) {
		let deltaFactor = deltaY > 0 ? 0.5 : 2; // 1/2 or 2/1
		model.controls.setZoomFactor(model.controls.zoomFactor * deltaFactor);
		view.views.resizeCanvas();
	}
});

view.controls.pointer.bindMouseDown(() => { // left click
	if (socket.currentConnection.alive()) {
		model.controls.selfControls['shoot'] = 1;
		socket.currentConnection.refreshControls();
	}
}, (e) => { // right click
	view.controls.pointer.startDrag(e);
});

view.controls.pointer.bindMouseUp(() => { // left click
	if (socket.currentConnection.alive()) {
		model.controls.selfControls['shoot'] = 0;
		socket.currentConnection.refreshControls();
	}
}, () => { // right click
	view.controls.pointer.finishDrag();
});

view.controls.pointer.setTouchcontrolsHandler((action, pressure) => {
	if (model.controls.selfControls[action] !== undefined) {
		model.controls.selfControls[action] = pressure;
		socket.currentConnection.refreshControls();
	}
});
