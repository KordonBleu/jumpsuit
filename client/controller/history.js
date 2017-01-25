import * as view from '../view/index.js';
import * as wsClt from '../websockets.js';

function connect() {
	let { serverId, lobbyId } = view.history.getConnectionIds();
	if (serverId !== null) {
		try {
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
}

connect();

view.history.bindHistoryNavigation(() => {
	// wants to go to the menu
	if (wsClt.currentConnection !== undefined) wsClt.currentConnection.close();
}, () => {
	// wants to go to a game
	connect();
});
