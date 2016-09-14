//import audio from './audio.js';
import resPromise from './resource_loader.js';

import * as entities from './entities.js';
import * as ui from './ui.js';
import * as controls from './controls.js';
import * as draw from './draw.js';


resPromise.then((resources) => {
	window.resources = resources;
	window.game = {
		animationFrameId: null,
		started: false,
		ownIdx: null,
		start: function() {
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
});
