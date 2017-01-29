import * as view from '../view/index.js';
import * as wsClt from '../websockets.js';

view.servers.bindPlay(slaveCo => {
	if (wsClt.currentConnection !== undefined) wsClt.currentConnection.close();
	wsClt.makeNewCurrentConnection(slaveCo);
});
