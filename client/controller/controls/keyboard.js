import * as view from '../../view/index.js';
import * as controls from '../../controls.js';
import settings from '../../model/settings.js';

view.controls.keyboard.initKeyTable();
view.controls.keyboard.setKeyResetDisabledStatus(controls.keyMap.compare(settings.defaultKeymap));

view.controls.keyboard.bindResetButton(() => {
	controls.resetKeyMap();
	view.controls.keyboard.initKeyTable();
	view.controls.keyboard.setKeyResetDisabledStatus(true);
});


view.controls.keyboard.bindSetKey((action, keyCode, previousKeyCode, setCellContent, deselectRow) => {
	if (!controls.keyMap.keyTaken(keyCode)) {
		if (previousKeyCode !== '') controls.keyMap.deleteKey(previousKeyCode);
		controls.keyMap.addMapping(action, keyCode);

		setCellContent(keyCode);
		deselectRow();

		settings.keymap = controls.keyMap.stringify();
		view.controls.keyboard.setKeyResetDisabledStatus(controls.keyMap.compare(settings.defaultKeymap));

	} else view.controls.keyboard.showKeyAssignError(keyCode);
});
