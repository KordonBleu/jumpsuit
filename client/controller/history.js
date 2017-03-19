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
		console.log(serverId);
		if (serverId !== null) {
			let entry, slaveCo;
			for (entry of view.servers.slaveRows) {
				if (serverId === entry[0].id) {
					slaveCo = entry[0];
					break;
				}
			}
			if (slaveCo) socket.makeNewCurrentConnection(slaveCo, lobbyId);
			else {
				view.notif.showNotif('Ooops.', 'We haven\'t found the server you are looking for!');
				view.history.push();
			}
		}
	}
});

