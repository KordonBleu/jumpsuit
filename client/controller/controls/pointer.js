import * as model from '../../model/index.js';
import * as view from '../../view/index.js';
import windowBox from '../../windowbox.js';
import * as wsClt from '../../websockets.js';


view.controls.pointer.bindMouseMove(angle => {
	model.controls.setMouseAngle(angle);
});

view.controls.pointer.bindWheel(deltaY => {
	if (!view.chat.chatInUse() && !model.dialogs.modalOpen) {
		let z = Math.abs(deltaY) === deltaY ? 0.5 : 2; // 1/2 or 2/1
		windowBox.zoomFactor = Math.max(0.25, Math.min(4, windowBox.zoomFactor * z));
		view.views.resizeCanvas();
	}
});

view.controls.pointer.bindMouseDown(() => { // left click
	if (wsClt.currentConnection.alive()) {
		model.controls.selfControls['shoot'] = 1;
		wsClt.currentConnection.refreshControls(model.controls.selfControls);
	}
}, (e) => { // right click
	view.controls.pointer.startDrag(e);
});

view.controls.pointer.bindMouseUp(() => { // left click
	if (wsClt.currentConnection.alive()) {
		model.controls.selfControls['shoot'] = 0;
		wsClt.currentConnection.refreshControls(model.controls.selfControls);
	}
}, () => { // right click
	view.controls.pointer.finishDrag();
});

view.controls.pointer.setTouchcontrolsHandler((action, pressure) => {
	if (model.controls.selfControls[action] !== undefined) {
		model.controls.selfControls[action] = pressure;
		wsClt.currentConnection.refreshControls(model.controls.selfControls);
	}
});
