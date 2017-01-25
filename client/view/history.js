import * as url from './url.js';
//import * as wsClt from '../websockets.js';

export const HISTORY_MENU = 0,
	HISTORY_GAME = 1;

export function getConnectionIds() {
	let res = location.hash.match(new RegExp('^#srv=([' + url.escapedUrlSafeChars + ']+)(?:&lobby=([' + url.escapedUrlSafeChars + ']+))?'));
	if (res === null) {
		return {
			serverId: null,
			lobbyId: null
		};
	} else {
		let [, serverId, lobbyId] = res;
		serverId = serverId === undefined ? null : url.decodeUint(serverId);
		lobbyId = lobbyId === undefined ? null : url.decodeUint(lobbyId);

		return {
			serverId,
			lobbyId
		};
	}
}
export function push(serverId, lobbyId) {
	if (serverId === undefined && lobbyId === undefined) {
		history.pushState(HISTORY_MENU, '', location.pathname);
	} else if (lobbyId) { // assumes serverId is defined too
		history.pushState(HISTORY_GAME, '', location.pathname + '#srv=' + url.encodeUint(serverId) + '&lobby=' + url.encodeUint(lobbyId));
	} else {
		history.pushState(HISTORY_GAME, '', location.pathname + '#srv=' + url.encodeUint(serverId));
	}
}

export function bindHistoryNavigation(menuHandler, gameHandler) {
	window.addEventListener('popstate', e => {
		console.log(e);
		switch (history.state) {
			case HISTORY_GAME:
				gameHandler();
				break;
			case HISTORY_MENU:
			default: // the first entry in the list did not get to change the state
				menuHandler();
		}
	});
}
