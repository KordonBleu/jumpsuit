//import audio from './audio.js';
import resPromise from './resource_loader.js';

import * as wsClt from './websockets.js';


resPromise.then((resources) => {
	window.resources = resources;

	wsClt.handleHistoryState();
});
