import * as view from '../view/index.js';
import * as socket from './socket.js';

view.servers.bindPlay(slaveCo => {
	if (socket.currentConnection !== undefined) socket.currentConnection.close();
	socket.makeNewCurrentConnection(slaveCo);
});
