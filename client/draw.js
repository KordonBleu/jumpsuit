'use strict';

import * as controls from './controls.js';
import * as ui from './ui.js';
import modulo from '../shared/modulo.js';
import * as audio from './audio.js';
import * as wsClt from './websocket_client.js';

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};

let	canvas = document.getElementById('canvas'),
	minimapCanvas = document.getElementById('gui-minimap-canvas'),
	context = canvas.getContext('2d'),
	minimapContext = minimapCanvas.getContext('2d'),
	meteors = [],
	particles = [];

export let windowBox = new vinage.Rectangle(new vinage.Point(null, null), canvas.clientWidth, canvas.clientHeight), // these parameters will be overwritten later
	universe = new vinage.Rectangle(new vinage.Point(0, 0), null, null), // these parameters will be overwritten later
	players = [],
	planets = [],
	enemies = [],
	shots = [],
	deadShots = [];

windowBox.wrapX = function(entityX) {//get the position where the entity can be drawn on the screen
	return (modulo(entityX + universe.width/2 - this.center.x, universe.width) -universe.width/2 + canvas.width/2 - (this.width*this.zoomFactor - this.width)/2) * this.zoomFactor;
};
windowBox.wrapY = function(entityY) {//get the position where the entity can be drawn on the screen
	return (modulo(entityY + universe.height/2 - this.center.y, universe.height) -universe.height/2 + canvas.height/2 - (this.height*this.zoomFactor - this.height)/2) * this.zoomFactor;
};
windowBox.zoomFactor = 1;
windowBox.strokeAtmos = function(cx, cy, r, sw) {
	context.beginPath();
	context.arc(cx, cy, r*this.zoomFactor, 0, 2 * Math.PI, false);
	context.globalAlpha = 0.1;
	context.fill();
	context.globalAlpha = 1;
	context.lineWidth = sw*this.zoomFactor;
	context.stroke();
	context.closePath();
};
windowBox.drawRotatedImage = function(image, x, y, angle, sizeX, sizeY, mirrorX, mirrorY) {
	sizeX *= this.zoomFactor;
	sizeY *= this.zoomFactor;

	context.translate(x, y);
	context.rotate(angle);
	context.scale(mirrorX === true ? -1 : 1, mirrorY === true ? -1 : 1);
	let wdt = sizeX || image.width*this.zoomFactor,
		hgt = sizeY || image.height*this.zoomFactor;
	context.drawImage(image, -(wdt / 2), -(hgt / 2), wdt, hgt);
	context.resetTransform();
};

export default function(resources, engine) {
	let game = {
		dragStart: new vinage.Vector(0, 0),
		drag: new vinage.Vector(0, 0),
		dragSmoothed: new vinage.Vector(0,0),
		connectionProblems: false,
		animationFrameId: null,
		loadingAnimationFrameId: null,
		start: function() {
			game.started = true;
			document.body.classList.remove('nogui');
			document.getElementById('gui-chat').classList.remove('hidden');
			document.getElementById('gui-chat-input-container').classList.remove('hidden');
			document.getElementById('gui-options').classList.remove('hidden'); // contains #settings-button and #info-button
			document.getElementById('gui-health').classList.remove('hidden');
			document.getElementById('gui-fuel').classList.remove('hidden');
			document.getElementById('gui-points').classList.remove('hidden');
			minimapCanvas.classList.remove('hidden');
			//the minimap ALWAYS has the same SURFACE, the dimensions however vary depending on the universe size
			let minimapSurface = Math.pow(150, 2),//TODO: make it relative to the window, too
			//(width)x * (height)x = minimapSurface
				unitSize = Math.sqrt(minimapSurface/(universe.width*universe.height));//in pixels

			minimapCanvas.width = unitSize*universe.width;
			minimapCanvas.height = unitSize*universe.height;
			document.getElementById('menu-box').classList.add('hidden');
			for (let element of document.querySelectorAll('#gui-points th')) {
				element.style.display = 'none';
			}
			window.addEventListener('keydown', controls.handleInput);
			window.addEventListener('keyup', controls.handleInput);
			window.addEventListener('touchstart', controls.handleInputMobile);
			window.addEventListener('touchmove', controls.handleInputMobile);
			window.addEventListener('touchend', controls.handleInputMobile);
			loop();
		},
		stop: function() {
			game.started = false;
			window.removeEventListener('keydown', controls.handleInput);
			window.removeEventListener('keyup', controls.handleInput);
			window.removeEventListener('touchstart', controls.handleInputMobile);
			window.removeEventListener('touchmove', controls.handleInputMobile);
			window.removeEventListener('touchend', controls.handleInputMobile);
			document.getElementById('menu-box').classList.remove('hidden');
			[].forEach.call(document.getElementById('gui-controls').querySelectorAll('img'), function(element) {
				element.removeAttribute('style');
			});
			players.forEach(function(player) {
				if (player.jetpack) player.jetpackSound.stop();
			});
			ui.clearChat();
			planets.length = 0;
			enemies.length = 0;
			window.cancelAnimationFrame(this.animationFrameId);
			context.clearRect(0, 0, canvas.width, canvas.height);
		},
		started: false,
		fps: 0,
		mousePos: {x: 0, y: 0, angle: 0}
	};

	//let allImagesLoaded = Promise.all(imgPromises).then(function() {
	//when canvas is imported it's given all resources are loaded soooo...
	ui.resizeHandler();
	game.stop();
	window.cancelAnimationFrame(game.loaderAnimationFrameId);
	document.body.removeAttribute('class');
	wsClt.handleHistoryState();
	//});

	let canSpawnMeteor = true;
	setInterval(function() {
		if (!canSpawnMeteor || meteors.length > 30 || Math.random() > 0.3) return;
		let m_resources = ['meteorBig1', 'meteorMed2', 'meteorSmall1', 'meteorTiny1', 'meteorTiny2'],
			m_rand = Math.floor(m_resources.length * Math.random()),
			chosen_img = m_resources[m_rand];

		meteors[meteors.length] = {
			x: -resources[chosen_img].width,
			y: Math.map(Math.random(), 0, 1, -resources[chosen_img].height + 1, canvas.height - resources[chosen_img].height - 1),
			res: chosen_img,
			speed: Math.pow(Math.map(Math.random(), 0, 1, 0.5, 1.5), 2),
			rotAng: 0,
			rotSpeed: Math.map(Math.random(), 0, 1, -0.034, 0.034)
		};
		canSpawnMeteor = false;
	}, 800);
	function loop() {
		context.clearRect(0, 0, canvas.width, canvas.height);
		engine.doPhysicsClient(universe, planets, shots, players);

		//layer 0: meteors
		if (document.getElementById('meteor-option').checked) {
			context.globalAlpha = 0.2;
			meteors.forEach(function(m, i) {
				canSpawnMeteor = true;
				m.x += m.speed;
				m.rotAng += m.rotSpeed;
				if (m.x - resources[m.res].width/2 > canvas.width) meteors.splice(i, 1);
				else windowBox.drawRotatedImage(resources[m.res], Math.floor(m.x), Math.floor(m.y), m.rotAng, resources[m.res].width / windowBox.zoomFactor, resources[m.res].height / windowBox.zoomFactor);
			});
		}
		context.globalAlpha = 1;
		//console.log(ownIdx, players);


		//layer 1: the game
		engine.doPrediction(universe, players, enemies, shots);
		game.dragSmoothed.x = ((game.dragStart.x - game.drag.x) * 1/windowBox.zoomFactor + game.dragSmoothed.x * 4) / 5;
		game.dragSmoothed.y = ((game.dragStart.y - game.drag.y) * 1/windowBox.zoomFactor + game.dragSmoothed.y * 4) / 5;

		windowBox.center.x = players[ownIdx].box.center.x + game.dragSmoothed.x;
		windowBox.center.y = players[ownIdx].box.center.y + game.dragSmoothed.y;

		//planet
		let playerInAtmos = false;
		planets.forEach(function (planet) {
			if (universe.collide(windowBox, planet.atmosBox)) planet.drawAtmos();
			if (universe.collide(windowBox, planet.box)) planet.draw();

			if (!playerInAtmos && universe.collide(planet.atmosBox, players[ownIdx].box)) playerInAtmos = true;
		});
		if(playerInAtmos) audio.bgFilter.frequency.value = Math.min(4000, audio.bgFilter.frequency.value * 1.05);
		else audio.bgFilter.frequency.value = Math.max(200, audio.bgFilter.frequency.value * 0.95);

		//shots
		shots.forEach(function (shot) {
			if (universe.collide(windowBox, shot.box)) shot.draw(false);
		});
		deadShots.forEach(function(shot, si) {
			if (universe.collide(windowBox, shot.box)) shot.draw(true);
			if (++shot.lifeTime <= 60) deadShots.splice(si, 1);
		});

		//enemies
		enemies.forEach(function (enemy) {
			if (universe.collide(windowBox, enemy.aggroBox)) enemy.drawAtmos();
			if (universe.collide(windowBox, enemy.box)) enemy.draw();
		});

		//particles
		if (document.getElementById('particle-option').checked) {
			particles.forEach(function(particle, index, array) {
				if (particle.update()) array.splice(index, 1);
				else windowBox.drawRotatedImage(resources['jetpackParticle'],
					windowBox.wrapX(particle.box.center.x),
					windowBox.wrapY(particle.box.center.y),
					particle.box.angle, particle.size, particle.size);
			});
		}

		//players
		context.fillStyle = '#eee';
		context.font = '22px Open Sans';
		context.textAlign = 'center';
		players.forEach(function (player, i) {
			if (universe.collide(windowBox, player.box)) player.draw(context, windowBox, particles, i !== ownIdx);
			if (player.panner !== undefined && player.jetpack) audio.setPanner(player.panner, player.box.center.x - players[ownIdx].box.center.x, player.box.center.y - players[ownIdx].box.center.y);
		});



		//layer 2: HUD / GUI
		//if (player.timestamps._old !== null) document.getElementById('gui-bad-connection').style['display'] = (Date.now() - player.timestamps._old >= 1000) ? 'block' : 'none';
		for (let element of document.querySelectorAll('#controls img')) {
			element.style['opacity'] = (0.3 + players[ownIdx].controls[element.id] * 0.7);
		}

		//minimap
		minimapContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
		minimapContext.fillRect(0, 0, minimapCanvas.width, minimapCanvas.height);

		planets.forEach(function (planet) {
			minimapContext.beginPath();
			minimapContext.arc((planet.box.center.x*minimapCanvas.width/universe.width - players[ownIdx].box.center.x*minimapCanvas.width/universe.width + minimapCanvas.width*1.5) % minimapCanvas.width,
			(planet.box.center.y*minimapCanvas.height/universe.height - players[ownIdx].box.center.y*minimapCanvas.height/universe.height + minimapCanvas.height*1.5) % minimapCanvas.height,
				(planet.box.radius/universe.width)*150, 0, 2*Math.PI);
			minimapContext.closePath();
			minimapContext.fillStyle = planet.progress.color;
			minimapContext.fill();
		});

		minimapContext.fillStyle = '#f33';
		players.forEach(function (player) {
			if (player.appearance !== players[ownIdx].appearance) return;
			minimapContext.beginPath();
			minimapContext.arc((player.box.center.x*minimapCanvas.width/universe.width - players[ownIdx].box.center.x*minimapCanvas.width/universe.width + minimapCanvas.width*1.5) % minimapCanvas.width,
				(player.box.center.y*minimapCanvas.height/universe.height - players[ownIdx].box.center.y*minimapCanvas.height/universe.height + minimapCanvas.height*1.5) % minimapCanvas.height,
				2.5, 0, 2*Math.PI);
			minimapContext.closePath();
			minimapContext.fill();
		});

		game.animationFrameId = window.requestAnimationFrame(loop);
	}
}
