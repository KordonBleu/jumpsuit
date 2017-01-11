import * as wsClt from '../websockets.js';

const lobbyListElement = document.getElementById('lobby-list');

let slaveRows = new Map();
export function addServerRow(slaveCo) {
	let row = document.createElement('tr'),
		serverNameTd = document.createElement('td'),
		modNameTd = document.createElement('td'),
		buttonTd = document.createElement('td'),
		button = document.createElement('button');

	serverNameTd.textContent = slaveCo.userData.serverName;
	modNameTd.textContent = slaveCo.userData.modName;

	button.textContent = 'Play!';
	button.slaveCo = slaveCo;

	buttonTd.appendChild(button);
	row.appendChild(serverNameTd);
	row.appendChild(modNameTd);
	row.appendChild(buttonTd);

	lobbyListElement.insertBefore(row, lobbyListElement.firstChild);

	slaveRows.set(slaveCo, row);
}
export function removeServer(slaveCo) {
	slaveRows.get(slaveCo).remove();
	slaveRows.delete(slaveCo);
}
lobbyListElement.addEventListener('click', function(e) {
	if (e.target.tagName === 'BUTTON') {
		if (wsClt.currentConnection !== undefined) wsClt.currentConnection.close();
		wsClt.makeNewCurrentConnection(e.target.slaveCo);
	}
});
