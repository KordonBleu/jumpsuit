"use strict";

if (vinage === undefined) var vinage = require("vinage");

function Planet(x, y, radius, type) {
	this.box = new vinage.Circle(new vinage.Point(x, y), radius);
	this.atmosBox = new vinage.Circle(this.box.center, Math.floor(radius * (1.5 + Math.random()/2)));
	this.progress = {team: "neutral", value: 0, color: "rgb(80,80,80)"};
	this.type = type || Math.round(Math.random());
}
Planet.prototype.typeEnum = {
	CONCRETE: 0,
	GRASS: 1
};
Planet.prototype.teamColors = {"alienBeige": "#e5d9be", "alienBlue": "#a2c2ea", "alienGreen": "#8aceb9", "alienPink": "#f19cb7", "alienYellow": "#fed532" };
Planet.prototype.updateColor = function() {
	if (this.progress.team === "neutral") this.progress.color = "rgb(80,80,80)";
	else {
		var fadeRGB = [];
		for (var j = 0; j <= 2; j++) fadeRGB[j] = Math.round(this.progress.value / 100 * (parseInt(this.teamColors[this.progress.team].substr(1 + j * 2, 2), 16) - 80) + 80);

		this.progress.color = "rgb(" + fadeRGB[0] + "," + fadeRGB[1] + "," + fadeRGB[2] + ")";
	}
};

if (typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = Planet;
