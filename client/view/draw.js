import * as view from '../view/index.js';
import * as model from '../model/index.js';

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};

let canvas = document.getElementById('canvas'),
	minimapCanvas = document.getElementById('gui-minimap-canvas'),
	context = canvas.getContext('2d'),
	minimapContext = minimapCanvas.getContext('2d'),
	meteors = [],
	particles = [];

let meteorSpawningIntervalId;
export function startMeteorSpawning() {
	meteorSpawningIntervalId = setInterval(function() {
		if (model.settings.meteor !== 'true') return;
		if (meteors.length > 30 || Math.random() > 0.3) return;
		let m_resources = ['meteorBig1', 'meteorMed2', 'meteorSmall1', 'meteorTiny1', 'meteorTiny2'],
			m_rand = Math.floor(m_resources.length * Math.random()),
			chosen_img = m_resources[m_rand];

		meteors.push({
			x: -window.resources[chosen_img].width,
			y: Math.map(Math.random(), 0, 1, -window.resources[chosen_img].height + 1, canvas.height - window.resources[chosen_img].height - 1),
			res: chosen_img,
			speed: Math.pow(Math.map(Math.random(), 0, 1, 0.5, 1.5), 2),
			rotAng: 0,
			rotSpeed: Math.map(Math.random(), 0, 1, -0.034, 0.034)
		});
	}, 800);
}
export function stopMeteorSpawning() {
	meteors.length = 0;
	window.clearInterval(meteorSpawningIntervalId);
}

export function draw() {
	context.clearRect(0, 0, canvas.width, canvas.height);

	//layer 0: meteors
	if (meteors.length > 0) {
		context.globalAlpha = 0.2;
		meteors.forEach(function(m, i) {
			m.x += m.speed;
			m.rotAng += m.rotSpeed;
			if (m.x - window.resources[m.res].width/2 > canvas.width) meteors.splice(i, 1);
			else view.windowBox.drawRotatedImage(context,
				window.resources[m.res],
				Math.floor(m.x),
				Math.floor(m.y),
				m.rotAng,
				window.resources[m.res].width / model.controls.zoomFactor,
				window.resources[m.res].height / model.controls.zoomFactor
			);
		});
	}
	context.globalAlpha = 1;


	//layer 1: the game

	view.controls.pointer.updateDragSmooth();
	view.windowBox.center.x = model.entities.players[model.game.ownIdx].box.center.x + view.controls.pointer.dragSmoothed.x;
	view.windowBox.center.y = model.entities.players[model.game.ownIdx].box.center.y + view.controls.pointer.dragSmoothed.y;

	//planets
	let playerInAtmos = false;
	model.entities.planets.forEach(function (planet) {
		if (model.entities.universe.collide(view.windowBox, planet.atmosBox)) planet.drawAtmos(context, view.windowBox);
		if (model.entities.universe.collide(view.windowBox, planet.box)) planet.draw(context, view.windowBox);

		if (!playerInAtmos && model.entities.universe.collide(planet.atmosBox, model.entities.players[model.game.ownIdx].box)) playerInAtmos = true;
	});
	if (playerInAtmos) view.audio.bgFilter.frequency.value = Math.min(4000, view.audio.bgFilter.frequency.value * 1.05);
	else view.audio.bgFilter.frequency.value = Math.max(200, view.audio.bgFilter.frequency.value * 0.95);

	//shots
	model.entities.shots.forEach(function (shot) {
		if (model.entities.universe.collide(view.windowBox, shot.box)) shot.draw(context, false);
	});
	model.entities.deadShots.forEach(function(shot, si) {
		if (model.entities.universe.collide(view.windowBox, shot.box)) shot.draw(context, true);
		if (++shot.lifeTime <= 60) model.entities.deadShots.splice(si, 1);
	});

	//enemies
	model.entities.enemies.forEach(function (enemy) {
		if (model.entities.universe.collide(view.windowBox, enemy.aggroBox)) enemy.drawAtmos(context, view.windowBox);
		if (model.entities.universe.collide(view.windowBox, enemy.box)) enemy.draw(context, view.windowBox);
	});

	//particles
	if (model.settings.particles === 'true') {
		particles.forEach(function(particle, index, array) {
			if (particle.update()) array.splice(index, 1);
			else view.windowBox.drawRotatedImage(context,
				window.resources['jetpackParticle'],
				view.windowBox.wrapX(particle.box.center.x),
				view.windowBox.wrapY(particle.box.center.y),
				particle.box.angle, particle.size, particle.size);
		});
	}

	//players
	context.fillStyle = '#eee';
	context.font = '22px Open Sans';
	context.textAlign = 'center';
	model.entities.players.forEach(function (player, i) {
		if (model.entities.universe.collide(view.windowBox, player.box)) player.draw(context, particles, i === model.game.ownIdx);
		if (player.panner !== undefined && player.jetpack) view.audio.setPanner(player.panner, player.box.center.x - model.entities.players[model.game.ownIdx].box.center.x, player.box.center.y - model.entities.players[model.game.ownIdx].box.center.y);
	});



	//layer 2: HUD / GUI
	//if (player.timestamps._old !== null) document.getElementById('gui-bad-connection').style['display'] = (Date.now() - player.timestamps._old >= 1000) ? 'block' : 'none';
	for (let element of document.querySelectorAll('#controls img')) {
		element.style['opacity'] = (0.3 + model.entities.players[model.game.ownIdx].controls[element.id] * 0.7);
	}

	//minimap
	minimapContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
	minimapContext.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

	model.entities.planets.forEach(function (planet) {
		minimapContext.beginPath();
		minimapContext.arc((planet.box.center.x*minimapCanvas.width/model.entities.universe.width - model.entities.players[model.game.ownIdx].box.center.x*minimapCanvas.width/model.entities.universe.width + minimapCanvas.width*1.5) % minimapCanvas.width,
		(planet.box.center.y*minimapCanvas.height/model.entities.universe.height - model.entities.players[model.game.ownIdx].box.center.y*minimapCanvas.height/model.entities.universe.height + minimapCanvas.height*1.5) % minimapCanvas.height,
			(planet.box.radius/model.entities.universe.width)*150, 0, 2*Math.PI);
		minimapContext.closePath();
		minimapContext.fillStyle = planet.color;
		minimapContext.fill();
	});

	minimapContext.fillStyle = '#f33';
	model.entities.players.forEach(function (player) {
		if (player.appearance !== model.entities.players[model.game.ownIdx].appearance) return;
		minimapContext.beginPath();
		minimapContext.arc((player.box.center.x*minimapCanvas.width/model.entities.universe.width - model.entities.players[model.game.ownIdx].box.center.x*minimapCanvas.width/model.entities.universe.width + minimapCanvas.width*1.5) % minimapCanvas.width,
			(player.box.center.y*minimapCanvas.height/model.entities.universe.height - model.entities.players[model.game.ownIdx].box.center.y*minimapCanvas.height/model.entities.universe.height + minimapCanvas.height*1.5) % minimapCanvas.height,
			2.5, 0, 2*Math.PI);
		minimapContext.closePath();
		minimapContext.fill();
	});
}
