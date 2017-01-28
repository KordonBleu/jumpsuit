import * as model from '../../model/index.js';
import * as view from '../../view/index.js';
import windowBox from '../../windowbox.js';


view.controls.mouse.bindMouseMove(angle => {
	model.controls.setMouseAngle(angle);
});

view.controls.mouse.bindWheel(deltaY => {
	if (!view.chat.chatInUse() && !model.dialogs.modalOpen) {
		let z = Math.abs(deltaY) === deltaY ? 0.5 : 2; // 1/2 or 2/1
		windowBox.zoomFactor = Math.max(0.25, Math.min(4, windowBox.zoomFactor * z));
		view.views.resizeCanvas();
	}
});
