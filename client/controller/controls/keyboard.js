import * as view from '../../view/index.js';
import * as model from '../../model/index.js';
import * as socket from '../socket.js';

view.controls.keyboard.initKeyTable();
view.controls.keyboard.setKeyResetDisabledStatus(model.controls.keyMap.compare(model.settings.defaultKeymap));

view.controls.keyboard.bindResetButton(() => {
	model.controls.resetKeyMap();
	view.controls.keyboard.initKeyTable();
	view.controls.keyboard.setKeyResetDisabledStatus(true);
});


view.controls.keyboard.bindSetKey((action, keyCode, previousKeyCode, setCellContent, deselectRow) => {
	if (!model.controls.keyMap.keyTaken(keyCode)) {
		if (previousKeyCode !== '') model.controls.keyMap.deleteKey(previousKeyCode);
		model.controls.keyMap.addMapping(action, keyCode);

		setCellContent(keyCode);
		deselectRow();

		model.settings.keymap = model.controls.keyMap.stringify();
		view.controls.keyboard.setKeyResetDisabledStatus(model.controls.keyMap.compare(model.settings.defaultKeymap));

	} else view.controls.keyboard.showKeyAssignError(keyCode);
});

view.controls.keyboard.setKeyboardHandler(e => {
	let pressure = (e.type === 'keydown') * 1;

	if (!view.chat.chatInUse() && !model.dialogs.modalOpen) {
		let triggered = model.controls.keyMap.getAction(e.code);

		if (model.controls.selfControls[triggered] !== undefined) {
			e.preventDefault();
			view.controls.keyboard.setOnscreenControlOpacity(pressure * 0.7 + 0.3, triggered);
			model.controls.selfControls[triggered] = pressure;
			socket.currentConnection.refreshControls();
		} else if (triggered === 'chat' && pressure === 1) {
			e.preventDefault();
			window.setTimeout(function() { // prevent the letter corresponding to
				view.chat.focusChat(); // the 'chat' control (most likelly 't')
			}, 0); // from being written in the chat
		}
	}
});
