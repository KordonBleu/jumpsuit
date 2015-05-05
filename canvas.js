"use strict";
var canvas = document.getElementById('canvas');
var context = canvas.getContext("2d");

var resources = {}, keys = [], progress = 0, meteors = [];

function init(){
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	var pathes = {
		background: "assets/background.png",
		meteorBig: "assets/meteorBig.png",
		meteorBig2: "assets/meteorBig2.png",
		meteorMed: "assets/meteorMed.png",
		meteorMed2: "assets/meteorMed2.png",
		meteorSmall: "assets/meteorSmall.png",
		meteorTiny: "assets/meteorTiny.png"
	};

	for (var r in pathes){
		resources[r] = new Image();
		resources[r].src = pathes[r];
		resources[r].onload = loadProcess;	
	}
}

function loadProcess(e){
	progress++;
	context.fillStyle = "#121012";
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "#007d6c";
	context.fillRect(0, 0, (progress / 7) * canvas.width, 15);

	if (progress == 7) loop();
}

function loop() {	
	setTimeout(function(){
		context.clearRect(0, 0, canvas.width, canvas.height);
		//draw bg
		for (var i = 0; i < Math.floor(canvas.width / 256) + 1; i++){
			for (var j = 0; j < Math.floor(canvas.height / 256) + 1; j++){
				context.drawImage(resources["background"], i * 256, j * 256);
			}
		}

		if (Math.random() < 0.01){
			//spawns a random meteor - why random? random y-position, random speed, random appearal, random angle
			var m_height = Math.map(Math.random(), 0, 1, 50, canvas.height - 50),
			m_resources = ["meteorMed2", "meteorMed", "meteorSmall", "meteorTiny"],
			m_res = m_resources[Math.floor(Math.random() * 4)],
			m_speed = Math.map(Math.random(), 0, 1, 2, 4),
			m_ang = Math.map(Math.random(), 0, 1, 45, 135);

			meteors.splice(meteors.length,0,[0, m_height, m_res, m_speed, m_ang]);
		}

		meteors.forEach(function(m, i){
			m[0] += Math.sin(m[4] * (Math.PI / 180)) * m[3];
			m[1] += Math.cos(m[4] * (Math.PI / 180)) * m[3];			
			if (m[0] > canvas.width + 10 || m[1] > canvas.height + 10) meteors.splice(i, 1);			
			else context.drawImage(resources[m[2]], m[0], m[1]);
		});		

		loop();
	}, 1000 / 60); //60FPS	
}

function keyInput(e){
	keys[e.keyCode] = (e.type == "keydown") | false;
}

Math.map = function(x, in_min, in_max, out_min, out_max) {
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

init();

window.addEventListener("keydown", keyInput);
window.addEventListener("keyup", keyInput);