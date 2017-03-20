import * as servers from './servers.js';

let searchInput = document.getElementById('lobby-search');

export function applyLobbySearch() {
	for (let entry of servers.slaveRows) {
		let tableRow = entry[1],
			tableItem = tableRow.firstChild,
			newValue = tableItem.textContent,
			serverName = entry[0].userData.serverName;

		if (searchInput.value !== '') {
			let match, offset = 0, regex = new RegExp(searchInput.value.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&'), 'gi'); //clean RegEx
			while ((match = regex.exec(serverName)) !== null) {
				newValue = newValue.substr(0, match.index + offset) + '<u>' + newValue.substr(match.index + offset, match[0].length) + '</u>' + newValue.substr(offset + match.index + match[0].length);
				offset += 7; //<u>...</u> inserted so the string length and match indexes change
			}
			if (offset === 0) tableRow.classList.add('hidden');
			else tableRow.classList.remove('hidden');
		} else tableRow.classList.remove('hidden');

		tableItem.innerHTML = newValue;
	}
}

document.getElementById('lobby-search-reset').addEventListener('click', e => {
	e.preventDefault();
	searchInput.value = '';
});
searchInput.addEventListener('input', applyLobbySearch);
