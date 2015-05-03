"use strict";
var canvas = document.getElementById('canvas')

function sizeCanvas() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
}

sizeCanvas();
window.addEventListener("resize", sizeCanvas);
