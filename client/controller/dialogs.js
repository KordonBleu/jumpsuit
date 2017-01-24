import * as view from '../view/dialogs.js';
import * as model from '../model/dialogs.js';
import * as wsClt from '../websockets.js';
import * as platform from '../model/platform.js';

view.bindSettingsButtons(() => {
	model.setIsModalOpen(true);
	view.openSettingsBox();
});

view.bindCloseSettingsButton(() => {
	model.setIsModalOpen(false);
	view.closeSettingsBox();
});


view.bindInfoButton(() => {
	model.setIsModalOpen(true);
	view.openInfoBox();
});
view.bindCloseInfoButton(() => {
	console.log('fwquy');
	model.setIsModalOpen(false);
	view.closeInfoBox();
});


view.bindLeaveButtons(() => {
	wsClt.currentConnection.close();
});


view.bindCloseUntestedBox(() => {
	model.setIsModalOpen(false);
	view.closeUntestedBox();
});

view.bindCloseUnsupportedBox(() => {
	model.setIsModalOpen(false);
	view.closeUnsupportedBox();
});

if (platform.isUnsupported) { // neither Chrome nor Firefox
	model.setIsModalOpen(true);
	view.openUnsupportedBox();
} else if (platform.isMobile) { // Chrome or Firefox mobile
	model.setIsModalOpen(true);
	view.openUntestedBox();
}

view.bindCloseBlockedPortBox(() => {
	model.setIsModalOpen(false);
	view.closeBlockedPortBox();
});
