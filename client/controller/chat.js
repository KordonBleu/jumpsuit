import * as view from '../view/chat.js';
import * as model from '../model/chat.js';
import * as wsClt from '../websockets.js';


view.bindChatKeyDown((key, value, selectionStart, selectionEnd) => { // TODO: much of this should go to the model
	switch (key) {
		case 'Enter':
			if (!wsClt.currentConnection.alive()) return;
			wsClt.currentConnection.sendChat(value);
			view.clearChatInput();
			break;
		case 'Tab': {
			view.printPlayerList(model.search);
			model.updateAutocomplete(value, selectionStart, selectionEnd);
			view.autoComplete();
			break;
		}
		default:
			model.autocompleteOff();
			view.printPlayerList('');
	}
});
