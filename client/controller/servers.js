import * as view from '../view/index.js';
import * as socket from './socket.js';

view.servers.bindPlay(slaveCo => {
	socket.makeNewCurrentConnection(slaveCo);
});
