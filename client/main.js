//import audio from './audio.js';
import resPromise from './resource_loader.js';

import * as ui from './ui.js';
//TODO: set up the UI and add a progress bar for the resources

// those cannot be used until the global `resources` exists
import Shot from './shot.js';

import Smg from './smg.js';
import Lmg from './lmg.js';
import Shotgun from './shotgun.js';
import Knife from './knife.js';

import Player from './player.js';
import Planet from './planet.js';
import enemy from './enemy.js';
import engine from '../mods/capture/engine.js';
import draw from './draw.js';
// at some point the engine will be imported to do the user's character prediction!

resPromise.then((resources) => {
	window.resources = resources;
	// start the game !
	// TODO: add a draw.start() or something
});
