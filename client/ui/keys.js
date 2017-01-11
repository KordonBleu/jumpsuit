import settings from '../settings.js';
import * as controls from '../controls.js';

const keyResetElement = document.getElementById('key-reset');

function initKeyTable() {
	let keySettingsTbody = document.getElementById('key-settings-body');

	while (keySettingsTbody.firstChild) {
		keySettingsTbody.removeChild(keySettingsTbody.firstChild);
	}
	for (let {action, associatedKeys} of controls.keyMap) {
		let rowEl = document.createElement('tr'),
			actionEl = document.createElement('th');
		actionEl.textContent = action;
		rowEl.appendChild(actionEl);

		for (let key of associatedKeys) {
			let keyEl = document.createElement('td');
			keyEl.textContent = key;
			rowEl.appendChild(keyEl);
		}
		for (let i = associatedKeys.size; i < 2; ++i) {
			// add empty cells if needed
			let keyEl = document.createElement('td');
			rowEl.appendChild(keyEl);
		}

		keySettingsTbody.appendChild(rowEl);
	}

	keyResetElement.disabled = controls.keyMap.compare(settings.defaultKeymap);
}
initKeyTable();

let selectedCell = null, warnTimeoutId;
function deselectRow() {
	selectedCell.classList.remove('selected');
	selectedCell = null;
	document.getElementById('key-settings-body').classList.remove('highlight-disabled');
	document.removeEventListener('keyup', handleChangeKey);
}
function handleChangeKey(e) {
	if (!controls.keyMap.keyTaken(e.code)) {
		if (selectedCell.textContent !== '') controls.keyMap.deleteKey(selectedCell.textContent);
		let action = selectedCell.parentElement.firstElementChild.textContent;
		controls.keyMap.addMapping(action, e.code);

		selectedCell.textContent = e.code;
		deselectRow();

		settings.keymap = controls.keyMap.stringify();
		keyResetElement.disabled = controls.keyMap.compare(settings.defaultKeymap);
	} else {
		let keyInfoElement = document.getElementById('key-info');

		keyInfoElement.classList.remove('hidden');
		keyInfoElement.textContent = 'Couldn\'t assign key "' + e.code + '" to key map because it is taken!';

		if (warnTimeoutId !== undefined) clearTimeout(warnTimeoutId);
		warnTimeoutId = setTimeout(function() {
			keyInfoElement.classList.add('hidden');
		}, 5000);
	}
}
document.getElementById('key-settings-body').addEventListener('click', function(e) {
	if (e.target.nodeName === 'TD') {
		if (selectedCell === e.target) deselectRow(); // user clicks again on same row
		else {
			if (selectedCell !== null) deselectRow();

			selectedCell = e.target;
			selectedCell.classList.add('selected');
			document.getElementById('key-settings-body').classList.add('highlight-disabled');
			document.addEventListener('keyup', handleChangeKey);
		}
	}
});
keyResetElement.addEventListener('click', function() {
	controls.resetKeyMap();
	initKeyTable();
});
