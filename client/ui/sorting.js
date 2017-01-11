/*let lobbyTableHeaderRowElement = document.getElementById('lobby-table').firstElementChild.firstElementChild;
lobbyTableHeaderRowElement.addEventListener('click', function(e) {
	if (e.target.tagName === 'IMG') {
		switch (e.target.getAttribute('src')) {
			case '/assets/images/sort_arrow_double.svg':
				e.target.setAttribute('src', '/assets/images/sort_arrow_down.svg');
				for (let elem of lobbyTableHeaderRowElement.children) {
					let arrowImg = elem.lastElementChild;
					if (elem.lastElementChild !== null && e.target !== arrowImg) {
						arrowImg.setAttribute('src', '/assets/images/sort_arrow_double.svg');
					}
				}

				switch (e.target.previousSibling.data.trim()) {
					case 'Lobby name':
						wsClt.serverList.sort(function(a, b) {
							return b.name.trim().localeCompare(a.name.trim());
						});
						break;
					case 'Players':
						wsClt.serverList.sort(function(a, b) {
							if (a.players < b.players || a.players > b.players) return a.players < b.players ? -1 : 1;
							else return a.maxPlayers < b.maxPlayers ? -1 : a.maxPlayers > b.maxPlayers ? 1 : 0;
						});
				}
				break;
			case '/assets/images/sort_arrow_down.svg':
				e.target.setAttribute('src', '/assets/images/sort_arrow_up.svg');
				wsClt.serverList.reverse();
				break;
			case '/assets/images/sort_arrow_up.svg':
				e.target.setAttribute('src', '/assets/images/sort_arrow_down.svg');
				wsClt.serverList.reverse();
				break;
		}
		addServerRow();
	}
});*/
