import * as view from '../view/index.js';
import * as model from '../model/chat.js';
import * as wsClt from './socket.js';


view.chat.bindChatKeyDown((key, value, selectionStart, selectionEnd) => { // TODO: much of this should go to the model
	switch (key) {
		case 'Enter':
			if (!wsClt.currentConnection.alive()) return;
			wsClt.currentConnection.sendChat(value);
			view.chat.clearChatInput();
			break;
		case 'Tab': {
			view.chat.printPlayerList(model.search);
			model.updateAutocomplete(value, selectionStart, selectionEnd);
			view.chat.autoComplete();
			break;
		}
		default:
			model.autocompleteOff();
			view.chat.printPlayerList('');
	}
});
