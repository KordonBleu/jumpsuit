import * as url from './url.js';
import * as wsClt from '../websockets.js';

export const HISTORY_MENU = 0,
	HISTORY_GAME = 1;

function connectByHash() {
	if (location.hash === '') return;
	try {
		let [, serverId, lobbyId] = location.hash.match(new RegExp('^#srv=([' + url.urlSafeChars + ']+)&lobby=([' + url.urlSafeChars + ']+)'));
		serverId = url.decodeUint(serverId);
		lobbyId = url.decodeUint(lobbyId);

		if (wsClt.currentConnection.slaveCo == wsClt.masterSocket.servers[serverId].slaveCo && wsClt.currentConnection.lobbyId == wsClt.masterSocket.servers[serverId].lobbyId) return;
		if (wsClt.currentConnection !== undefined) {
			wsClt.currentConnection.close();
		}
		wsClt.makeNewCurrentConnection(wsClt.masterSocket.servers[serverId], lobbyId);
	} catch (ex) {
		if (wsClt.currentConnection !== undefined) wsClt.currentConnection.close();
		console.log(ex, ex.stack);
	}
}
export function goToMenu() {
	history.pushState(history.HISTORY_MENU, '', '/');
}

export function handleHistoryState() {
	//modifies default history entries due hash changes
	if (location.hash !== '') history.replaceState(HISTORY_GAME, '', '/' + location.hash);
	else history.replaceState(HISTORY_MENU, '', '/');
	if (history.state === HISTORY_MENU) {
		//if navigated to / stop the game + display menu
		if (wsClt.currentConnection !== undefined) wsClt.currentConnection.close();
	} else if (history.state === HISTORY_GAME) connectByHash();
}
window.addEventListener('popstate', handleHistoryState);
