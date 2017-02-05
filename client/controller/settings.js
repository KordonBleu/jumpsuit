import * as view from '../view/index.js';
import * as model from '../model/index.js';
import * as socket from './socket.js';

// name
view.settings.setName(model.settings.name);
view.settings.bindName(name => {
	model.settings.name = name;
	socket.currentConnection.setPreferences();
});

// meteors
view.settings.checkMeteors(model.settings.meteors === 'true');
view.settings.bindCheckMeteors(checked => {
	if (checked) view.draw.startMeteorSpawning();
	else view.draw.stopMeteorSpawning();

	model.settings.meteors = checked.toString();
});

// particles
view.settings.checkParticles(model.settings.particles === 'true');
view.settings.bindCheckParticles(checked => {
	model.settings.particles = checked.toString();
});
