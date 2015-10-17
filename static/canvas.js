"use strict";

var chatElement = document.getElementById("gui-chat"),
	chatFirstElement = document.getElementById("gui-chat-first"),
	healthElement = document.getElementById("gui-health"),
	fuelElement = document.getElementById("gui-fuel"),
	pointsElement = document.getElementById("gui-points"),
	menuBox = document.getElementById("menu-box"),
	menuCloseElement = document.getElementById("close-menu"),
	nameElement = document.getElementById("name"),
	statusElement = document.getElementById("status"),
	refreshOrLeaveElement = document.getElementById("refresh-or-leave"),
	newLobbyElement = document.getElementById("new-lobby"),
	playerListElement = document.getElementById("player-list"),
	appearanceBox = document.getElementById("appearance-box"),
	disconnectElement = document.getElementById("disconnect"),
	dialogElement = document.getElementById("dialog"),
	chatInput = document.getElementById("chat-input");

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
};

var canvas = document.getElementById("canvas"),
	context = canvas.getContext("2d"),
	meteors = [],
	player,
	pid = -1,
	otherPlayers = [],
	planets = [],
	enemies = [],
	shots = [],
	game = {
		dragStart: new Vector(0, 0),
		drag: new Vector(0, 0),
		offset: new Vector(0, 0),
		connectionProblems: false,
		animationFrameId: null,
		start: function() {
			chatElement.removeAttribute("class");
			healthElement.removeAttribute("class");
			fuelElement.removeAttribute("class");
			pointsElement.removeAttribute("class");
			menuBox.classList.add("hidden");
			loop();
		},
		stop: function() {
			chatElement.className = "hidden";
			healthElement.className = "hidden";
			fuelElement.className = "hidden";
			pointsElement.className = "hidden";
			menuBox.classList.remove("hidden");

			pid = -1;
			otherPlayers.length = 0;
			planets.length = 0;
			enemies.length = 0;

			window.cancelAnimationFrame(this.animationFrameId);
			context.clearRect(0, 0, canvas.width, canvas.height);
		}
	};

function resizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
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

	document.addEventListener("res loaded", function() {//gets called once every resource is loaded
		game.stop(); //for clearing
		player = new Player(localStorage.getItem("settings.name") || "Unnamed Player", "alienGreen", 0, 0);
		nameElement.value = player.name;
		nameElement.removeAttribute("class");
	});
	loadProcess();
}
function loop() {
	handleGamepad();
	function drawRotatedImage(image, x, y, angle, mirror, sizeX, sizeY) {
		context.translate(x, y);
		context.rotate(angle);
		if (mirror === true) context.scale(-1, 1);
		var wdt = sizeX !== undefined ? sizeX : image.width,
			hgt = sizeY !== undefined ? sizeY : image.height;
		context.drawImage(image, -(wdt / 2), -(hgt / 2), wdt, hgt);
		context.resetTransform();
	}
	function fillPlanet(cx, cy, r) {
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
		context.closePath();

		context.restore();
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

	function drawArrow(fromx, fromy, ang, dist, col) {
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

	function drawCircleBar(x, y, val) {
		context.save();
		context.beginPath();
		context.arc(x, y, 50, -Math.PI * 0.5, (val / 100) * Math.PI * 2 - Math.PI * 0.5, false);
		context.lineWidth = 8;
		context.strokeStyle = "#000";
		context.globalAlpha = 0.2;
		context.stroke();
		context.restore();
	}


	context.clearRect(0, 0, canvas.width, canvas.height);

	//layer 0: meteors
	if (Math.random() < 0.01){
		var m_resources = ["meteorBig1", "meteorBig2", "meteorBig3", "meteorBig4", "meteorMed1", "meteorMed2", "meteorSmall1", "meteorSmall2", "meteorTiny1", "meteorTiny2"],
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
	meteors.forEach(function(m, i) {
		m.x += Math.sin(m.ang) * m.speed;
		m.y += Math.cos(m.ang) * m.speed;
		context.globalAlpha = m.depth;
		m.rotAng += m.rotSpeed;
		if (m.x - resources[m.res].width/2 > canvas.width || m.y - resources[m.res].height/2 > canvas.height || m.y + resources[m.res].height/2 < 0) meteors.splice(i, 1);
		else drawRotatedImage(resources[m.res], Math.floor(m.x), Math.floor(m.y), m.rotAng);
	});
	context.globalAlpha = 1;


	//layer 1: the game
	var windowBox = new Rectangle(new Point(canvas.clientWidth/2 + game.offset.x, canvas.clientHeight/2 + game.offset.y), canvas.clientWidth, canvas.clientWidth);
	game.offset.x = ((player.box.center.x - canvas.width / 2 + (game.dragStart.x - game.drag.x)) + 19 * game.offset.x) / 20;
	game.offset.y = ((player.box.center.y - canvas.height / 2 + (game.dragStart.y - game.drag.y)) + 19 * game.offset.y) / 20;
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.font = "50px Open Sans";

	//atmosphere
	planets.forEach(function(planet) {
		context.fillStyle = planet.progress.color;
	});

	//jetpack
	function drawJetpack(_player) {
		var shift = _player.looksLeft === true ? -14 : 14,
			jetpackX = _player.box.center.x - game.offset.x -shift*Math.sin(_player.box.angle + Math.PI/2),
			jetpackY = _player.box.center.y - game.offset.y + shift*Math.cos(_player.box.angle + Math.PI/2);
		drawRotatedImage(resources["jetpack"], jetpackX,  jetpackY, _player.box.angle, false, resources["jetpack"].width*0.75, resources["jetpack"].height*0.75);
		if (_player.jetpack) {
			if(_player.panner !== undefined) setPanner(_player.panner, _player.box.center.x - player.box.center.x, _player.box.center.y - player.box.center.y);
			context.globalAlpha = 0.8;
			drawRotatedImage(resources["jetpackFire"], jetpackX -53*Math.sin(_player.box.angle - Math.PI/11), jetpackY + 53*Math.cos(_player.box.angle - Math.PI/11), _player.box.angle);
			drawRotatedImage(resources["jetpackFire"], jetpackX -53*Math.sin(_player.box.angle + Math.PI/11), jetpackY + 53*Math.cos(_player.box.angle + Math.PI/11), _player.box.angle);
		}
	}
	otherPlayers.forEach(drawJetpack);
	drawJetpack(player);

	context.globalAlpha = 1;

	//planet
	var playerInAtmos = false;
	planets.forEach(function (planet, pi) {
		context.fillStyle = planet.progress.color;

		if (windowBox.collision(planet.box)) {
			fillPlanet(planet.box.center.x - game.offset.x, planet.box.center.y - game.offset.y, planet.box.radius);
			drawCircleBar(planet.box.center.x - game.offset.x, planet.box.center.y - game.offset.y, planet.progress.value);
		}
		if (windowBox.collision(planet.atmosBox)) strokeAtmos(planet.box.center.x - game.offset.x, planet.box.center.y - game.offset.y, planet.atmosBox.radius, 2);

		if (playerInAtmos || planet.atmosBox.collision(player.box)) playerInAtmos = true;

		drawCircleBar(planet.box.center.x - game.offset.x, planet.box.center.y - game.offset.y, planet.progress.value);
		context.fillStyle = "rgba(0, 0, 0, 0.2)";
		context.fillText(planet.names[pi].substr(0, 1), planet.box.center.x - game.offset.x, planet.box.center.y - game.offset.y);
	});
	if(playerInAtmos) bgFilter.frequency.value = bgFilter.frequency.value >= 4000 ? 4000 : bgFilter.frequency.value * 1.05;
	else bgFilter.frequency.value = bgFilter.frequency.value <= 200 ? 200 : bgFilter.frequency.value * 0.95;

	//shots
	shots.forEach(function (shot) {
		if (windowBox.collision(shot.box)) drawRotatedImage(resources[(shot.lt <= 0) ? "laserBeamDead" : "laserBeam"], shot.box.center.x - game.offset.x, shot.box.center.y - game.offset.y, shot.box.angle, false);
	});

	//enemies
	enemies.forEach(function (enemy, ei) {
		context.fillStyle = "#aaa";
		if (windowBox.collision(enemy.aggroBox)) strokeAtmos(enemy.box.center.x - game.offset.x, enemy.box.center.y - game.offset.y, 350, 4);
		if (windowBox.collision(enemy.box)) drawRotatedImage(resources[enemy.appearance], enemy.box.center.x - game.offset.x, enemy.box.center.y - game.offset.y, enemy.box.angle, false);
	});

	context.fillStyle = "#eee";
	context.font = "22px Open Sans";
	context.textAlign = "center";
	otherPlayers.forEach(function (otherPlayer, i){
		var intensity = Math.max(1, 60 * (otherPlayer.timestamps._new - otherPlayer.timestamps._old) / 1000);

		otherPlayer.predictedBox.angle += (parseFloat(otherPlayer.box.angle, 10) - parseFloat(otherPlayer.lastBox.angle, 10)) / intensity;
		if (otherPlayer.attachedPlanet === -1){
			otherPlayer.predictedBox.center.x += (parseFloat(otherPlayer.box.center.x, 10) - parseFloat(otherPlayer.lastBox.center.x, 10)) / intensity;
			otherPlayer.predictedBox.center.y += (parseFloat(otherPlayer.box.center.y, 10) - parseFloat(otherPlayer.lastBox.center.y, 10)) / intensity;
		} else {
			otherPlayer.predictedBox.center.x = planets[otherPlayer.attachedPlanet].box.center.x + Math.sin(Math.PI - otherPlayer.predictedBox.angle) * (planets[otherPlayer.attachedPlanet].box.radius + otherPlayer.box.height / 2);
			otherPlayer.predictedBox.center.y = planets[otherPlayer.attachedPlanet].box.center.y + Math.cos(Math.PI - otherPlayer.predictedBox.angle) * (planets[otherPlayer.attachedPlanet].box.radius + otherPlayer.box.height / 2);
		}

		if (i !== pid){
			var res = resources[otherPlayer.appearance + otherPlayer.walkFrame],
				distance = Math.sqrt(Math.pow(res.width, 2) + Math.pow(res.height, 2)) * 0.5 + 8;
			context.fillText(otherPlayer.name, otherPlayer.predictedBox.center.x - game.offset.x, otherPlayer.predictedBox.center.y - game.offset.y - distance);
		}
		drawRotatedImage(resources[otherPlayer.appearance + otherPlayer.walkFrame],
			otherPlayer.predictedBox.center.x - game.offset.x,
			otherPlayer.predictedBox.center.y - game.offset.y,
			otherPlayer.predictedBox.angle,
			otherPlayer.looksLeft);
	});


	//layer 2: HUD / GUI
	if (player.timestamps._old !== null) document.getElementById("gui-bad-connection").style["display"] = (Date.now() - player.timestamps._old >= 1000) ? "block" : "none";

	[].forEach.call(document.querySelectorAll("#controls img"), function (element) {
		element.style["opacity"] = (0.3 + player.controls[element.id] * 0.7);
	});

	context.beginPath();
	context.rect(canvas.clientWidth - 158, 8, 150, 150);
	context.closePath();

	context.fillStyle = "rgba(0, 0, 0, 0.7)";
	context.fill();

	context.lineWidth = 1;
	context.strokeStyle = "#fff";
	context.stroke();

	context.save();
	context.clip();

	planets.forEach(function (planet) {
		context.beginPath();
		context.arc(canvas.clientWidth - 158 + (planet.box.center.x*150/6400 - player.box.center.x*150/6400 + 225) % 150, 8 + (planet.box.center.y*150/6400 - player.box.center.y*150/6400 + 225) % 150, planet.box.radius / 250 * 4 + 2, 0, 2*Math.PI);//225 = 75 + 150
		context.closePath();
		context.fillStyle = planet.progress.color;
		context.fill();
	});

	context.fillStyle = "#f33";
	otherPlayers.forEach(function (otherPlayer) {
		if (otherPlayer.appearance !== player.appearance) return;
		context.beginPath();
		context.arc(canvas.clientWidth - 158 + (otherPlayer.box.center.x*150/6400 - player.box.center.x*150/6400 + 225) % 150, 8 + (otherPlayer.box.center.y*150/6400 - player.box.center.y*150/6400 + 225) % 150, 2.5, 0, 2*Math.PI);
		context.closePath();
		context.fill();
	});
	context.beginPath();
	context.arc(canvas.clientWidth - 158 + 75, 8 + 75, 2.5, 0, 2*Math.PI);
	context.fill();
	context.closePath();

	context.restore();


	document.getElementById("gui-fuel-value").style["width"] = (player.fuel / 400 * 200) + "px";
	[].forEach.call(document.querySelectorAll("#gui-health div"), function (element, index){
		var state = "heartFilled";
		if (index * 2 + 2 <= player.health) state = "heartFilled";
		else if (index * 2 + 1 === player.health) state = "heartHalfFilled";
		else state = "heartNotFilled";
		element.className = state;
	});	
	chatElement.style.clip = "rect(0px," + chatElement.clientWidth + "px," + chatElement.clientHeight + "px,0px)";
	game.animationFrameId = window.requestAnimationFrame(loop);
}
init();
