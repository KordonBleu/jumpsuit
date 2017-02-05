import * as view from '../view/index.js';
import * as socket from './socket.js';

function connect() {
	let { serverId, lobbyId } = view.history.getConnectionIds();
	if (serverId !== null) {
		try {
			if (socket.currentConnection.slaveCo == socket.masterSocket.servers[serverId].slaveCo && socket.currentConnection.lobbyId == socket.masterSocket.servers[serverId].lobbyId) return;
			if (socket.currentConnection !== undefined) {
				socket.currentConnection.close();
			}
			socket.makeNewCurrentConnection(socket.masterSocket.servers[serverId], lobbyId);
		} catch (ex) {
			if (socket.currentConnection !== undefined) socket.currentConnection.close();
			console.log(ex, ex.stack);
		}
	}
}

connect();

view.history.bindHistoryNavigation(() => {
	// wants to go to the menu
	if (socket.currentConnection !== undefined) socket.currentConnection.close();
}, () => {
	// wants to go to a game
	connect();
});
