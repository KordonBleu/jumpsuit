import * as view from '../view/index.js';
import * as platform from '../model/platform.js';
import * as socket from './socket.js';

view.dialogs.bindSettingsButtons(view.dialogs.openSettingsBox);
view.dialogs.bindCloseSettingsButton(view.dialogs.closeSettingsBox);

view.dialogs.bindInfoButton(view.dialogs.openInfoBox);
view.dialogs.bindCloseInfoButton(view.dialogs.closeInfoBox);

view.dialogs.bindLeaveButtons(() => {
	view.history.push();
});

view.dialogs.bindDialogCloseButton();

if (platform.isUnsupported) { // neither Chrome nor Firefox
	view.dialogs.showDialog('Unsupported Device', 'We only support Chrome and Firefox on desktop for now. Or rather this game works best on those browser.<br>Please come back using one of these (on old computers, Firefox is generally faster).');
} else if (platform.isMobile) { // Chrome or Firefox mobile
	view.dialogs.showDialog('Unsupported Device', 'The game is likely not to work properly on your device. We plan to support this platform but we\'re focusing major issues and bugs. Thus the game might not work properly. At the moment, this game works best on Chrome and Firefox on desktop.<br>Please come back using one of these (on old computers, Firefox is generally faster)');
}

view.dialogs.bindAutoConnectSearch((index) => {
	console.log(index);
	let { serverId, lobbyId } = view.history.getConnectionIds();
	let entry, slaveCo;
	for (entry of view.servers.slaveRows) {
		slaveCo = entry[0];
		if (serverId === slaveCo.id) {
			socket.makeNewCurrentConnection(slaveCo, lobbyId);
			view.dialogs.hideAutoConnect();
			break;
		}
	}
	if (index == 20) {
		view.notif.showNotif('Ooops.', 'We haven\'t found the server you are looking for!');
		view.dialogs.hideAutoConnect(); //quit search
	}
});
