import * as view from '../view/index.js';
import * as model from '../model/dialogs.js';
import * as platform from '../model/platform.js';

view.dialogs.bindSettingsButtons(() => {
	model.setIsModalOpen(true);
	view.dialogs.openSettingsBox();
});
view.dialogs.bindCloseSettingsButton(() => {
	model.setIsModalOpen(false);
	view.dialogs.closeSettingsBox();
});

view.dialogs.bindInfoButton(() => {
	model.setIsModalOpen(true);
	view.dialogs.openInfoBox();
});
view.dialogs.bindCloseInfoButton(() => {
	model.setIsModalOpen(false);
	view.dialogs.closeInfoBox();
});

view.dialogs.bindLeaveButtons(() => {
	view.history.push();
});

if (platform.isUnsupported) { // neither Chrome nor Firefox
	view.dialogs.showDialog('Unsupported Device', 'We only support Chrome and Firefox on desktop for now. Or rather this game works best on those browser.<br>Please come back using one of these (on old computers, Firefox is generally faster).');
} else if (platform.isMobile) { // Chrome or Firefox mobile
	view.dialogs.showDialog('Unsupported Device', 'The game is likely not to work properly on your device. We plan to support this platform but we\'re focusing major issues and bugs. Thus the game might not work properly. At the moment, this game works best on Chrome and Firefox on desktop.<br>Please come back using one of these (on old computers, Firefox is generally faster)');
}
