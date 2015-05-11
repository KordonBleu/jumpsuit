"use strict";
var canvas = document.getElementById("canvas"),
context = canvas.getContext("2d"),
resources = {},
keys = [],
meteors = [],
pause = 0,
playerX = 0, playerY = 0, playerHealth = 10, playerLooksLeft = false,
playerWalkFrame = "_stand", playerWalkCounter = 0, playerWalkState = 0,
playerName = "alienBlue", offsetX = 0, offsetY = 0,
controls = {
	escape: 27,
	spacebar: 32,
	upArrow: 38,
	downArrow: 40,
	leftArrow: 37,
	rightArrow: 39,
	leftShift: 16
}, attachedPlanet = 0,
planets = [
	{
		cx: 0.15,
		cy: 0.5,
		radius: 150,
		colour: "rgb(255,51,51)",
		player: -1
	},
	{
		cx: 0.8,
		cy: 0.6,
		radius: 220,
		colour: "rgb(220,170,80)",
		player: -1
	},
	{
		cx: 1,
		cy: 0.05,
		radius: 80,
		colour: "rgb(120,240,60)",
		player: -1
	}
];



function init(){
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	init.paths = [
		"background",
		"meteorBig",
		"meteorBig2",
		"meteorMed",
		"meteorMed2",
		"meteorSmall",
		"meteorTiny",
		"shield",
		"pill_red",
		"alienBlue_badge",
		"alienBlue_duck",
		"alienBlue_hurt",
		"alienBlue_jump",
		"alienBlue_stand",
		"alienBlue_walk1",
		"alienBlue_walk2",
		"alienBeige_badge",
		"alienBeige_duck",
		"alienBeige_hurt",
		"alienBeige_jump",
		"alienBeige_stand",
		"alienBeige_walk1",
		"alienBeige_walk2",
	];

	context.canvas.fillStyle = "black";
	context.fillRect(0,0, canvas.width, canvas.height);
  	context.font = "16px Open Sans";  	
  	context.textBaseline = "top";
  	context.textAlign = "center";

	for (var i = 0, lgt = init.paths.length; i != lgt; i++){
		var r = new Image();
		r.src = "assets/" + init.paths[i] + ".png";
		r.onload = loadProcess;
		resources[init.paths[i]] = r;
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

function loop() {
	function drawRotatedImage(image, x, y, angle, mirror) {
		//courtesy of Seb Lee-Delisle
		mirror = mirror | false;
		context.save();
		context.translate(x, y);		
		context.rotate(angle);
		if (mirror === true) context.scale(-1, 1);
		context.drawImage(image, -(image.width/2), -(image.height/2));
		context.restore();
	}

	function fillCircle(cx, cy, r, ws){
		context.save();

		context.beginPath();
		context.arc(cx, cy, r, 0, 2 * Math.PI, false);	
		context.closePath();
		context.fill();

		context.clip();

		context.strokeStyle = "white";
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
	if (Math.random() < 0.02){		
		var m_resources = ["meteorMed2", "meteorMed", "meteorSmall", "meteorTiny"],
			chosen_img = m_resources[Math.floor(Math.random() * 4)];

		meteors[meteors.length] = {
			x: -resources[chosen_img].width,
			y: Math.map(Math.random(), 0, 1, 50, canvas.height - 50),
			res: chosen_img,
			speed: Math.map(Math.random(), 0, 1, 2, 4),
			ang: Math.map(Math.random(), 0, 1, 45, 135),
			rotAng: Math.map(Math.random(), 0, 1, 0, 2 * Math.PI),
			rotSpeed: Math.map(Math.random(), 0, 1, -0.05, 0.05),
			depth: Math.map(Math.random(), 0, 1, 0.2, 0.6)
		};
	}
	
	meteors.forEach(function(m, i){		
		m.x += Math.sin(m.ang * (Math.PI / 180)) * m.speed;
		m.y += Math.cos(m.ang * (Math.PI / 180)) * m.speed;
		context.globalAlpha = m.depth;
		m.rotAng += m.rotSpeed;
		if (m.x > canvas.width + 10 || m.y > canvas.height + 10) meteors.splice(i, 1);			
		else drawRotatedImage(resources[m.res], m.x, m.y, m.rotAng);
	});


	//layer 2: HUD / GUI
	context.globalAlpha = 1;

	context.font = "20px Open Sans";
	context.textAlign = "left";
	context.textBaseline = "hanging";

	context.fillStyle = "#eee";
	context.fillText("Health: ", 8, 20);
	for (var i = 0; i < playerHealth; i++){
		context.drawImage(resources["shield"], 80 + i * 22, 20, 18, 18);
	}


	//layer 3: the game
	
	offsetX = (attachedPlanet >= 0) ? ((planets[attachedPlanet].cx + Math.sin(planets[attachedPlanet].player / (180 / Math.PI)) * (planets[attachedPlanet].radius + resources[playerName + playerWalkFrame].height / 2) - canvas.width / 2) + 19 * offsetX) / 20 : 0;
	offsetY = (attachedPlanet >= 0) ? ((planets[attachedPlanet].cy + Math.cos(planets[attachedPlanet].player / (180 / Math.PI)) * (planets[attachedPlanet].radius + resources[playerName + playerWalkFrame].height / 2) - canvas.height / 2) + 19 * offsetY) / 20 : 0;
	planets.forEach(function (element, index){
		context.fillStyle = element.colour;
		if (element.cx <= 1) element.cx = element.cx * canvas.width;
		if (element.cy <= 1) element.cy = element.cy * canvas.height;

		fillCircle(element.cx, element.cy, element.radius);

		if (attachedPlanet < 0) element.player = -1; 
	});

	if (attachedPlanet >= 0){
		if (keys[controls.leftArrow]) {
			planets[attachedPlanet].player += 1.4;
			playerLooksLeft = true;
		}
		if (keys[controls.rightArrow]) {
			planets[attachedPlanet].player -= 1.4;
			playerLooksLeft = false;
		}
		playerWalkState = (keys[controls.leftArrow] || keys[controls.rightArrow]);
		
		if (!playerWalkState) playerWalkFrame = (keys[controls.downArrow]) ? "_duck" : "_stand";
		if (++playerWalkCounter > ((keys[controls.leftShift]) ? 5 : 8)) {
			playerWalkCounter = 0;
			if (playerWalkState) playerWalkFrame = (playerWalkFrame === "_walk1") ? "_walk2" : "_walk1";		
		}		

	}

	drawRotatedImage(resources[playerName + playerWalkFrame],
		planets[attachedPlanet].cx + Math.sin(planets[attachedPlanet].player / (180 / Math.PI)) * (planets[attachedPlanet].radius + resources[playerName + playerWalkFrame].height / 2),
		planets[attachedPlanet].cy + Math.cos(planets[attachedPlanet].player / (180 / Math.PI)) * (planets[attachedPlanet].radius + resources[playerName + playerWalkFrame].height / 2),
		Math.PI - planets[attachedPlanet].player / (180 / Math.PI),
		playerLooksLeft);

	window.requestAnimationFrame(loop);
}

function keyInput(e){	
	if (e.type == "keydown") {
		if (e.keyCode == controls.escape) {
			var box = document.getElementById("info-box");
			box.className = (box.className == "info-box hidden") ?  "info-box" : "info-box hidden";
		}		
	}
	keys[e.keyCode] = (e.type == "keydown") | false;
	console.log(e.keyCode);
}

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

init();
window.addEventListener("keydown", keyInput);
window.addEventListener("keyup", keyInput);
