import * as url from './url.js';

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
	if (!serverId && !lobbyId) {
		history.pushState(HISTORY_MENU, '', location.pathname);
	} else if (lobbyId) { //assumes serverId is defined too
		history.pushState(HISTORY_GAME, '', location.pathname + '#srv=' + url.encodeUint(serverId) + '&lobby=' + url.encodeUint(lobbyId));
	} else {
		history.pushState(HISTORY_GAME, '', location.pathname + '#srv=' + url.encodeUint(serverId));
	}
	navHandler(history.state);
}
export function bindHistoryNavigation(handler) {
	navHandler = handler;
	window.addEventListener('popstate', () => {
		navHandler(history.state || HISTORY_MENU);
	});
}
