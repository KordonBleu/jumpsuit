//import audio from './audio.js';
import { cltResPromise as resPromise } from './resource_loader.js';

import * as ui from './ui.js';
//TODO: set up the UI and add a progress bar for the resources

// those cannot be used until the global `resources` exists
import Shot from '../mods/capture/shot.js';
import weapon from '../mods/capture/weapon.js';
import player from '../mods/capture/player.js';
import enemy from '../mods/capture/enemy.js';
import engine from '../mods/capture/engine.js';
import draw from './draw.js';

import Planet from '../mods/capture/planet.js';

resPromise.then((resources) => {
	window.resources = resources;
	// start the game !
	// TODO: add a draw.start() or something
});
