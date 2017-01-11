/*let searchInput = document.getElementById('search-input'),
export function applyLobbySearch() {
	wsClt.serverList.forEach(function(lobby, index) {
		//lobbyListElement.children are reversed compared to wsClt.serverList
		let currentElem = lobbyListElement.children[wsClt.serverList.length - index - 1],
			newValue = currentElem.firstChild.textContent;

		if (searchInput.value === '') currentElem.classList.remove('search-hidden');
		else {
			let regx = new RegExp(searchInput.value, 'gi'),
				match,
				offset = 0;
			while ((match = regx.exec(lobby.name)) !== null) {
				newValue = newValue.substr(0, match.index + offset) + '<u>' + newValue.substr(match.index + offset, match[0].length) + '</u>' + newValue.substr(offset + match.index + match[0].length);
				offset += 7; //<u>...</u> inserted so the string length and match indexes change
			}
			if (offset === 0) currentElem.classList.add('search-hidden');
			else currentElem.classList.remove('search-hidden');
		}
		currentElem.firstChild.innerHTML = newValue; //always set the innerHTML in order to clear highlights or re-highlight
	});
}
searchInput.addEventListener('input', applyLobbySearch);*/
