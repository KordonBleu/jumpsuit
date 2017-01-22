//import audio from './audio.js';
import resPromise from './resource_loader.js';

import * as view from './view/index.js';


resPromise.then((resources) => {
	window.resources = resources;

	view.handleHistoryState();
});
