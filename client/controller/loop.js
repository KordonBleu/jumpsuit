import * as view from '../view/index.js';
import * as engine from '../model/engine.js';
import * as model from '../model/index.js';

let animationFrameId;
let started = false;

function loop() {
	engine.doPhysicsClient(model.entities.universe, model.entities.planets, model.entities.shots, model.entities.players);
	engine.doPrediction(model.entities.universe, model.entities.players, model.entities.enemies, model.entities.shots);
	view.draw.draw();
	animationFrameId = window.requestAnimationFrame(loop);
}

export function start() {
	if (!started) {
		started = true;
		view.controls.enable();
		view.views.focusGame();
		view.draw.startMeteorSpawning();
		loop();
	}
}
export function stop() {
	if (started) {
		started = false;
		view.controls.disable();
		view.controls.onscreen.hide();
		view.audio.stopAllJetpacks();
		view.chat.clearChat();
		view.draw.stopMeteorSpawning();
		model.entities.planets.length = 0;
		model.entities.enemies.length = 0;
		window.cancelAnimationFrame(animationFrameId);
	}
}
