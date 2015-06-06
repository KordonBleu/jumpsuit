"use strict";

function Planet(cx, cy, radius, color, enemies) {
	this.cx = cx;
	this.cy = cy;
	this.radius = radius;
	this.color = color;
	this.player = -1;
	this.enemies = enemies;
}
function Enemy(x, y, appereal){	
	this.x = x;
	this.y = y;
	this.appereal = appereal;
	this.fireRate = 0;
	this.angle = 0
	this.shots = [];
}
var canvas = document.getElementById("canvas"),
	context = canvas.getContext("2d"),
	resources = {},
	meteors = [],
	pause = 0,
	player = {
		x: 0, y: 0, health: 10, facesLeft: false, name: "alienGreen",
		velX: 0, velY: 0,
		walkFrame: "_stand", walkCounter: 0, walkState: 0, fuel: 400,
		attachedPlanet: 0, leavePlanet: false,
		oldChunkX: 0, oldChunkY: 0
	},
	game = {
		paused: false,
		muted: false,
		dragStartX: 0,
		dragStartY: 0,
		dragX: 0,
		dragY: 0
	},
	offsetX = 0, offsetY = 0,
	controls = {
		jump: 0,
		crouch: 0,
		jetpack: 0,
		moveLeft: 0,
		moveRight: 0
	},
	planets = [
		new Planet(0.5, 0.5, 150, "rgb(200,200,200)", []) //start planet
	],
	planetColours = [
		"rgb(255,51,51)",
		"rgb(220,170,80)",
		"rgb(120, 240,60)",
		"rgb(12,135,242)",
		"rgb(162,191,57)",
		"rgb(221,86,41)",
		"rgb(54,38,127)",
		"rgb(118,33,129)"
	],
	chunks = [
		//
	],
	chunkSize = 4000;


chunks.chunkExist = function(x, y){
	var result = -1;
	this.forEach(function (element, index){
		if (element.x == x && element.y == y){
			result = index;
			return;
		}
	});
	return result;
}
chunks.removeChunk = function (x, y){
	var c = this.chunkExist(x, y);
	if (c < 0) return;
	planets.forEach(function (planet, pi){
		if (planet.cx >= x * chunkSize && planet.cx <= (x + 1) * chunkSize && planet.cy >= y * chunkSize && planet.cy <= (y + 1) * chunkSize){
			planets.splice(pi, 1);
		}
	});
	chunks.splice(c, 1);
}
chunks.addChunk = function (x, y){
	if (this.chunkExist(x, y) >= 0) return;
	var planetsAmount = Math.floor(Math.map(Math.random(), 0, 1, 2, 6)),
		vertical = 0;

	for (var i = 0; i < planetsAmount; i++){
		var planetRadius = Math.map(Math.random(), 0, 1, 150, (chunkSize - 150) / (3 * planetsAmount)),
			planetColour = planetColours[Math.floor(Math.random() * planetColours.length)],
			enemyAmount = Math.floor(Math.map(Math.random(), 0, 1, 0, (planetRadius < 200) ? 2 : 4)),
			planetIndex = planets.length,
			planetPosition = {px: ((++vertical / planetsAmount) + x) * chunkSize, py: Math.map(Math.random(), 0, 1, y * chunkSize, (y + 1) * chunkSize)}; 		

		var lastEnemyAng = 0, enemies = [];
		for (var j = 0; j < enemyAmount; j++){
			var enemyAng = Math.map(Math.random(), 0, 1, lastEnemyAng + Math.PI / 4, lastEnemyAng + Math.PI * 1.875),
				enemyDistance = Math.floor(Math.map(Math.random(), 0, 1, planetRadius * 1.5, planetRadius * 4)),
				enemyResources = ["Black1", "Black2", "Black3", "Blue1", "Blue2", "Blue3", "Green1", "Green2", "Red1", "Red2", "Red3"];
			enemies[j] = new Enemy(Math.sin(enemyAng) * enemyDistance, -Math.cos(enemyAng) * enemyDistance, "enemy" + enemyResources[Math.floor(Math.random() * enemyResources.length)]);
			lastEnemyAng = enemyAng;
		}
		planets[planetIndex] = new Planet(planetPosition.px, planetPosition.py, planetRadius, planetColour, enemies);	
	}
	chunks[chunks.length] = {x: x, y: y};
}

function init(){
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	init.paths = [
		"background.png",
		"meteorBig.png", "meteorBig2.png", "meteorMed.png",	"meteorMed2.png", "meteorSmall.png", "meteorTiny.png",
		"shield.png", "pill_red.png", "laserBeam.png", "laserBeamDead.png",
		"alienBlue_badge.svg", "alienBlue_duck.svg", "alienBlue_hurt.svg", "alienBlue_jump.svg", "alienBlue_stand.svg", "alienBlue_walk1.svg", "alienBlue_walk2.svg",
		"alienBeige_badge.svg", "alienBeige_duck.svg", "alienBeige_hurt.svg", "alienBeige_jump.svg", "alienBeige_stand.svg", "alienBeige_walk1.svg", "alienBeige_walk2.svg",
		"alienGreen_badge.svg", "alienGreen_duck.svg", "alienGreen_hurt.svg", "alienGreen_jump.svg", "alienGreen_stand.svg", "alienGreen_walk1.svg", "alienGreen_walk2.svg",
		"alienPink_badge.svg", "alienPink_duck.svg", "alienPink_hurt.svg", "alienPink_jump.svg", "alienPink_stand.svg", "alienPink_walk1.svg", "alienPink_walk2.svg",
		"alienYellow_badge.svg", "alienYellow_duck.svg", "alienYellow_hurt.svg", "alienYellow_jump.svg", "alienYellow_stand.svg", "alienYellow_walk1.svg", "alienYellow_walk2.svg",
		"enemyBlack1.png", "enemyBlack2.png", "enemyBlack3.png", "enemyBlue1.png", "enemyBlue2.png", "enemyBlue3.png",
		"enemyGreen1.png", "enemyGreen2.png", "enemyRed1.png", "enemyRed2.png", "enemyRed3.png"
	];

	context.canvas.fillStyle = "black";
	context.fillRect(0,0, canvas.width, canvas.height);
  	context.font = "16px Open Sans";
  	context.textBaseline = "top";
  	context.textAlign = "center";

	for (var i = 0, lgt = init.paths.length; i != lgt; i++){
		var r = new Image();
		r.src = "assets/images/" + init.paths[i];
		r.onload = loadProcess;
		resources[init.paths[i].slice(0, init.paths[i].lastIndexOf("."))] = r;
	}
}

function loadProcess(e){
	loadProcess.progress = loadProcess.progress === undefined ? 1 : ++loadProcess.progress;

	context.fillStyle = "#121012";
	context.fillRect(0, 0, canvas.width, canvas.height);

	context.fillStyle = "#007d6c";
	context.fillRect(0, 0, (loadProcess.progress / init.paths.length) * canvas.width, 15);

	context.fillStyle = "#eee";
	context.font = "60px Open Sans";
	context.fillText("JumpSuit", canvas.width / 2, canvas.height * 0.35);
	context.font = "28px Open Sans";
	context.fillText("A canvas game by Getkey & Fju", canvas.width / 2, canvas.height * 0.35 + 80);

	if (loadProcess.progress == init.paths.length) setTimeout(loop, 1000);
}

function loop(){
	handleGamepad();
	function drawRotatedImage(image, x, y, angle, mirror){
		//courtesy of Seb Lee-Delisle
		context.save();
		context.translate(x, y);
		context.rotate(angle);
		if (mirror === true) context.scale(-1, 1);
		context.drawImage(image, -(image.width / 2), -(image.height / 2));
		context.restore();
	}

	function fillCircle(cx, cy, r){
		context.save();

		context.beginPath();
		context.arc(cx, cy, r, 0, 2 * Math.PI, false);
		context.closePath();
		context.fill();

		context.clip();

		context.lineWidth = 12;
		context.shadowColor = "black";
		context.shadowBlur = 30;
		context.shadowOffsetX = -10;
		context.shadowOffsetY = -10;

		context.beginPath();
		context.arc(cx, cy + 1, r + 7, -1/7 * Math.PI, 3/5 * Math.PI);
		context.stroke();

		context.restore();
	}

	function drawCircle(cx, cy, r, sw){
		context.save();
		context.beginPath();
		context.arc(cx, cy, r, 0, 2 * Math.PI, false);
		context.globalAlpha = 0.1;
		context.fill();
		context.globalAlpha = 1;
		context.strokeStyle = context.fillStyle;
		context.lineWidth = sw;
		context.stroke();
		context.restore();
	}

	function drawArrow(fromx, fromy, ang, dist, col){
		var len = (dist > 200) ? 200 : (dist < 70) ? 70 : dist;

		var tox = fromx + Math.sin(Math.PI - ang) * len,
			toy = fromy - Math.cos(Math.PI - ang) * len;
		context.beginPath();
		context.moveTo(fromx, fromy);
		context.lineTo(tox, toy);
		context.lineWidth = 5;
		context.strokeStyle = col;
		context.stroke();
	}

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	context.globalAlpha = 1;
	context.clearRect(0, 0, canvas.width, canvas.height);


	//layer 0: background
	for (var i = 0; i < Math.floor(canvas.width / 256) + 1; i++){
		for (var j = 0; j < Math.floor(canvas.height / 256) + 1; j++){
			context.drawImage(resources["background"], i * 256, j * 256);
		}
	}


	//layer 1: meteors
	if (Math.random() < 0.05){
		var m_resources = ["meteorTiny", "meteorSmall", "meteorMed", "meteorBig", "meteorBig2", "meteorMed2"],
			m_rand = Math.floor(1 / Math.random()) - 1,
			chosen_img = m_resources[(m_rand > m_resources.length - 1) ? m_resources.length - 1 : m_rand];

		meteors[meteors.length] = {
			x: -resources[chosen_img].width,
			y: Math.map(Math.random(), 0, 1, 50, canvas.height - 50),
			res: chosen_img,
			speed: Math.map(Math.random(), 0, 1, 2, 4),
			ang: Math.map(Math.random(), 0, 1, 0.25 * Math.PI, 0.75 * Math.PI),
			rotAng: Math.map(Math.random(), 0, 1, 0, 2 * Math.PI),
			rotSpeed: Math.map(Math.random(), 0, 1, -0.05, 0.05),
			depth: Math.map(Math.random(), 0, 1, 0.2, 0.6)
		};
	}
	meteors.forEach(function(m, i){
		m.x += Math.sin(m.ang) * m.speed;
		m.y += Math.cos(m.ang) * m.speed;
		context.globalAlpha = m.depth;
		m.rotAng += m.rotSpeed;
		if (m.x > canvas.width + 10 || m.y > canvas.height + 10) meteors.splice(i, 1);
		else drawRotatedImage(resources[m.res], m.x, m.y, m.rotAng);
	});

	context.globalAlpha = 1;


	//layer 2: the game
	offsetX = ((player.x - canvas.width / 2 + (game.dragStartX - game.dragX)) + 19 * offsetX) / 20;
	offsetY = ((player.y - canvas.height / 2 + (game.dragStartY - game.dragY)) + 19 * offsetY) / 20;

	planets.forEach(function (planet){	
		context.fillStyle = planet.color;
		fillCircle(planet.cx - offsetX, planet.cy - offsetY, planet.radius);
		drawCircle(planet.cx - offsetX, planet.cy - offsetY, planet.radius * 1.5, 2);

		planet.enemies.forEach(function (enemy, ei){
			var deltaX = planet.cx + enemy.x - player.x,
				deltaY = planet.cy + enemy.y - player.y,
				dist = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2)),
				aimAngle = Math.PI - Math.atan2(planet.cx + enemy.x - player.x, planet.cy + enemy.y - player.y);
			if (dist > 400){
				aimAngle = enemy.angle + Math.PI / 150;
				enemy.fireRate = 0;
			} else {
				if (++enemy.fireRate >= 20) {
					enemy.fireRate = 0;
					enemy.shots[enemy.shots.length] = {x: planet.cx + enemy.x, y: planet.cy + enemy.y, a: aimAngle - Math.PI, lt: 200}; //lt = lifetime
					playSound("laser");
				}
			}
			enemy.angle = aimAngle;

			enemy.shots.forEach(function (shot, si){
				shot.x += (shot.lt <= 0) ? 0 : Math.sin(shot.a) * 11;
				shot.y += (shot.lt <= 0) ? 0 : -Math.cos(shot.a) * 11;
				if (shot.x - offsetX < 0 || shot.x - offsetX > canvas.width || shot.y - offsetY < 0 || shot.y - offsetY > canvas.height || --shot.lt <= -20) enemy.shots.splice(si, 1);
				else if (Collib.circleObb(shot.x, shot.y, resources["laserBeam"].width / 2, new Rectangle(new Point(player.x, player.y), resources[player.name + player.walkFrame].height, resources[player.name + player.walkFrame].width, player.rot))){//to be replaced with `Collib.obbObb()`
					player.health -= (player.health = 0) ? 0 : 1;
					enemy.shots.splice(si, 1);
				}
				drawRotatedImage(resources[(shot.lt <= 0) ? "laserBeamDead" : "laserBeam"], shot.x - offsetX, shot.y - offsetY, shot.a, false);
			});
			context.fillStyle = "#aaa";
			drawCircle(planet.cx + enemy.x - offsetX, planet.cy + enemy.y - offsetY, 350, 4);
			drawRotatedImage(resources[enemy.appereal], planet.cx + enemy.x - offsetX, planet.cy + enemy.y - offsetY, aimAngle, false);
		});
	});

	if (controls["jump"] > 0 && player.leavePlanet === false){
		player.leavePlanet = true;
		player.attachedPlanet = -1;
		player.walkFrame = "_jump";
		player.velX = Math.sin(player.rot) * 6;
		player.velY = -Math.cos(player.rot) * 6;
	}

	if (player.attachedPlanet >= 0){
		fadeBackground(true);
		var stepSize = Math.PI * 0.007 * (150 / planets[player.attachedPlanet].radius);
		if (controls["moveLeft"] > 0){
			stepSize = stepSize * controls["moveLeft"];
			planets[player.attachedPlanet].player += (controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
			player.looksLeft = true;
		}
		if (controls["moveRight"] > 0){
			stepSize = stepSize * controls["moveRight"];
			planets[player.attachedPlanet].player -= (controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
			player.looksLeft = false;
		}
		player.walkState = (controls["moveLeft"] || controls["moveRight"]);

		if (!player.walkState) player.walkFrame = (controls["crouch"]) ? "_duck" : "_stand";
		if (++player.walkCounter > ((controls["run"]) ? 5 : 9)){
			player.walkCounter = 0;
			if (player.walkState) player.walkFrame = (player.walkFrame === "_walk1") ? "_walk2" : "_walk1";
		}
		player.x = planets[player.attachedPlanet].cx + Math.sin(planets[player.attachedPlanet].player) * (planets[player.attachedPlanet].radius + resources[player.name + player.walkFrame].height / 2);
		player.y = planets[player.attachedPlanet].cy + Math.cos(planets[player.attachedPlanet].player) * (planets[player.attachedPlanet].radius + resources[player.name + player.walkFrame].height / 2);
		player.rot = Math.PI - planets[player.attachedPlanet].player;
		player.velX = 0;
		player.velY = 0;
		player.fuel = 300;
	} else {
		fadeBackground(false);		
		var chunkX = Math.floor(player.x / chunkSize),
			chunkY = Math.floor(player.y / chunkSize);		

		if (chunkX !== player.oldChunkX || chunkY !== player.oldChunkY){
			for (var y = -3; y < 3; y++){
				for (var x = -3; x < 3; x++){
					if (y >= -1 && y <= 1 && x >= -1 && x <= 1) chunks.addChunk(chunkX + x, chunkY + y);
					else chunks.removeChunk(chunkX + x, chunkY + y);
				}
			}
		}

		player.oldChunkX = chunkX;
		player.oldChunkY = chunkY;

		planets.forEach(function (planet, pi){
			var deltaX = planet.cx - player.x,
				deltaY = planet.cy - player.y,
				distPowFour = Math.pow(Math.pow(deltaX, 2) + Math.pow(deltaY, 2), 2);

			player.velX += 9000 * planet.radius * deltaX / distPowFour;
			player.velY += 9000 * planet.radius * deltaY / distPowFour;

			var origX = player.x - offsetX,
				origY = player.y - offsetY;
			if (Math.pow(distPowFour, 1 / 4) < chunkSize) drawArrow(origX, origY, Math.atan2(planet.cx - offsetX - origX, planet.cy - offsetY - origY), 400 / Math.pow(distPowFour, 1 / 4) * planet.radius, planet.color);

			if (Collib.circleObb(planet.cx, planet.cy, planet.radius, new Rectangle(new Point(player.x, player.y), resources[player.name + player.walkFrame].width, resources[player.name + player.walkFrame].height, player.rot))) {//TODO: use a Rectangle object for the character instead of recreating a Rectangle object every time
				//player is in a planet's attraction area
				player.attachedPlanet = pi;
				player.leavePlanet = false;
				planet.player = Math.atan2(deltaX, deltaY) + Math.PI;
			}
		});

		if(controls["jetpack"] > 0 && player.fuel > 0 && controls["crouch"] < 1){
			player.fuel-= controls["jetpack"];
			player.velX += (Math.sin(player.rot) / 10) * controls["jetpack"];
			player.velY += (-Math.cos(player.rot) / 10) * controls["jetpack"];
		} else if (controls["crouch"] > 0){
			//((player.x - canvas.width / 2 + (game.dragStartX - game.dragX)) + 19 * offsetX) / 20;
			player.velX = player.velX * 0.987;
			player.velY = player.velY * 0.987;
		}

		var runMultiplicator = controls["run"] ? 1.7 : 1;
		if (controls["moveLeft"] > 0) player.rot -= (Math.PI / 140) * controls["moveLeft"] * runMultiplicator;
		if (controls["moveRight"] > 0) player.rot += (Math.PI / 140) * controls["moveRight"] * runMultiplicator;

		player.x += player.velX;
		player.y += player.velY;
	}

	context.fillText("player.oldChunkX: " + player.oldChunkX, 0, 200);
	context.fillText("player.oldChunkY: " + player.oldChunkY, 0, 250);
	context.fillText("planets.length: " + planets.length, 0,  300);
	drawRotatedImage(resources[player.name + player.walkFrame],
		player.x - offsetX,
		player.y - offsetY,
		player.rot,
		player.looksLeft);


	//layer 3: HUD / GUI
	context.font = "28px Open Sans";
	context.textAlign = "left";
	context.textBaseline = "hanging";

	context.fillStyle = "#eee";
	context.drawImage(resources[player.name + "_badge"], 8, 18, 32, 32);
	context.fillText("Player Name".toUpperCase(), 55, 20); //uppercase looks better

	context.font = "20px Open Sans";
	context.fillText("Health: ", 8, 90);
	for (var i = 0; i < player.health; i++){
		context.drawImage(resources["shield"], 80 + i * 22, 90, 18, 18);
	}
	context.fillText("Fuel: ", 8, 120);
	context.fillStyle = "#f33";
	context.fillRect(80, 126, player.fuel, 8);
	
	[].forEach.call(document.querySelectorAll("#controls img"), function (element){
		element.setAttribute("style", "opacity: " + (0.3 + controls[element.id] * 0.7));
	});	

	window.requestAnimationFrame(loop);
}

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
init();
