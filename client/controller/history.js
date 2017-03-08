import * as view from '../view/index.js';
import * as socket from './socket.js';
import * as loop from '../controller/loop.js';
import * as entities from '../model/entities.js';


view.history.bindHistoryNavigation(state => {
	if (state === view.history.HISTORY_MENU) {
		if (socket.currentConnection !== undefined) socket.currentConnection.close();
		loop.stop();
		entities.clean();
		view.views.hideScores();
		view.chat.clearChat();
		view.views.showMenu();
	} else {
		let { serverId, lobbyId } = view.history.getConnectionIds();
		if (serverId !== null) {
			if (socket.masterSocket.servers) {
				if (serverId in socket.masterSocket.servers) socket.makeNewCurrentConnection(socket.masterSocket.servers[serverId], lobbyId);
				else view.history.push();
			}
		}
	}
});
