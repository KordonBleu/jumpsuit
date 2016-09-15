//import audio from './audio.js';
import resPromise from './resource_loader.js';

import * as entities from './entities.js';
import * as ui from './ui.js';
import * as controls from './controls.js';
import * as draw from './draw.js';
import * as wsClt from './websocket_client.js';


resPromise.then((resources) => {
	window.resources = resources;
	window.game = { // this should eventually be moved to a module
		animationFrameId: null,
		started: false,
		ownIdx: null,
		start: function() {
			console.log('game started');
			this.started = true;
			ui.closeMenu(entities.universe);
			controls.addInputListeners();
			draw.loop();
		},
		stop: function() {
			this.started = false;
			controls.removeInputListeners();
			[].forEach.call(document.getElementById('gui-controls').querySelectorAll('img'), function(element) {
				element.removeAttribute('style');
			});
			entities.players.forEach(function(player) {
				if (player.jetpack) player.jetpackSound.stop();
			});
			ui.clearChat();
			entities.planets.length = 0;
			entities.enemies.length = 0;
			window.cancelAnimationFrame(this.animationFrameId);
		}
	};
	window.game.stop();

	wsClt.handleHistoryState();
});
