import './audio.js';
import './chat.js';
import './dialogs.js';
import './history.js';


import resPromise from '../model/resource_loader.js';

resPromise.then((resources) => {
	window.resources = resources;

	//view.history.handleHistoryState();
});
