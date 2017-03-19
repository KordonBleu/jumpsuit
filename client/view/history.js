import * as url from './url.js';
import * as dialogs from './dialogs.js';

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

let navHandler;
export function push(serverId, lobbyId) {
	if (isNaN(serverId)) {
		if (history.state === HISTORY_MENU) return; //prevent being in menu twice
		history.pushState(HISTORY_MENU, '', location.pathname);
		navHandler(HISTORY_MENU);
	} else { //assumes serverId is defined too
		history.pushState(HISTORY_GAME, '', location.pathname + '#srv=' + url.encodeUint(serverId) + (lobbyId !== null ? '&lobby=' + url.encodeUint(lobbyId) : ''));
	}
}
export function init() {
	let ids = getConnectionIds();
	if (ids.serverId === null) history.replaceState(HISTORY_MENU, '', location.pathname);
	else dialogs.showAutoConnect();
}
export function reset() {
	history.replaceState(HISTORY_MENU, '', location.pathname);
}
export function bindHistoryNavigation(handler) {
	navHandler = handler;
	window.addEventListener('popstate', () => {
		navHandler(history.state || HISTORY_MENU);
	});
}

