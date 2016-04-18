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
	universe = new Rectangle(new Point(0, 0), null, null),//these parameters will be
	windowBox = new Rectangle(new Point(null, null), canvas.clientWidth, canvas.clientHeight),//overwritten later
	game = {
		dragStart: new Vector(0, 0),
		drag: new Vector(0, 0),
		dragSmoothed: new Vector(0,0),
		connectionProblems: false,
		animationFrameId: null,		
		start: function() {
			game.started = true;
			chatElement.classList.remove("hidden");
			chatInputContainer.classList.remove("hidden");
			guiOptionElement.classList.remove("hidden");
			healthElement.classList.remove("hidden");
			fuelElement.classList.remove("hidden");
			pointsElement.classList.remove("hidden");
			minimapCanvas.classList.remove("hidden");
			menuBox.classList.add("hidden");
			Array.prototype.forEach.call(document.querySelectorAll("#gui-points th"), function(element){
				element.style.display = "none";
			});
			loop();
		},
		stop: function() {
			game.started = false;
			menuBox.classList.remove("hidden");
			players.forEach(function(player) {
				if (player.jetpack) player.jetpackSound.stop();
			});
			players.length = 0;
			planets.length = 0;
			enemies.length = 0;
			window.cancelAnimationFrame(this.animationFrameId);
			context.clearRect(0, 0, canvas.width, canvas.height);
		},
		started: false,
		fps: 0,
		armedWeapons: ["assaultrifle", "shotgun"],
		currentWeapon: 0
	},
	weapons = {
		sniper: {offset: 40, resource: null}, //resources will be filled when image is loaded
		shotgun: {offset: 45, resource: null},
		assaultrifle: {offset: 38, resource: null}
	}

function mod(dividend, divisor) {
	return (dividend%divisor + divisor) % divisor;
}
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
}
windowBox.drawRotatedImage = function(image, x, y, angle, mirror, sizeX, sizeY) {
	sizeX *= this.zoomFactor;
	sizeY *= this.zoomFactor;

	context.translate(x, y);
	context.rotate(angle);
	if (mirror === "x") context.scale(-1, 1);
	else if (mirror === "y") context.scale(1, -1);
	var wdt = sizeX || image.width*this.zoomFactor, hgt = sizeY || image.height*this.zoomFactor;
	context.drawImage(image, -(wdt / 2), -(hgt / 2), wdt, hgt);
	context.resetTransform();
}
Planet.prototype.draw = function() {
	var cx = windowBox.wrapX(this.box.center.x),
		cy = windowBox.wrapY(this.box.center.y);

	//draw planet
	context.beginPath();
	context.arc(cx, cy, this.box.radius*windowBox.zoomFactor, 0, 2 * Math.PI, false);
	context.closePath();
	context.fill();

	//apply texture
	windowBox.drawRotatedImage(resources["planet"], cx, cy, this.box.radius*windowBox.zoomFactor / 200 * Math.PI, false, 2*this.box.radius, 2*this.box.radius);

	//draw progress indicator
	context.beginPath();
	context.arc(cx, cy, 50*windowBox.zoomFactor, -Math.PI * 0.5, (this.progress.value / 100) * Math.PI * 2 - Math.PI * 0.5, false);
	context.lineWidth = 10*windowBox.zoomFactor;
	context.strokeStyle = "rgba(0, 0, 0, 0.2)";
	context.stroke();
	context.closePath();
}
Planet.prototype.drawAtmos = function() {
	context.fillStyle = this.progress.color;
	context.strokeStyle = context.fillStyle;

	windowBox.strokeAtmos(
		windowBox.wrapX(this.box.center.x),
		windowBox.wrapY(this.box.center.y),
		this.box.radius*1.75, 2);
}
Enemy.prototype.draw = function() {
	windowBox.drawRotatedImage(resources[this.appearance],
		windowBox.wrapX(this.box.center.x),
		windowBox.wrapY(this.box.center.y),
		this.box.angle, false);
}
Enemy.prototype.drawAtmos = function() {
	context.fillStyle = "#aaa";
	context.strokeStyle = context.fillStyle;

	windowBox.strokeAtmos(
		windowBox.wrapX(this.box.center.x),
		windowBox.wrapY(this.box.center.y),
		350, 4);
}
Shot.prototype.draw = function(dead) {
	windowBox.drawRotatedImage(resources[dead ? "laserBeamDead" : "laserBeam"],
		windowBox.wrapX(this.box.center.x),
		windowBox.wrapY(this.box.center.y),
		this.box.angle, false);
}
Player.prototype.draw = function(showName) {
	var res = resources[this.appearance + this.walkFrame],
		playerX = windowBox.wrapX(this.box.center.x),
		playerY = windowBox.wrapY(this.box.center.y);

	//name
	if (showName) {
		var distance = Math.sqrt(Math.pow(res.width, 2) + Math.pow(res.height, 2)) * 0.5 + 8;
		context.fillText(this.name, this, this - distance*windowBox.zoomFactor);
	}

	//jetpack
	var shift = this.looksLeft === true ? -windowBox.zoomFactor : windowBox.zoomFactor,
		jetpackX = playerX - shift*14*Math.sin(this.box.angle + Math.PI/2),
		jetpackY = playerY + shift*14*Math.cos(this.box.angle + Math.PI/2);

	windowBox.drawRotatedImage(resources["jetpack"], jetpackX, jetpackY, this.box.angle, false, resources["jetpack"].width*0.75, resources["jetpack"].height*0.75);
	if (this.jetpack) {
		var jetpackFireOneX = jetpackX - 53 * Math.sin(this.box.angle - Math.PI / 11)*windowBox.zoomFactor,
			jetpackFireOneY = jetpackY + 53 * Math.cos(this.box.angle - Math.PI / 11)*windowBox.zoomFactor,
			jetpackFireTwoX = jetpackX - 53 * Math.sin(this.box.angle + Math.PI / 11)*windowBox.zoomFactor,
			jetpackFireTwoY = jetpackY + 53 * Math.cos(this.box.angle + Math.PI / 11)*windowBox.zoomFactor;

		if (Math.random() < 0.6) {//TODO: this should be dependent on speed, which can be calculated with predictBox
			particles.push(new Particle(18,
				this.box.center.x - shift*14*Math.sin(this.box.angle + Math.PI/2) - 70 * Math.sin(this.box.angle - Math.PI / 11),
				this.box.center.y + shift*14*Math.cos(this.box.angle + Math.PI/2) + 70 * Math.cos(this.box.angle - Math.PI / 11),
				undefined,
				5.2 * Math.cos(this.box.angle),
				80));
			particles.push(new Particle(18,
				this.box.center.x - shift*14*Math.sin(this.box.angle + Math.PI/2) - 70 * Math.sin(this.box.angle + Math.PI / 11),
				this.box.center.y + shift*14*Math.cos(this.box.angle + Math.PI/2) + 70 * Math.cos(this.box.angle + Math.PI / 11),
				undefined,
				5.2 * Math.cos(this.box.angle),
				80));
		}

		windowBox.drawRotatedImage(resources["jetpackFire"], jetpackFireOneX, jetpackFireOneY, this.box.angle);
		windowBox.drawRotatedImage(resources["jetpackFire"], jetpackFireTwoX, jetpackFireTwoY, this.box.angle);
	}

	//weapon	
	game.armedWeapons.forEach((function (weapon, index) {
		weapon = weapons[weapon];
		var weaponX, weaponY;
		if (this.attachedPlanet === 255 && index === game.currentWeapon) {
			weaponX = playerX - shift*weapon.offset*Math.sin(this.box.angle - Math.PI / 2);
			weaponY = playerY + shift*weapon.offset*Math.cos(this.box.angle - Math.PI / 2);
			windowBox.drawRotatedImage(weapon.resource, weaponX, weaponY, this.box.angle, (!this.looksLeft ? "x" : ""), weapon.resource.width * 0.2, weapon.resource.height * 0.2);
		} else {
			weaponX = playerX + Math.abs(shift)*weapon.offset*0.5*Math.sin(this.box.angle) + shift*(20*index-10)*Math.sin(this.box.angle - Math.PI / 2);
			weaponY = playerY - Math.abs(shift)*weapon.offset*0.5*Math.cos(this.box.angle) - shift*(20*index-10)*Math.cos(this.box.angle - Math.PI / 2);
			windowBox.drawRotatedImage(weapon.resource, weaponX, weaponY, this.box.angle + Math.PI / 2, (this.looksLeft ? "y" : ""), weapon.resource.width * 0.13, weapon.resource.height * 0.13);
		}
	}).bind(this));

	//body
	windowBox.drawRotatedImage(res, playerX, playerY, this.box.angle, (this.looksLeft ? "x" : ""));
}

minimapCanvas.width = 150;
minimapCanvas.height = 150;
function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	windowBox.width = canvas.clientWidth / windowBox.zoomFactor;
	windowBox.height = canvas.clientHeight / windowBox.zoomFactor;
};
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


/* Load image assets */
function drawBar() {
	context.fillStyle = "#007d6c";
	context.fillRect(0, 0, ((drawBar.progress) / resPaths.length) * canvas.width, 15);
}
drawBar.progress = 0;
function resizeHandler() {
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
}
resizeHandler();
window.addEventListener("resize", resizeHandler);

var imgPromises = [];
resPaths.forEach(function(path) {//init resources
	var promise = new Promise(function(resolve, reject) {
		var img = new Image();
		img.addEventListener("load", function(e) {
			resources[path.substring(0, path.lastIndexOf("."))] = e.target;
			resolve();
		});
		img.addEventListener("error", function(e) {
			reject(e);
		})
		img.src = "/assets/images/" + path;
	});
	promise.then(function() {
		++drawBar.progress;
		drawBar();
	})
	.catch(function(err) {
		alert("Something went wrong. Try reloading this page.\n" +
			"If it still doesn't work, please open an issue on GitHub with a copy of the text in this message.\n" +
			"Error type: " + err.type + "\n" +
			"Failed to load " + err.target.src);
	});
	imgPromises.push(promise);
});
var allImagesLoaded = Promise.all(imgPromises).then(function() {
	game.stop();
	for (var w in weapons) weapons[w].resource = resources[w];
	window.removeEventListener("resize", resizeHandler);
});

var meteorSpawning = setInterval(function() {
	if (Math.random() > 0.3) return;
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
}, 800);
function loop() {
	handleGamepad();

	context.clearRect(0, 0, canvas.width, canvas.height);

	//layer 0: meteors
	context.globalAlpha = 0.2;
	meteors.forEach(function(m, i) {
		m.x += m.speed;
		m.rotAng += m.rotSpeed;
		if (m.x - resources[m.res].width/2 > canvas.width) meteors.splice(i, 1);
		else windowBox.drawRotatedImage(resources[m.res], Math.floor(m.x), Math.floor(m.y), m.rotAng, false, resources[m.res].width / windowBox.zoomFactor, resources[m.res].height / windowBox.zoomFactor);
	});
	context.globalAlpha = 1;


	//layer 1: the game
	doPrediction(universe, players, enemies, shots);
	game.dragSmoothed.x = ((game.dragStart.x - game.drag.x) * 1/windowBox.zoomFactor + game.dragSmoothed.x * 4) / 5;
	game.dragSmoothed.y = ((game.dragStart.y - game.drag.y) * 1/windowBox.zoomFactor + game.dragSmoothed.y * 4) / 5;

	windowBox.center.x = players[ownIdx].box.center.x + game.dragSmoothed.x;
	windowBox.center.y = players[ownIdx].box.center.y + game.dragSmoothed.y;

	//planet
	var playerInAtmos = false;
	planets.forEach(function (planet, pi) {
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
	enemies.forEach(function (enemy, ei) {
		if (universe.collide(windowBox, enemy.aggroBox)) enemy.drawAtmos();
		if (universe.collide(windowBox, enemy.box)) enemy.draw();
	});

	//particles
	particles.forEach(function(particle, index, array) {
		if (particle.update()) array.splice(index, 1);
		else windowBox.drawRotatedImage(resources["jetpackParticle"],
			windowBox.wrapX(particle.box.center.x),
			windowBox.wrapY(particle.box.center.y),
		   	particle.box.angle, false, particle.size, particle.size);
	});

	//players
	context.fillStyle = "#eee";
	context.font = "22px Open Sans";
	context.textAlign = "center";
	players.forEach(function (player, i) {
		if (universe.collide(windowBox, player.box)) player.draw(i !== ownIdx);

		if(player.panner !== undefined && player.jetpack) setPanner(player.panner, player.box.center.x - players[ownIdx].box.center.x, player.box.center.y - players[ownIdx].box.center.y);
	});

	//layer 2: HUD / GUI
	//if (player.timestamps._old !== null) document.getElementById("gui-bad-connection").style["display"] = (Date.now() - player.timestamps._old >= 1000) ? "block" : "none";

	Array.prototype.forEach.call(document.querySelectorAll("#controls img"), function (element) {
		element.style["opacity"] = (0.3 + players[ownIdx].controls[element.id] * 0.7);
	});

	//minimap	
	minimapContext.fillStyle = "rgba(0, 0, 0, 0.7)";
	minimapContext.fillRect(0, 0, 150, 150);

	planets.forEach(function (planet) {
		minimapContext.beginPath();
		minimapContext.arc((planet.box.center.x*150/universe.width - players[ownIdx].box.center.x*150/universe.width + 225) % 150, (planet.box.center.y*150/universe.height - players[ownIdx].box.center.y*150/universe.height + 225) % 150, planet.box.radius / 250 * 4 + 2, 0, 2*Math.PI);//225 = 75 + 150
		minimapContext.closePath();
		minimapContext.fillStyle = planet.progress.color;
		minimapContext.fill();
	});

	minimapContext.fillStyle = "#f33";
	players.forEach(function (player) {
		if (player.appearance !== players[ownIdx].appearance) return;
		minimapContext.beginPath();
		minimapContext.arc((player.box.center.x*150/universe.width - players[ownIdx].box.center.x*150/universe.width + 225) % 150, (player.box.center.y*150/universe.height - players[ownIdx].box.center.y*150/universe.height + 225) % 150, 2.5, 0, 2*Math.PI);
		minimapContext.closePath();
		minimapContext.fill();
	});

	chatElement.style.clip = "rect(0px," + chatElement.clientWidth + "px," + chatElement.clientHeight + "px,0px)";
	game.animationFrameId = window.requestAnimationFrame(loop);
}

function Particle(size, startX, startY, velocityX, velocityY, lifetime) {
	this.box = new Rectangle(new Point(startX, startY), 0, 0, Math.random() * 2 * Math.PI);
	this.size = size;
	this.maxLifetime = lifetime;
	this.lifetime = 0;
	this.rotSpeed = Math.random() * Math.PI * 0.04;
	this.velocity = {x: velocityX || (Math.random() * 2 - 1) * 2 * Math.sin(this.box.angle), y: velocityY || (Math.random() * 2 - 1) * 2 * Math.cos(this.box.angle)};
	this.update = function() {
		this.lifetime++;
		this.box.center.x += this.velocity.x;
		this.box.center.y += this.velocity.y;
		this.box.angle += this.rotSpeed;
		this.size *= 0.95;
		return this.lifetime >= this.maxLifetime;
	}
}
