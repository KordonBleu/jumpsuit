"use strict";

var canvas = document.getElementById("canvas"),
	context = canvas.getContext("2d"),
	meteors = [],
	player,
	pid,
	otherPlayers = [],
	planets = [],
	enemies = [],
	game = {
		muted: false,
		dragStart: new Vector(0, 0),
		drag: new Vector(0, 0),
		offset: new Vector(0, 0)
	},
	chat = {
		history: [],
		enabled: false
	},
	controls = {
		jump: 0,
		crouch: 0,
		jetpack: 0,
		moveLeft: 0,
		moveRight: 0,
		run: 0
	},
	onScreenMessage = {
		style: "",
		content: "",
		lifetime: 0,
		visible: false,
		show: function(c){
			this.content = c;
			this.lifetime = 500;
			this.visible = true;
		}
	};

function init() {//init is done differently in the server
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
				loadProcess(callback);
			} else {
				window.removeEventListener("resize", resizeHandler);
				callback();
			}
		}

		drawBar();
		var img = new Image();
		img.addEventListener("load", eHandler);
		img.src = "assets/images/" + resPaths[loadProcess.progress];
		resources[resPaths[loadProcess.progress].slice(0, resPaths[loadProcess.progress].lastIndexOf("."))] = img;
	}

	loadProcess(function(){//gets called once every resource is loaded
		player = new Player("Unnamed Player", "alienGreen", 0, 0);
		player.name = localStorage.getItem("settings.jumpsuit.name") || "Unnamed Player";
		document.getElementById("name").value = player.name;
		document.getElementById("multiplayer-box").classList.remove("hidden");
		document.getElementById("name").removeAttribute("class");
		document.getElementById("badge").removeAttribute("class");
		loop();
	});
}

function loop(){
	function drawRotatedImage(image, x, y, angle, mirror){
		//courtesy of Seb Lee-Delisle
		context.save();
		context.translate(x, y);
		context.rotate(angle);
		if (mirror === true) context.scale(-1, 1);
		context.drawImage(image, -(image.width / 2), -(image.height / 2));
		context.restore();
		
	}
	function wrapText(text, maxWidth) {
		var words = text.split(' '),
			lines = [],
			line = "";
		if (context.measureText(text).width < maxWidth) {
			return [text];
		}
		while (words.length > 0) {
			var split = false;
			while (context.measureText(words[0]).width >= maxWidth) {
				var tmp = words[0];
				words[0] = tmp.slice(0, -1);
				if (!split) {
					split = true;
					words.splice(1, 0, tmp.slice(-1));
				} else {
					words[1] = tmp.slice(-1) + words[1];
				}
			}
			if (context.measureText(line + words[0]).width < maxWidth) {
				line += words.shift() + " ";
			} else {
				lines.push(line);
				line = "";
			}
			if (words.length === 0) {
				lines.push(line);
			}
		}
		return lines;
	}
	function drawChat(){
		context.font = "14px Open Sans";
		var y = 0;
		for (var i = 0; i < chat.history.length; i++){
			var text = wrapText((chat.history[i].pid !== -1 ? chat.history[i].name + ": " : "") + chat.history[i].content, 300);
			if (y + text.length * 14 > canvas.height - 380){
				if (chat.history.length > 48) chat.length = 48;
				return;
			}
			for (var j = 0; j < text.length; j++) {
				if (chat.history[i].pid === -1) context.fillStyle = "#fff37f";
				else if (chat.history[i].pid === player.pid) context.fillStyle = "#56d7ff";
				else context.fillStyle = "#eee";
				context.fillText(text[j], 18, 150 + y + j * 17);				
			}
			y += text.length * 17 + 3;
		}
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

	function drawCircleBar(x, y, val){
		context.save();
		context.beginPath();
		context.arc(x, y, 50, -Math.PI * 0.5, (val / 100) * Math.PI * 2 - Math.PI * 0.5, false);
		context.lineWidth = 8;
		context.strokeStyle = "#000";
		context.globalAlpha = 0.2;
		context.stroke();
		context.restore();
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
	var windowBox = new Rectangle(new Point(canvas.clientWidth/2 + game.offset.x, canvas.clientHeight/2 + game.offset.y), canvas.clientWidth, canvas.clientWidth),
		fadeMusic = false;

	context.textAlign = "center";
	context.textBaseline = "middle";
	context.font = "50px Open Sans";
	planets.forEach(function (planet, pi){
		var fadeRGB = [];
		if (planet.progress.team === "neutral") fadeRGB = [80, 80, 80];
		else for (var i = 0; i <= 2; i++) fadeRGB[i] = Math.floor(planet.progress.value / 100 * (parseInt(Planet.prototype.teamColours[planet.progress.team].substr(1 + i * 2, 2), 16) - 80) + 80);
		context.fillStyle = "rgb(" + fadeRGB[0] + "," + fadeRGB[1] + "," + fadeRGB[2] + ")";

		if (windowBox.collision(planet.atmosBox)) strokeCircle(planet.box.center.x - game.offset.x, planet.box.center.y - game.offset.y, planet.atmosBox.radius, 2);
		if (windowBox.collision(planet.box)) fillCircle(planet.box.center.x - game.offset.x, planet.box.center.y - game.offset.y, planet.box.radius);

		drawCircleBar(planet.box.center.x - game.offset.x, planet.box.center.y - game.offset.y, planet.progress.value);
		context.fillStyle = "rgba(0, 0, 0, 0.2)";
		context.fillText(Planet.prototype.names[pi].substr(0, 1), planet.box.center.x - game.offset.x, planet.box.center.y - game.offset.y);
		if (planet.atmosBox.collision(player.box)) fadeMusic = true;		
	});

	enemies.forEach(function (enemy, ei) {
		enemy.shots.forEach(function (shot){
			if (windowBox.collision(shot.box)) drawRotatedImage(resources[(shot.lt <= 0) ? "laserBeamDead" : "laserBeam"], shot.box.center.x - game.offset.x, shot.box.center.y - game.offset.y, shot.box.angle, false);
		});
		context.fillStyle = "#aaa";
		if (windowBox.collision(enemy.aggroBox)) strokeCircle(enemy.box.center.x - game.offset.x, enemy.box.center.y - game.offset.y, 350, 4);
		if (windowBox.collision(enemy.box)) drawRotatedImage(resources[enemy.appearance], enemy.box.center.x - game.offset.x, enemy.box.center.y - game.offset.y, enemy.box.angle, false);
	});

	context.fillStyle = "#eee";
	context.font = "22px Open Sans";
	context.textAlign = "center";
	otherPlayers.forEach(function (otherPlayer){
		var intensity = Math.max(2, 60 * (otherPlayer.timestamps._new - otherPlayer.timestamps._old) / 1000);
		console.log(intensity / 60 * 1000)
		otherPlayer.predictedBox.angle += (parseFloat(otherPlayer.box.angle, 10) - parseFloat(otherPlayer.lastBox.angle, 10)) / intensity;	
		if (otherPlayer.attachedPlanet === -1){	
			otherPlayer.predictedBox.center.x += (parseFloat(otherPlayer.box.center.x, 10) - parseFloat(otherPlayer.lastBox.center.x, 10)) / intensity;
			otherPlayer.predictedBox.center.y += (parseFloat(otherPlayer.box.center.y, 10) - parseFloat(otherPlayer.lastBox.center.y, 10)) / intensity;
		} else {				
			otherPlayer.predictedBox.center.x = planets[otherPlayer.attachedPlanet].box.center.x + Math.sin(Math.PI - otherPlayer.predictedBox.angle) * (planets[otherPlayer.attachedPlanet].box.radius + otherPlayer.box.height / 2);
			otherPlayer.predictedBox.center.y = planets[otherPlayer.attachedPlanet].box.center.y + Math.cos(Math.PI - otherPlayer.predictedBox.angle) * (planets[otherPlayer.attachedPlanet].box.radius + otherPlayer.box.height / 2);
		}
		console.log(otherPlayer.predictedBox.center);
		var res = resources[otherPlayer.appearance + otherPlayer.walkFrame],
			distance = Math.sqrt(Math.pow(res.width, 2) + Math.pow(res.height, 2)) * 0.5 + 8;
		context.fillText(otherPlayer.name, otherPlayer.predictedBox.center.x - game.offset.x, otherPlayer.predictedBox.center.y - game.offset.y - distance);

		drawRotatedImage(resources[otherPlayer.appearance + otherPlayer.walkFrame],
			otherPlayer.predictedBox.center.x - game.offset.x,
			otherPlayer.predictedBox.center.y - game.offset.y,
			otherPlayer.predictedBox.angle,
			otherPlayer.looksLeft);
	});

	fadeBackground(fadeMusic);
	drawRotatedImage(resources[player.appearance + player.walkFrame],
		player.box.center.x - game.offset.x,
		player.box.center.y - game.offset.y,
		player.box.angle,
		player.looksLeft);


	//layer 3: HUD / GUI	
	context.textAlign = "left";
	context.textBaseline = "hanging";
	context.fillStyle = "#eee";
	context.font = "20px Open Sans";

	context.fillText("Health: ", 8, 90);
	for (var i = 0; i < player.health; i++){
		context.drawImage(resources["shield"], 80 + i * 22, 90, 18, 18);
	}
	context.fillText("Fuel: ", 8, 120);
	context.fillStyle = "#5493ce";
	context.fillRect(80, 126, player.fuel / 1.7, 8);

	[].forEach.call(document.querySelectorAll("#controls img"), function (element){
		element.style["opacity"] = (0.3 + player.controls[element.id] * 0.7);
	});
	drawChat();

	context.strokeStyle = "#fff";
	context.fillStyle = "#fff";
	context.lineWidth = 2;
	planets.forEach(function (planet){
		context.beginPath();
		context.arc(canvas.clientWidth - 158 + (planet.box.center.x / 6400) * 150, 40 + (planet.box.center.y / 6400) * 150, 5, 0, 2 * Math.PI, false);
		context.fill();
	});

	context.fillStyle = "#f33";
	context.beginPath();
		context.arc(canvas.clientWidth - 158 + (player.box.center.x / 6400) * 150, 40 + (player.box.center.y / 6400) * 150, 5, 0, 2 * Math.PI, false);
		context.fill();
	context.strokeRect(canvas.clientWidth - 158, 40, 150, 150);

	if (onScreenMessage.visible === true){
		context.font = "22px Open Sans";
		context.textAlign = "center";
		context.textBaseline = "hanging";

		var posY, posX, boxWidth;
		if (onScreenMessage.lifetime-- >= 490) posY = 36 * (500 - onScreenMessage.lifetime) / 10 - 31;
		else if (onScreenMessage.lifetime-- <= 10) posY = 36 * (onScreenMessage.lifetime) / 10 - 31;
		else posY = 5;

		boxWidth = context.measureText(onScreenMessage.content).width + 16 * 2;
		posX = canvas.clientWidth / 2 - boxWidth / 2;

		if (onScreenMessage.lifetime === 0) onScreenMessage.visible = false;

		context.fillStyle = "rgba(0, 0, 0, 0.4)";
		context.fillRect(posX, posY, boxWidth, 31);
		context.fillStyle = "#eee";
		context.fillText(onScreenMessage.content, canvas.clientWidth / 2, posY + 2);
	}
	window.requestAnimationFrame(loop);
}

init();
