import './audio.js';
import './chat.js';
import './dialogs.js';
import './history.js';
import './controls/index.js';
import './settings.js';
import './servers.js';


import resPromise from '../model/resource_loader.js';

resPromise.then((resources) => {
	window.resources = resources;

	//view.history.handleHistoryState();
});
