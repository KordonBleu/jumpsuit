"use strict";

function Planet(cx, cy, radius, color) {
	this._cx = cx;
	this._cy = cy;
	this.radius = radius;
	this.color = color;
	this.player = -1;
}
Planet.prototype = {
	get cx() { return this._cx * canvas.width },
	get cy() { return this._cy * canvas.height },
}
function Enemy(x, y, appereal){
	this._x = x;
	this._y = y;
	this._appereal = appereal;
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
		x: 0.2 * canvas.width, y: 0.6 * canvas.height, health: 10, facesLeft: false, name: "alienGreen",
		velX: 0, velY: 0,
		walkFrame: "_stand", walkCounter: 0, walkState: 0, fuel: 400,
		attachedPlanet: 0, leavePlanet: false
	},
	game = {
		paused: false,
		muted: false,
		dragStartX: 0,
		dragStartY: 0,
		dragX: 0,
		dragY: 0,
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
		new Planet(0.1, 0.5, 150, "rgb(255,51,51)"),
		new Planet(0.8, 1.5, 220, "rgb(220,170,80)"),
		new Planet(3, -0.2, 500, "rgb(120,240,60)")
	],
	enemies = [
		new Enemy(300, 700, "enemyBlack1"),
		new Enemy(1500, 200, "enemyBlack3")
	];

function init() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	init.paths = [
		"background.png",
		"meteorBig.png", "meteorBig2.png", "meteorMed.png",	"meteorMed2.png", "meteorSmall.png", "meteorTiny.png",
		"shield.png", "pill_red.png", "laserBeam.png", "laserBeamDead.png",
		"alienBlue_badge.png", "alienBlue_duck.png", "alienBlue_hurt.png", "alienBlue_jump.png", "alienBlue_stand.png", "alienBlue_walk1.png", "alienBlue_walk2.png",
		"alienBeige_badge.png", "alienBeige_duck.png", "alienBeige_hurt.png", "alienBeige_jump.png", "alienBeige_stand.png", "alienBeige_walk1.png", "alienBeige_walk2.png",
		"alienGreen_badge.png", "alienGreen_duck.png", "alienGreen_hurt.png", "alienGreen_jump.png", "alienGreen_stand.png", "alienGreen_walk1.png", "alienGreen_walk2.png",
		"alienPink_badge.png", "alienPink_duck.png", "alienPink_hurt.png", "alienPink_jump.png", "alienPink_stand.png", "alienPink_walk1.png", "alienPink_walk2.png",
		"alienYellow_badge.png", "alienYellow_duck.png", "alienYellow_hurt.png", "alienYellow_jump.png", "alienYellow_stand.png", "alienYellow_walk1.png", "alienYellow_walk2.png",
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
	function drawRotatedImage(image, x, y, angle, mirror) {
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

	function circleRectCollision(circleX, circleY, circleRadius, boxX, boxY, boxWidth, boxHeight, boxAng) {
		//TODO: collision with a rotated box
		var deltaX = Math.abs(circleX - boxX),
			deltaY = Math.abs(circleY - boxY);

		if(deltaX > boxWidth / 2 + circleRadius || deltaY > boxHeight / 2 + circleRadius) return false;

		if(deltaX <= boxWidth / 2 || deltaY <= boxHeight / 2) return true;

		return Math.pow(deltaX, 2) + Math.pow(deltaY, 2) <= Math.pow(circleRadius, 2);
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
		var m_resources = ["meteorMed2", "meteorMed", "meteorSmall", "meteorTiny"],
			chosen_img = m_resources[Math.floor(Math.random() * 4)];

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

	planets.forEach(function (element){
		context.fillStyle = element.color;
		fillCircle(element.cx - offsetX, element.cy - offsetY, element.radius);
		drawCircle(element.cx - offsetX, element.cy - offsetY, element.radius * 1.5, 2);
	});

	if (controls["jump"] > 0 && player.leavePlanet === false) {
		player.leavePlanet = true;
		player.attachedPlanet = -1;
		player.walkFrame = "_jump";
		player.velX = Math.sin(player.rot) * 6;
		player.velY = -Math.cos(player.rot) * 6;
	}

	if (player.attachedPlanet >= 0){
		fadeBackground(true);
		var stepSize = Math.PI * 0.007 * (150 / planets[player.attachedPlanet].radius);
		if (controls["moveLeft"] > 0) {
			stepSize = stepSize * controls["moveLeft"];
			planets[player.attachedPlanet].player += (controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
			player.looksLeft = true;
		}
		if (controls["moveRight"] > 0) {
			stepSize = stepSize * controls["moveRight"];
			planets[player.attachedPlanet].player -= (controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
			player.looksLeft = false;
		}
		player.walkState = (controls["moveLeft"] || controls["moveRight"]);

		if (!player.walkState) player.walkFrame = (controls["crouch"]) ? "_duck" : "_stand";
		if (++player.walkCounter > ((controls["run"]) ? 5 : 9)) {
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
		planets.forEach(function (element, index){
			var deltaX = element.cx - player.x,
				deltaY = element.cy - player.y,
				distPowFour = Math.pow(Math.pow(deltaX, 2) + Math.pow(deltaY, 2), 2);

			player.velX += 9000 * element.radius * deltaX / distPowFour;
			player.velY += 9000 * element.radius * deltaY / distPowFour;

			var a = player.x - offsetX,
				b = player.y - offsetY;
			if (Math.pow(distPowFour, 1 / 4) < 5000) drawArrow(a, b, Math.atan2(element.cx - offsetX - a,element.cy - offsetY - b), 400 / Math.pow(distPowFour, 1 / 4) * element.radius, element.color);
			if (circleRectCollision(element.cx, element.cy, element.radius, player.x, player.y, resources[player.name + player.walkFrame].width, resources[player.name + player.walkFrame].height, player.rot)) {//player is in a planet's attraction area
				player.attachedPlanet = index;
				player.leavePlanet = false;
				element.player = Math.atan2(deltaX, deltaY) + Math.PI;
			}
		});

		if(controls["jetpack"] > 0 && player.fuel > 0) {
			player.fuel-= controls["jetpack"];
			player.velX += (Math.sin(player.rot) / 10) * controls["jetpack"];
			player.velY += (-Math.cos(player.rot) / 10) * controls["jetpack"];
		}

		if (controls["moveLeft"] > 0) player.rot -= (Math.PI / 140) * controls["moveLeft"];
		if (controls["moveRight"] > 0) player.rot += (Math.PI / 140) * controls["moveRight"];

		player.x += player.velX;
		player.y += player.velY;
	}

	enemies.forEach(function (element){
		var deltaX = element._x - player.x,
			deltaY = element._y - player.y,
			dist = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2)),
			aimAngle = Math.PI - Math.atan2(element._x - player.x, element._y - player.y);

		if (dist > 400){
			aimAngle = element.angle + Math.PI / 150;
			element.fireRate = 0;
		} else {
			if (++element.fireRate >= 20) {
				element.fireRate = 0;
				element.shots[element.shots.length] = {x: element._x, y: element._y, a: aimAngle - Math.PI, lt: 200}; //lt = lifetime / timeout
				playSound("laser");
			}
		}
		element.angle = aimAngle;

		element.shots.forEach(function (shot, index){
			shot.x += (shot.lt <= 0) ? 0 : Math.sin(shot.a) * 11;
			shot.y += (shot.lt <= 0) ? 0 : -Math.cos(shot.a) * 11;

			if (shot.x - offsetX < 0 || shot.x - offsetX > canvas.width || shot.y - offsetY < 0 || shot.y - offsetY > canvas.height || --shot.lt <= -20) element.shots.splice(index, 1);
			else if (circleRectCollision(shot.x, shot.y, resources["laserBeam"].width / 2, player.x, player.y, resources[player.name + player.walkFrame].height, resources[player.name + player.walkFrame].width, player.rot)){
				player.health -= (player.health = 0) ? 0 : 1;
				element.shots.splice(index, 1);
			}

			drawRotatedImage(resources[(shot.lt <= 0) ? "laserBeamDead" : "laserBeam"], shot.x - offsetX, shot.y - offsetY, shot.a, false);
		});

		context.fillStyle = "#aaa";
		drawCircle(element._x - offsetX, element._y - offsetY, 350, 4);
		drawRotatedImage(resources[element._appereal], element._x - offsetX, element._y - offsetY, aimAngle, false);
	});

	context.fillText("velX" + (Math.sin(player.rot) * 4 + player.velX), 0, 200);
	context.fillText("velY" + (-Math.cos(player.rot) * 4 + player.velY), 0, 250);
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

	window.requestAnimationFrame(loop);
}

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
init();
