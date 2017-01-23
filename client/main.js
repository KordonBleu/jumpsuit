import * as controller from './controller/index.js';
import resPromise from './resource_loader.js';

import * as view from './view/index.js';


resPromise.then((resources) => {
	window.resources = resources;

	controller.init();
	view.handleHistoryState();
});
