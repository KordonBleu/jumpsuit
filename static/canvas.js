"use strict";

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};

var context = canvas.getContext("2d"),
	minimapContext = minimapCanvas.getContext("2d"),
	meteors = [],
	players = [],
	planets = [],
	enemies = [],
	shots = [],
	deadShots = [],
	particles = [],
	universe = new vinage.Rectangle(new vinage.Point(0, 0), null, null),//these parameters will be
	windowBox = new vinage.Rectangle(new vinage.Point(null, null), canvas.clientWidth, canvas.clientHeight),//overwritten later
	game = {
		dragStart: new vinage.Vector(0, 0),
		drag: new vinage.Vector(0, 0),
		dragSmoothed: new vinage.Vector(0,0),
		connectionProblems: false,
		animationFrameId: null,
		loadingAnimationFrameId: null,		
		start: function() {
			game.started = true;
			document.body.classList.remove("nogui");
			chatElement.classList.remove("hidden");
			chatInputContainer.classList.remove("hidden");
			guiOptionElement.classList.remove("hidden");
			healthElement.classList.remove("hidden");
			fuelElement.classList.remove("hidden");
			pointsElement.classList.remove("hidden");
			minimapCanvas.classList.remove("hidden");
			//the minimap ALWAYS has the same SURFACE, the dimensions however vary depending on the universe size
			var minimapSurface = Math.pow(150, 2),//TODO: make it relative to the window, too
			//(width)x * (height)x = minimapSurface
				unitSize = Math.sqrt(minimapSurface/(universe.width*universe.height));//in pixels

			minimapCanvas.width = unitSize*universe.width;
			minimapCanvas.height = unitSize*universe.height;
			menuBox.classList.add("hidden");
			for (let element of document.querySelectorAll("#gui-points th")) {
				element.style.display = "none";
			}
			window.addEventListener("keydown", handleInput);
			window.addEventListener("keyup", handleInput);
			window.addEventListener("touchstart", handleInputMobile);
			window.addEventListener("touchmove", handleInputMobile);
			window.addEventListener("touchend", handleInputMobile);
			loop();
		},
		stop: function() {
			game.started = false;
			window.removeEventListener("keydown", handleInput);
			window.removeEventListener("keyup", handleInput);
			window.removeEventListener("touchstart", handleInputMobile);
			window.removeEventListener("touchmove", handleInputMobile);
			window.removeEventListener("touchend", handleInputMobile);
			menuBox.classList.remove("hidden");
			[].forEach.call(controlsElement.querySelectorAll("img"), function(element) {
				element.removeAttribute("style");
			});
			players.forEach(function(player) {
				if (player.jetpack) player.jetpackSound.stop();
			});
			clearChat();
			planets.length = 0;
			enemies.length = 0;
			window.cancelAnimationFrame(this.animationFrameId);
			context.clearRect(0, 0, canvas.width, canvas.height);
		},
		started: false,
		fps: 0,
		mousePos: {x: 0, y: 0, angle: 0}
	};



windowBox.wrapX = function(entityX) {//get the position where the entity can be drawn on the screen
	return (mod(entityX + universe.width/2 - this.center.x, universe.width) -universe.width/2 + canvas.width/2 - (this.width*this.zoomFactor - this.width)/2) * this.zoomFactor;
};
windowBox.wrapY = function(entityY) {//get the position where the entity can be drawn on the screen
	return (mod(entityY + universe.height/2 - this.center.y, universe.height) -universe.height/2 + canvas.height/2 - (this.height*this.zoomFactor - this.height)/2) * this.zoomFactor;
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
	var wdt = sizeX || image.width*this.zoomFactor,
		hgt = sizeY || image.height*this.zoomFactor;
	context.drawImage(image, -(wdt / 2), -(hgt / 2), wdt, hgt);
	context.resetTransform();
};

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	windowBox.width = canvas.clientWidth / windowBox.zoomFactor;
	windowBox.height = canvas.clientHeight / windowBox.zoomFactor;

	updateChatOffset();
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


/* Load image assets */
function drawBar() {
	context.fillStyle = "#007d6c";
	context.fillRect(0, 0, ((loadProgress) / Object.keys(resList).length) * canvas.width, 15);
}
function loaderLoop() {
	context.textBaseline = "top";
	context.textAlign = "center";

	context.fillStyle = "#121012";
	context.fillRect(0, 0, canvas.width, canvas.height);

	context.fillStyle = "#eee";
	context.font = "60px Open Sans";
	context.fillText("JumpSuit", canvas.width / 2, canvas.height * 0.35);
	context.font = "28px Open Sans";
	context.fillText("A canvas game by Getkey & Fju", canvas.width / 2, canvas.height * 0.35 + 80);
	drawBar();
	game.loaderAnimationFrameId = window.requestAnimationFrame(loaderLoop);
}
loaderLoop();

var allImagesLoaded = Promise.all(imgPromises).then(function() {
	resizeHandler();
	game.stop();
	window.cancelAnimationFrame(game.loaderAnimationFrameId);
	document.body.removeAttribute("class");
	handleHistoryState();

	setMouth(resources["alienBeige_duck"], 24.443, 24.781, 15);
	setMouth(resources["alienBeige_jump"], 22.05, 26.45);
	setMouth(resources["alienBeige_stand"], 22.05, 26.5);
	setMouth(resources["alienBeige_walk1"], 25.8, 28.8);
	setMouth(resources["alienBeige_walk2"], 25.8, 28.8);

	setMouth(resources["alienBlue_duck"], 26.577, 38.755, 15);
	setMouth(resources["alienBlue_jump"], 27.75, 35.7);
	setMouth(resources["alienBlue_stand"], 27.75, 35.7);
	setMouth(resources["alienBlue_walk1"], 27.75, 37.55);
	setMouth(resources["alienBlue_walk2"], 27.75, 37.05);

	setMouth(resources["alienGreen_duck"], 25.443, 35.761, 15);
	setMouth(resources["alienGreen_jump"], 23.8, 36.1);
	setMouth(resources["alienGreen_stand"], 23.8, 36.1);
	setMouth(resources["alienGreen_walk1"], 25.556, 36.1);
	setMouth(resources["alienGreen_walk2"], 27.656, 36.1);

	setMouth(resources["alienPink_duck"], 32.05, 31, 14);
	setMouth(resources["alienPink_jump"], 30.2, 28.55);
	setMouth(resources["alienPink_stand"], 30.2, 28.4);
	setMouth(resources["alienPink_walk1"], 31.456, 30.25);
	setMouth(resources["alienPink_walk2"], 33.206, 30.25);

	setMouth(resources["alienYellow_duck"], 24.446, 37.35, 9.5);
	setMouth(resources["alienYellow_jump"], 21.8, 40.65);
	setMouth(resources["alienYellow_stand"], 21.8, 40.65);
	setMouth(resources["alienYellow_walk1"], 25.056, 40);
	setMouth(resources["alienYellow_walk2"], 26.806, 40);
});
function setMouth(body, mouthPosX, mouthPosY, mouthAngle) {
	body.mouthPosX = mouthPosX;
	body.mouthPosY = mouthPosY;
	if (mouthAngle !== undefined) body.mouthAngle = mouthAngle * Math.PI/180;//deg to rad
}

var canSpawnMeteor = true;
var meteorSpawning = setInterval(function() {
	if (!canSpawnMeteor || meteors.length > 30 || Math.random() > 0.3) return;
	var m_resources = ["meteorBig1", "meteorMed2", "meteorSmall1", "meteorTiny1", "meteorTiny2"],
		m_rand = Math.floor(m_resources.length * Math.random()),
		chosen_img = m_resources[m_rand];

	meteors[meteors.length] = {
		x: -resources[chosen_img].width,
		y: Math.map(Math.random(), 0, 1, -resources[chosen_img].height + 1, canvas.height - resources[chosen_img].height - 1),
		res: chosen_img,
		speed: Math.pow(Math.map(Math.random(), 0, 1, 0.5, 1.5), 2),
		rotAng: 0,
		rotSpeed: Math.map(Math.random(), 0, 1, -0.034, 0.034),
	};
	canSpawnMeteor = false;
}, 800);
function loop() {
	context.clearRect(0, 0, canvas.width, canvas.height);
	doPhysicsClient(universe, planets, shots, players);

	//layer 0: meteors
	if (meteorsElement.checked) {
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
	doPrediction(universe, players, enemies, shots);
	game.dragSmoothed.x = ((game.dragStart.x - game.drag.x) * 1/windowBox.zoomFactor + game.dragSmoothed.x * 4) / 5;
	game.dragSmoothed.y = ((game.dragStart.y - game.drag.y) * 1/windowBox.zoomFactor + game.dragSmoothed.y * 4) / 5;

	windowBox.center.x = players[ownIdx].box.center.x + game.dragSmoothed.x;
	windowBox.center.y = players[ownIdx].box.center.y + game.dragSmoothed.y;

	//planet
	var playerInAtmos = false;
	planets.forEach(function (planet) {
		if (universe.collide(windowBox, planet.atmosBox)) planet.drawAtmos();
		if (universe.collide(windowBox, planet.box)) planet.draw();

		if (!playerInAtmos && universe.collide(planet.atmosBox, players[ownIdx].box)) playerInAtmos = true;
	});
	if(playerInAtmos) bgFilter.frequency.value = Math.min(4000, bgFilter.frequency.value * 1.05);
	else bgFilter.frequency.value = Math.max(200, bgFilter.frequency.value * 0.95);

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
	if (particlesElement.checked) {
		particles.forEach(function(particle, index, array) {
			if (particle.update()) array.splice(index, 1);
			else windowBox.drawRotatedImage(resources["jetpackParticle"],
				windowBox.wrapX(particle.box.center.x),
				windowBox.wrapY(particle.box.center.y),
				particle.box.angle, particle.size, particle.size);
		});
	}

	//players
	context.fillStyle = "#eee";
	context.font = "22px Open Sans";
	context.textAlign = "center";
	players.forEach(function (player, i) {
		if (universe.collide(windowBox, player.box)) player.draw(i !== ownIdx);
		if (player.panner !== undefined && player.jetpack) setPanner(player.panner, player.box.center.x - players[ownIdx].box.center.x, player.box.center.y - players[ownIdx].box.center.y);
	});



	//layer 2: HUD / GUI
	//if (player.timestamps._old !== null) document.getElementById("gui-bad-connection").style["display"] = (Date.now() - player.timestamps._old >= 1000) ? "block" : "none";
	for (let element of document.querySelectorAll("#controls img")) {
		element.style["opacity"] = (0.3 + players[ownIdx].controls[element.id] * 0.7);
	}

	//minimap	
	minimapContext.fillStyle = "rgba(0, 0, 0, 0.7)";
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

	minimapContext.fillStyle = "#f33";
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

class Particle {
	constructor(size, startX, startY, velocityX, velocityY, lifetime) {
		this.box = new vinage.Rectangle(new vinage.Point(startX, startY), 0, 0, Math.random() * 2 * Math.PI);
		this.size = size;
		this.maxLifetime = lifetime;
		this.lifetime = 0;
		this.rotSpeed = Math.random() * Math.PI * 0.04;
		this.velocity = {x: velocityX || (Math.random() * 2 - 1) * 2 * Math.sin(this.box.angle), y: velocityY || (Math.random() * 2 - 1) * 2 * Math.cos(this.box.angle)};
	}
	update() {
		this.lifetime++;
		this.box.center.x += this.velocity.x;
		this.box.center.y += this.velocity.y;
		this.box.angle += this.rotSpeed;
		this.size *= 0.95;
		return this.lifetime >= this.maxLifetime;
	}
}
