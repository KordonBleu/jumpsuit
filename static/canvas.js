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
	particles = [],
	universe = new Rectangle(new Point(0, 0), null, null),//these parameters will be
	windowBox = new Rectangle(new Point(null, null), canvas.clientWidth, canvas.clientHeight),//overwritten later
	game = {
		dragStart: new Vector(0, 0),
		drag: new Vector(0, 0),
		dragSmoothed: new Vector(0,0),
		offset: new Vector(0, 0),
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
			[].forEach.call(document.querySelectorAll("#gui-points th"), function(element){
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
		fps: 0
	};

minimapCanvas.width = 150;
minimapCanvas.height = 150;
function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	windowBox.width = canvas.clientWidth;
	windowBox.height = canvas.clientHeight;
};
resizeCanvas();
window.addEventListener("resize", resizeCanvas);


function init() {//init is done differently in the server
	function loadProcess() {
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
		function drawBar() {
			context.fillStyle = "#007d6c";
			context.fillRect(0, 0, ((loadProcess.progress + 1) / resPaths.length) * canvas.width, 15);
		}

		if (loadProcess.progress === undefined) {
			resizeHandler();
			loadProcess.progress = 0;
			window.addEventListener("resize", resizeHandler);
		}

		function eHandler(e) {
			e.target.removeEventListener("load", eHandler);
			loadProcess.progress++;
			if (loadProcess.progress !== resPaths.length) {
				loadProcess();
			} else {
				window.removeEventListener("resize", resizeHandler);
				document.dispatchEvent(new Event("res loaded"));
			}
		}

		drawBar();
		var img = new Image();
		img.addEventListener("load", eHandler);
		img.src = "/assets/images/" + resPaths[loadProcess.progress];
		resources[resPaths[loadProcess.progress].slice(0, resPaths[loadProcess.progress].lastIndexOf("."))] = img;
	}

	document.addEventListener("res loaded", game.stop);
	loadProcess();
}
function loop() {
	handleGamepad();
	function drawRotatedImage(image, x, y, angle, mirror, sizeX, sizeY) {
		context.translate(x, y);
		context.rotate(angle);
		if (mirror === true) context.scale(-1, 1);
		var wdt = sizeX || image.width, hgt = sizeY || image.height;
		context.drawImage(image, -(wdt / 2), -(hgt / 2), wdt, hgt);
		context.resetTransform();
	}
	function drawPlanet(cx, cy, r) {
		strokeAtmos(cx, cy, r*1.75, 2);
		context.beginPath();
		context.arc(cx, cy, r, 0, 2 * Math.PI, false);
		context.closePath();
		context.fill();
		drawRotatedImage(resources["planet"], cx, cy, r / 200 * Math.PI, false, 2*r, 2*r);
	}
	function strokeAtmos(cx, cy, r, sw) {
		context.beginPath();
		context.arc(cx, cy, r, 0, 2 * Math.PI, false);
		context.globalAlpha = 0.1;
		context.fill();
		context.globalAlpha = 1;
		context.strokeStyle = context.fillStyle;
		context.lineWidth = sw;
		context.stroke();
		context.closePath();
	}
	function drawCircleBar(x, y, val) {
		context.beginPath();
		context.arc(x, y, 50, -Math.PI * 0.5, (val / 100) * Math.PI * 2 - Math.PI * 0.5, false);
		context.lineWidth = 10;
		context.strokeStyle = "rgba(0, 0, 0, 0.2)";
		context.stroke();
		context.closePath();
	}

	context.clearRect(0, 0, canvas.width, canvas.height);

	//layer 0: meteors
	if (Math.random() < 0.02){
		var m_resources = ["meteorBig1", "meteorMed2", "meteorSmall1", "meteorTiny1", "meteorTiny2"],
			m_rand = Math.floor(m_resources.length * Math.random()),
			chosen_img = m_resources[m_rand];

		meteors[meteors.length] = {
			x: -resources[chosen_img].width,
			y: Math.map(Math.random(), 0, 1, -resources[chosen_img].height + 1, canvas.height - resources[chosen_img].height - 1),
			res: chosen_img,
			speed: Math.map(Math.random(), 0, 1, 2, 6.5),
			rotAng: 0,
			rotSpeed: Math.map(Math.random(), 0, 1, -0.05, 0.05),
		};
	}
	context.globalAlpha = 0.2;
	meteors.forEach(function(m, i) {
		m.x += m.speed;
		m.rotAng += m.rotSpeed;
		if (m.x - resources[m.res].width/2 > canvas.width) meteors.splice(i, 1);
		else drawRotatedImage(resources[m.res], Math.floor(m.x), Math.floor(m.y), m.rotAng);
	});
	context.globalAlpha = 1;


	//layer 1: the game
	doPrediction(universe, players, enemies, shots);
	game.dragSmoothed.x = ((game.dragStart.x - game.drag.x) + game.dragSmoothed.x * 4) / 5;
	game.dragSmoothed.y = ((game.dragStart.y - game.drag.y) + game.dragSmoothed.y * 4) / 5;

	game.offset.x = (players[ownIdx].box.center.x - canvas.width / 2 + game.dragSmoothed.x);
	game.offset.y = (players[ownIdx].box.center.y - canvas.height / 2 + game.dragSmoothed.y);
	windowBox.center.x = canvas.clientWidth/2 + game.offset.x;
	windowBox.center.y = canvas.clientHeight/2 + game.offset.y;

	//planet
	var playerInAtmos = false;
	planets.forEach(function (planet, pi) {
		context.fillStyle = planet.progress.color;

		if (universe.collide(windowBox, planet.atmosBox)) {
			drawPlanet(
				(planet.box.center.x + universe.width/2 - windowBox.center.x)%universe.width -universe.width/2 + windowBox.width/2,
				(planet.box.center.y + universe.height/2 - windowBox.center.y)%universe.height -universe.height/2 + windowBox.height/2, planet.box.radius);
			drawCircleBar(
				(planet.box.center.x + universe.width/2 - windowBox.center.x)%universe.width -universe.width/2 + windowBox.width/2,
				(planet.box.center.y + universe.height/2 - windowBox.center.y)%universe.height -universe.height/2 + windowBox.height/2, planet.progress.value);
		}
		if (!playerInAtmos && universe.collide(planet.atmosBox, players[ownIdx].box)) playerInAtmos = true;
	});
	if(playerInAtmos) bgFilter.frequency.value = Math.min(4000, bgFilter.frequency.value * 1.05);
	else bgFilter.frequency.value = Math.max(200, bgFilter.frequency.value * 0.95);

	//shots
	shots.forEach(function (shot) {
		if (universe.collide(windowBox, shot.box)) drawRotatedImage(resources[(shot.lt <= 0) ? "laserBeamDead" : "laserBeam"],
			(shot.box.center.x + universe.width/2 - windowBox.center.x)%universe.width -universe.width/2 + windowBox.width/2,
			(shot.box.center.y + universe.height/2 - windowBox.center.y)%universe.height -universe.height/2 + windowBox.height/2,
			shot.box.angle, false);
	});

	//enemies
	enemies.forEach(function (enemy, ei) {
		context.fillStyle = "#aaa";
		if (universe.collide(windowBox, enemy.aggroBox)) strokeAtmos(
			(enemy.box.center.x + universe.width/2 - windowBox.center.x)%universe.width -universe.width/2 + windowBox.width/2,
			(enemy.box.center.y + universe.height/2 - windowBox.center.y)%universe.height -universe.height/2 + windowBox.height/2,
			350, 4);
		if (universe.collide(windowBox, enemy.box)) drawRotatedImage(resources[enemy.appearance],
			(enemy.box.center.x + universe.width/2 - windowBox.center.x)%universe.width -universe.width/2 + windowBox.width/2,
			(enemy.box.center.y + universe.height/2 - windowBox.center.y)%universe.height -universe.height/2 + windowBox.height/2,
			enemy.box.angle, false);
	});

	//particles
	particles.forEach(function(particle, index, array){
		if (particle.lifetime >= particle.maxLifetime) {
			array.splice(index, 1);
			return;
		}
		particle.lifetime++;
		particle.box.center.x += particle.velocity.x;
		particle.box.center.y -= particle.velocity.y;
		particle.box.angle += particle.rotSpeed;
		particle.size *= 0.95;
		drawRotatedImage(resources["jetpackParticle"], particle.box.center.x - game.offset.x, particle.box.center.y - game.offset.y, particle.box.angle, false, particle.size, particle.size);
	});

	//players
	context.fillStyle = "#eee";
	context.font = "22px Open Sans";
	context.textAlign = "center";
	players.forEach(function (player, i) {
		if (universe.collide(windowBox, player.box)) {
			var res = resources[player.appearance + player.walkFrame];
			//name
			if (i !== ownIdx) {
				let distance = Math.sqrt(Math.pow(res.width, 2) + Math.pow(res.height, 2)) * 0.5 + 8;
				context.fillText(player.name, (player.box.center.x + universe.width/2 - windowBox.center.x)%universe.width -universe.width/2 + windowBox.width/2, (player.box.center.y + universe.height/2 - windowBox.center.y)%universe.height -universe.height/2 + windowBox.height/2 - distance);
			}


			//jetpack
			var shift = player.looksLeft === true ? -14 : 14,
				playerX = (player.box.center.x + universe.width/2 - windowBox.center.x)%universe.width -universe.width/2 + windowBox.width/2,
				playerY = (player.box.center.y + universe.height/2 - windowBox.center.y)%universe.height -universe.height/2 + windowBox.height/2,
				jetpackX = playerX -shift*Math.sin(player.box.angle + Math.PI/2),
				jetpackY = playerY + shift*Math.cos(player.box.angle + Math.PI/2);

			drawRotatedImage(resources["jetpack"], jetpackX, jetpackY, player.box.angle, false, resources["jetpack"].width*0.75, resources["jetpack"].height*0.75);
			if (player.jetpack) {
				if(player.panner !== undefined) setPanner(player.panner, player.box.center.x - players[ownIdx].box.center.x, player.box.center.y - players[ownIdx].box.center.y);

				var jetpackFireOneX = jetpackX - 53 * Math.sin(player.box.angle - Math.PI / 11),
					jetpackFireOneY = jetpackY + 53 * Math.cos(player.box.angle - Math.PI / 11),
					jetpackFireTwoX = jetpackX - 53 * Math.sin(player.box.angle + Math.PI / 11),
					jetpackFireTwoY = jetpackY + 53 * Math.cos(player.box.angle + Math.PI / 11);

				if (Math.random() < 0.7){
					particles.push(new Particle(18, jetpackFireOneX + game.offset.x, jetpackFireOneY + game.offset.y, 80));
					particles.push(new Particle(18, jetpackFireTwoX + game.offset.x, jetpackFireTwoY + game.offset.y, 80));
				}

				drawRotatedImage(resources["jetpackFire"], jetpackFireOneX, jetpackFireOneY, player.box.angle);
				drawRotatedImage(resources["jetpackFire"], jetpackFireTwoX, jetpackFireTwoY, player.box.angle);
			}

			//body
			drawRotatedImage(res, playerX, playerY, player.box.angle, player.looksLeft);
		}
	});

	//layer 2: HUD / GUI
	//if (player.timestamps._old !== null) document.getElementById("gui-bad-connection").style["display"] = (Date.now() - player.timestamps._old >= 1000) ? "block" : "none";

	[].forEach.call(document.querySelectorAll("#controls img"), function (element) {
		element.style["opacity"] = (0.3 + players[ownIdx].controls[element.id] * 0.7);
	});

	//minimap	
	minimapContext.fillStyle = "rgba(0, 0, 0, 0.7)";
	minimapContext.fillRect(0, 0, 150, 150);

	planets.forEach(function (planet) {
		minimapContext.beginPath();
		minimapContext.arc((planet.box.center.x*150/6400 - players[ownIdx].box.center.x*150/6400 + 225) % 150, (planet.box.center.y*150/6400 - players[ownIdx].box.center.y*150/6400 + 225) % 150, planet.box.radius / 250 * 4 + 2, 0, 2*Math.PI);//225 = 75 + 150
		minimapContext.closePath();
		minimapContext.fillStyle = planet.progress.color;
		minimapContext.fill();
	});

	minimapContext.fillStyle = "#f33";
	players.forEach(function (player) {
		if (player.appearance !== players[ownIdx].appearance) return;
		minimapContext.beginPath();
		minimapContext.arc((player.box.center.x*150/6400 - players[ownIdx].box.center.x*150/6400 + 225) % 150, (player.box.center.y*150/6400 - players[ownIdx].box.center.y*150/6400 + 225) % 150, 2.5, 0, 2*Math.PI);
		minimapContext.closePath();
		minimapContext.fill();
	});

	chatElement.style.clip = "rect(0px," + chatElement.clientWidth + "px," + chatElement.clientHeight + "px,0px)";
	game.animationFrameId = window.requestAnimationFrame(loop);
}
init();

function Particle(size, startX, startY, lifetime) {
	this.box = new Rectangle(new Point(startX, startY), 0, 0, Math.random() * 2 * Math.PI);
	this.size = size;
	this.maxLifetime = lifetime;
	this.lifetime = 0;
	this.rotSpeed = Math.random() * Math.PI * 0.04;
	this.velocity = {x: (Math.random() * 2 - 1) * 2 * Math.sin(this.box.angle), y: (Math.random() * 2 - 1) * 2 * Math.cos(this.box.angle)};
}
