import * as game from './game.js';
import * as entities from './entities.js';
import windowBox from './windowbox.js';
import * as controls from './controls.js';
import * as audio from './audio.js';
import * as engine from './engine.js';

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

export function loop() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	engine.doPhysicsClient(entities.universe, entities.planets, entities.shots, entities.players);

	//layer 0: meteors
	if (meteors.length > 0) {
		context.globalAlpha = 0.2;
		meteors.forEach(function(m, i) {
			m.x += m.speed;
			m.rotAng += m.rotSpeed;
			if (m.x - window.resources[m.res].width/2 > canvas.width) meteors.splice(i, 1);
			else windowBox.drawRotatedImage(context,
				window.resources[m.res],
				Math.floor(m.x),
				Math.floor(m.y),
				m.rotAng,
				window.resources[m.res].width / windowBox.zoomFactor,
				window.resources[m.res].height / windowBox.zoomFactor
			);
		});
	}
	context.globalAlpha = 1;


	//layer 1: the game
	engine.doPrediction(entities.universe, entities.players, entities.enemies, entities.shots);

	controls.updateDragSmooth(windowBox);
	windowBox.center.x = entities.players[game.ownIdx].box.center.x + controls.dragSmoothed.x;
	windowBox.center.y = entities.players[game.ownIdx].box.center.y + controls.dragSmoothed.y;

	//planets
	let playerInAtmos = false;
	entities.planets.forEach(function (planet) {
		if (entities.universe.collide(windowBox, planet.atmosBox)) planet.drawAtmos(context, windowBox);
		if (entities.universe.collide(windowBox, planet.box)) planet.draw(context, windowBox);

		if (!playerInAtmos && entities.universe.collide(planet.atmosBox, entities.players[game.ownIdx].box)) playerInAtmos = true;
	});
	if(playerInAtmos) audio.bgFilter.frequency.value = Math.min(4000, audio.bgFilter.frequency.value * 1.05);
	else audio.bgFilter.frequency.value = Math.max(200, audio.bgFilter.frequency.value * 0.95);

	//shots
	entities.shots.forEach(function (shot) {
		if (entities.universe.collide(windowBox, shot.box)) shot.draw(context, false);
	});
	entities.deadShots.forEach(function(shot, si) {
		if (entities.universe.collide(windowBox, shot.box)) shot.draw(context, true);
		if (++shot.lifeTime <= 60) entities.deadShots.splice(si, 1);
	});

	//enemies
	entities.enemies.forEach(function (enemy) {
		if (entities.universe.collide(windowBox, enemy.aggroBox)) enemy.drawAtmos(context, windowBox);
		if (entities.universe.collide(windowBox, enemy.box)) enemy.draw(context, windowBox);
	});

	//particles
	if (document.getElementById('particle-option').checked) {
		particles.forEach(function(particle, index, array) {
			if (particle.update()) array.splice(index, 1);
			else windowBox.drawRotatedImage(context,
				window.resources['jetpackParticle'],
				windowBox.wrapX(particle.box.center.x),
				windowBox.wrapY(particle.box.center.y),
				particle.box.angle, particle.size, particle.size);
		});
	}

	//players
	context.fillStyle = '#eee';
	context.font = '22px Open Sans';
	context.textAlign = 'center';
	entities.players.forEach(function (player, i) {
		if (entities.universe.collide(windowBox, player.box)) player.draw(context, particles, i === game.ownIdx);
		if (player.panner !== undefined && player.jetpack) audio.setPanner(player.panner, player.box.center.x - entities.players[game.ownIdx].box.center.x, player.box.center.y - entities.players[game.ownIdx].box.center.y);
	});



	//layer 2: HUD / GUI
	//if (player.timestamps._old !== null) document.getElementById('gui-bad-connection').style['display'] = (Date.now() - player.timestamps._old >= 1000) ? 'block' : 'none';
	for (let element of document.querySelectorAll('#controls img')) {
		element.style['opacity'] = (0.3 + entities.players[game.ownIdx].controls[element.id] * 0.7);
	}

	//minimap
	minimapContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
	minimapContext.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

	entities.planets.forEach(function (planet) {
		minimapContext.beginPath();
		minimapContext.arc((planet.box.center.x*minimapCanvas.width/entities.universe.width - entities.players[game.ownIdx].box.center.x*minimapCanvas.width/entities.universe.width + minimapCanvas.width*1.5) % minimapCanvas.width,
		(planet.box.center.y*minimapCanvas.height/entities.universe.height - entities.players[game.ownIdx].box.center.y*minimapCanvas.height/entities.universe.height + minimapCanvas.height*1.5) % minimapCanvas.height,
			(planet.box.radius/entities.universe.width)*150, 0, 2*Math.PI);
		minimapContext.closePath();
		minimapContext.fillStyle = planet.progress.color;
		minimapContext.fill();
	});

	minimapContext.fillStyle = '#f33';
	entities.players.forEach(function (player) {
		if (player.appearance !== entities.players[game.ownIdx].appearance) return;
		minimapContext.beginPath();
		minimapContext.arc((player.box.center.x*minimapCanvas.width/entities.universe.width - entities.players[game.ownIdx].box.center.x*minimapCanvas.width/entities.universe.width + minimapCanvas.width*1.5) % minimapCanvas.width,
			(player.box.center.y*minimapCanvas.height/entities.universe.height - entities.players[game.ownIdx].box.center.y*minimapCanvas.height/entities.universe.height + minimapCanvas.height*1.5) % minimapCanvas.height,
			2.5, 0, 2*Math.PI);
		minimapContext.closePath();
		minimapContext.fill();
	});

	game.setAnimationFrameId(window.requestAnimationFrame(loop));
}
