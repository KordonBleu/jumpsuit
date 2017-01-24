import './audio.js';
import './chat.js';


import resPromise from '../model/resource_loader.js';

import * as view from '../view/index.js';


resPromise.then((resources) => {
	window.resources = resources;

	view.handleHistoryState();
});
