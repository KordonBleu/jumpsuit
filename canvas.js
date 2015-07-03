"use strict";

var canvas = document.getElementById("canvas"),
	context = canvas.getContext("2d"),
	resources = {},
	meteors = [],
	pause = 0,
	player = {
		health: 10, facesLeft: false, name: "alienGreen",
		velX: 0, velY: 0,
		_walkFrame: "_stand", walkCounter: 0, walkState: 0, fuel: 400,
		set walkFrame(v){
			this._walkFrame = v;
			this.box.width = resources[this.name + this.walkFrame].width;
			this.box.height = resources[this.name + this.walkFrame].height;
		},
		get walkFrame(){
			return this._walkFrame;
		},
		attachedPlanet: 0,
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
	};

function init() {//init is done diferently in the server
	function loadProcess(callback) {
		function resizeHandler() {
			canvas.width = window.innerWidth;
			canvas.height = window.innerHeight;

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
			context.fillRect(0, 0, ((loadProcess.progress + 1) / init.paths.length) * canvas.width, 15);			}


		if (loadProcess.progress === undefined) {
			resizeHandler();
			loadProcess.progress = 0;
			window.addEventListener("resize", resizeHandler);
		}

		function eHandler() {
			loadProcess.progress++;
			if (loadProcess.progress !== init.paths.length) {
			loadProcess(callback);
			} else {
				window.removeEventListener("resize", resizeHandler);
				callback();
			}
		}

		drawBar();

		var r = new Image();
		r.addEventListener("load", eHandler);
		r.src = "assets/images/" + init.paths[loadProcess.progress];
		resources[init.paths[loadProcess.progress].slice(0, init.paths[loadProcess.progress].lastIndexOf("."))] = r;
	}

	loadProcess(function(){//gets called once every resource is loaded
		player.box = new Rectangle(new Point(0, 0), resources[player.name + player.walkFrame].width, resources[player.name + player.walkFrame].height);

  		for (var y = -1; y <= 1; y++){
  			for (var x = -1; x <= 1; x++){
  				chunks.addChunk(x, y);
  				if (x === 0 && y === 0) player.attachedPlanet = planets.length - 1;
  			}
  		}
		loop();
	});
}
init.paths = [//this could be in the engine
	"background.png",
	"meteorBig1.svg", "meteorBig2.svg", "meteorBig3.svg", "meteorBig4.svg", "meteorMed1.svg", "meteorMed2.svg", "meteorSmall1.svg", "meteorSmall2.svg", "meteorTiny1.svg", "meteorTiny2.svg",
	"shield.png", "pill_red.png", "laserBeam.png", "laserBeamDead.png",
	"alienBlue_badge.svg", "alienBlue_duck.svg", "alienBlue_hurt.svg", "alienBlue_jump.svg", "alienBlue_stand.svg", "alienBlue_walk1.svg", "alienBlue_walk2.svg",
	"alienBeige_badge.svg", "alienBeige_duck.svg", "alienBeige_hurt.svg", "alienBeige_jump.svg", "alienBeige_stand.svg", "alienBeige_walk1.svg", "alienBeige_walk2.svg",
	"alienGreen_badge.svg", "alienGreen_duck.svg", "alienGreen_hurt.svg", "alienGreen_jump.svg", "alienGreen_stand.svg", "alienGreen_walk1.svg", "alienGreen_walk2.svg",
	"alienPink_badge.svg", "alienPink_duck.svg", "alienPink_hurt.svg", "alienPink_jump.svg", "alienPink_stand.svg", "alienPink_walk1.svg", "alienPink_walk2.svg",
	"alienYellow_badge.svg", "alienYellow_duck.svg", "alienYellow_hurt.svg", "alienYellow_jump.svg", "alienYellow_stand.svg", "alienYellow_walk1.svg", "alienYellow_walk2.svg",
	"enemyBlack1.svg", "enemyBlack2.svg", "enemyBlack3.svg", "enemyBlack4.svg", "enemyBlack5.svg",
	"enemyBlue1.svg", "enemyBlue2.svg", "enemyBlue3.svg", "enemyBlue4.svg", "enemyBlue5.svg",
	"enemyGreen1.svg", "enemyGreen2.svg", "enemyGreen3.svg", "enemyGreen4.svg", "enemyGreen5.svg",
	"enemyRed1.svg", "enemyRed2.svg", "enemyRed3.svg", "enemyRed4.svg", "enemyRed5.svg"
];


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

	function strokeCircle(cx, cy, r, sw){
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
	if (Math.random() < 0.01){
		var m_resources = ["meteorBig1", "meteorBig2", "meteorBig3", "meteorBig4", "meteorMed1",	"meteorMed2", "meteorSmall1", "meteorSmall2", "meteorTiny1", "meteorTiny2"],
			m_rand = Math.floor(1 / Math.random()) - 1,
			chosen_img = m_resources[(m_rand > m_resources.length - 1) ? m_resources.length - 1 : m_rand];

		meteors[meteors.length] = {
			x: -resources[chosen_img].width/2,
			y: Math.map(Math.random(), 0, 1, -resources[chosen_img].height + 1, canvas.height - resources[chosen_img].height - 1),
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
		if (m.x - resources[m.res].width/2 > canvas.width || m.y - resources[m.res].height/2 > canvas.height || m.y + resources[m.res].height/2 < 0) meteors.splice(i, 1);
		else drawRotatedImage(resources[m.res], m.x, m.y, m.rotAng);
	});

	context.globalAlpha = 1;


	//layer 2: the game
	doPhysics();

	offsetX = ((player.box.center.x - canvas.width / 2 + (game.dragStartX - game.dragX)) + 19 * offsetX) / 20;
	offsetY = ((player.box.center.y - canvas.height / 2 + (game.dragStartY - game.dragY)) + 19 * offsetY) / 20;
	var windowBox = new Rectangle(new Point(canvas.clientWidth/2 + offsetX, canvas.clientHeight/2 + offsetY), canvas.clientWidth, canvas.clientWidth),
		fadeMusic = false;

	planets.forEach(function (planet){
		context.fillStyle = planet.color;
		if (windowBox.collision(planet.atmosBox)) strokeCircle(planet.box.center.x - offsetX, planet.box.center.y - offsetY, planet.atmosBox.radius, 2);
		if (windowBox.collision(planet.box)) fillCircle(planet.box.center.x - offsetX, planet.box.center.y - offsetY, planet.box.radius);

		if (planet.atmosBox.collision(player.box)) fadeMusic = true;

		planet.enemies.forEach(function (enemy, ei) {
			enemy.shots.forEach(function (shot){
				if (windowBox.collision(shot.box)) drawRotatedImage(resources[(shot.lt <= 0) ? "laserBeamDead" : "laserBeam"], shot.box.center.x - offsetX, shot.box.center.y - offsetY, shot.a, false);
			});
			context.fillStyle = "#aaa";
			if (windowBox.collision(enemy.aggroBox)) strokeCircle(enemy.box.center.x - offsetX, enemy.box.center.y - offsetY, 350, 4);
			if (windowBox.collision(enemy.box)) drawRotatedImage(resources[enemy.appearance], enemy.box.center.x - offsetX, enemy.box.center.y - offsetY, enemy.box.angle, false);
		});

		var deltaX = planet.box.center.x - player.box.center.x,
			deltaY = planet.box.center.y - player.box.center.y,
			distPowFour = Math.pow(Math.pow(deltaX, 2) + Math.pow(deltaY, 2), 2),
			origX = player.box.center.x - offsetX,
			origY = player.box.center.y - offsetY;

		if (Math.pow(distPowFour, 1 / 4) < chunkSize && player.attachedPlanet === -1) drawArrow(origX, origY, Math.atan2(planet.box.center.x - offsetX - origX, planet.box.center.y - offsetY - origY), 400 / Math.pow(distPowFour, 1 / 4) * planet.box.radius, planet.color);
	});

	fadeBackground(fadeMusic);

	context.fillText("player.oldChunkX: " + player.oldChunkX, 0, 200);
	context.fillText("player.oldChunkY: " + player.oldChunkY, 0, 250);
	context.fillText("planets.length: " + planets.length, 0,  300);
	drawRotatedImage(resources[player.name + player.walkFrame],
		player.box.center.x - offsetX,
		player.box.center.y - offsetY,
		player.box.angle,
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

init();
