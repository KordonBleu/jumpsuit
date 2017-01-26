import * as controls from '../../controls.js';

const keyResetElement = document.getElementById('key-reset');

export function initKeyTable() {
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
}

export function bindSetKey(handler) {
	let selectedCell = null;
	function deselectRow() {
		selectedCell.classList.remove('selected');
		selectedCell = null;
		document.getElementById('key-settings-body').classList.remove('highlight-disabled');
		document.removeEventListener('keyup', handleChangeKey);
	}
	function setCellContent(txt) {
		selectedCell.textContent = txt;
	}
	function handleChangeKey(e) {
		let action = selectedCell.parentElement.firstElementChild.textContent;
		handler(action, e.code, selectedCell.textContent, setCellContent, deselectRow);
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
}


export function setKeyResetDisabledStatus(status) {
	keyResetElement.disabled = status;
}
export function bindResetButton(handler) {
	keyResetElement.addEventListener('click', handler);
}

let warnTimeoutId;
export function showKeyAssignError(key) {
	let keyInfoElement = document.getElementById('key-info');

	keyInfoElement.classList.remove('hidden');
	keyInfoElement.textContent = 'Couldn\'t assign key "' + key + '" to key map because it is taken!';

	if (warnTimeoutId !== undefined) clearTimeout(warnTimeoutId);
	warnTimeoutId = setTimeout(function() {
		keyInfoElement.classList.add('hidden');
	}, 5000);
}
