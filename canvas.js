"use strict";
var canvas = document.getElementById('canvas')
var context = canvas.getContext("2d");

function setUpCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	context.fillStyle = "#0A0B12";
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = "white";
	for(var i = 0; i != canvas.width; i++) {
		for(var j = 0; j != canvas.height; j++) {
			if(Math.random() < 0.0001) {
				console.log(i, j);
				context.fillRect(i, j, 1, 1);
			}
		}
	}
}

setUpCanvas();
window.addEventListener("resize", setUpCanvas);
