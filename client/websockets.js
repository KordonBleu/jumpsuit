import * as view from './view/index.js';

import Connection from './connection.js';

export let masterSocket = new MasterConnection((location.protocol === 'http:' ? 'ws://' : 'wss://') + location.hostname + (location.port === '' ? '' : ':' + location.port));
masterSocket.addEventListener('slaveadded', slaveCo => {
	view.addServerRow(slaveCo);
	//TODO: view.applyLobbySearch();//in case the page was refreshed
});
masterSocket.addEventListener('slaveremoved', slaveCo => {
	view.removeServer(slaveCo);
});

export var currentConnection;

export function makeNewCurrentConnection(slaveCo, id) {
	new Connection(slaveCo, id).then((connection) => {
		currentConnection = connection;
	}).catch((err) => {
		view.showBlockedPortDialog('???'); // TODO: find out the port
		console.error(err);
	});
}
