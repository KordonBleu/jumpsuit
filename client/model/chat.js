import * as entities from './entities.js';

let autocomplete = false;

export let search,
	searchIndex,
	textParts;

export function autocompleteOff() {
	autocomplete = false;
}
export function updateAutocomplete(value, selectionStart, selectionEnd) {
	if (!autocomplete) {
		autocomplete = true;

		let text = (selectionStart === 0) ? '' : value.substr(0, selectionStart);
		search = text.substr((text.lastIndexOf(' ') === -1) ? 0 : text.lastIndexOf(' ') + 1);

		searchIndex = 0;
		textParts = [value.substr(0, selectionStart - search.length), value.substr(selectionEnd)];
	} else {
		searchIndex++;
		if (searchIndex === getFilteredPlayerList().length) searchIndex = 0;
	}
}
export function getFilteredPlayerList() {
	let filteredPlayerList = [];
	for (let pid in entities.players) {
		if (entities.players[pid].name.indexOf(search) !== -1) filteredPlayerList.push(entities.players[pid].name);
	}

	return filteredPlayerList;
}
