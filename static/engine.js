//Game engine to be shared between the client and server
"use strict";

var resPaths = [
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
	],
	resources = {};

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	var collisions = require("./collisions.js"),
		Point = collisions.Point,
		Rectangle = collisions.Rectangle,
		Circle = collisions.Circle,
		Vector = collisions.Vector,
		sizeOf = require("image-size");
		resPaths.forEach(function(path) {
			resources[path.slice(0, path.lastIndexOf("."))] = sizeOf("./static/assets/images/" + path);
		});
}

Math.map = function(x, in_min, in_max, out_min, out_max) {
	//mapping a value x from a range to another range to allow scaling or moving values easily
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
function Player(name, appearance, startx, starty, ws){
	this._walkCounter = 0;
	this.name = name;
	this.appearance = appearance;
	this.ws = ws;
	this.box = new Rectangle(new Point(startx, starty), resources[this.appearance + "_stand"].width, resources[this.appearance + "_stand"].height);
	this.controls = {jump: 0, crouch: 0, jetpack: 0, moveLeft: 0, moveRight: 0, run: 0};
	this.velocity = new Vector(0, 0);
	this.setWalkframe = function(){
		if (this.attachedPlanet === -1){
			this.walkFrame = "_jump";
		} else {
			var leftOrRight = (this.controls["moveLeft"] || this.controls["moveRight"]);
			if (!leftOrRight) this.walkFrame = (this.controls["crouch"]) ? "_duck" : "_stand";
			//this is some cool shit
			if ((this._walkCounter = ++this._walkCounter % (this.controls["run"]) ? 6 : 10) === 0) if (leftOrRight) this.walkFrame = (players[i].walkFrame === "_walk1") ? "_walk2" : "_walk1";		
			this.box.width = resources[this.appearance + this.walkFrame].width;
			this.box.height = resources[this.appearance + this.walkFrame].height;
		}
	}
	this.walkFrame = "_stand";
	this.health = 10;
	this.fuel = 400;
	this.attachedPlanet = -1;
	this.planet = 0;
}

function Planet(x, y, radius) {
	this.box = new Circle(new Point(x, y), radius);
	this.atmosBox = new Circle(this.box.center, radius * (1.5 + Math.random()/2));
	this.progress = {team: "neutral", value: 0};
}
Planet.prototype.teamColours = {"alienBeige": "#e5d9be", "alienBlue": "#a2c2ea", "alienGreen": "#8aceb9", "alienPink": "#f19cb7", "alienYellow": "#fed532" };

function Enemy(x, y) {
	this.box = new Rectangle(new Point(x, y), 0, 0);
	this.appearance = "enemy" + this.resources[Math.floor(Math.random() * this.resources.length)];
	this.aggroBox = new Circle(new Point(x, y), 350);
	this.fireRate = 0;
	this.shots = [];
}
Enemy.prototype.resources = ["Black1", "Black2", "Black3", "Black4", "Black5", "Blue1", "Blue2", "Blue3", "Green1", "Green2", "Red1", "Red2", "Red3"];

function doPhysics(players, planets, enemies) {
	for (var i = 0; i < players.length; i++){
		if (players[i] === undefined) continue;
	
		for (var enemy, ei = 0; ei < enemies.length; ei++){
			enemy = enemies[ei];
			if (!(enemy.aggroBox.collision(players[i].box))){
				enemy.box.angle = enemy.box.angle + Math.PI / 150;
				enemy.fireRate = 0;
			} else {
				enemy.box.angle = Math.PI - Math.atan2(enemy.box.center.x - players[i].box.center.x, enemy.box.center.y - players[i].box.center.y);
				if (++enemy.fireRate >= 20) {
					enemy.fireRate = 0;
					enemy.shots.push({box: new Rectangle(new Point(enemy.box.center.x, enemy.box.center.y), resources["laserBeam"].width, resources["laserBeam"].height, enemy.box.angle - Math.PI), lt: 200});
				}
			}
			for (var shot, si = 0; si < enemy.shots.length; si++){
				shot = enemy.shots[si];
				shot.box.center.x += (shot.lt <= 0) ? 0 : Math.sin(shot.box.angle) * 11;
				shot.box.center.y += (shot.lt <= 0) ? 0 : -Math.cos(shot.box.angle) * 11;
				if (--shot.lt <= -20) enemy.shots.splice(si, 1);
				else if (shot.box.collision(players[i].box)){
					players[i].health -= (players[i].health = 0) ? 0 : 1;
					enemy.shots.splice(si, 1);
				}
			}
		}
		
		if (players[i].attachedPlanet >= 0){
			var stepSize = Math.PI * 0.007 * (150 / planets[players[i].attachedPlanet].box.radius);
			if (players[i].controls["moveLeft"] > 0){
				stepSize = stepSize * players[i].controls["moveLeft"];
				players[i].planet += (players[i].controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
				players[i].looksLeft = true;
			}
			if (players[i].controls["moveRight"] > 0){
				stepSize = stepSize * players[i].controls["moveRight"];
				players[i].planet -= (players[i].controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
				players[i].looksLeft = false;
			}
		
			players[i].box.center.x = planets[players[i].attachedPlanet].box.center.x + Math.sin(players[i].planet) * (planets[players[i].attachedPlanet].box.radius + players[i].box.height / 2);
			players[i].box.center.y = planets[players[i].attachedPlanet].box.center.y + Math.cos(players[i].planet) * (planets[players[i].attachedPlanet].box.radius + players[i].box.height / 2)
			players[i].box.angle = Math.PI - players[i].planet;
			players[i].velocity.x = 0;
			players[i].velocity.y = 0;
			players[i].fuel = 300;
			if (players[i].controls["jump"] > 0) {
				players[i].attachedPlanet = -1;				
				players[i].velocity.x = Math.sin(players[i].box.angle) * 6;
				players[i].velocity.y = -Math.cos(players[i].box.angle) * 6;
				players[i].box.center.x += players[i].velocity.x;
				players[i].box.center.y += players[i].velocity.y;
			}
		} else {			
			for (var j = 0; j < planets.length; j++){
				var deltaX = planets[j].box.center.x - players[i].box.center.x,
					deltaY = planets[j].box.center.y - players[i].box.center.y,
					distPowFour = Math.pow(Math.pow(deltaX, 2) + Math.pow(deltaY, 2), 2);

				players[i].velocity.x += 9000 * planets[j].box.radius * deltaX / distPowFour;
				players[i].velocity.y += 9000 * planets[j].box.radius * deltaY / distPowFour;
				if (planets[j].box.collision(players[i].box)) {
					players[i].attachedPlanet = j;
					players[i].planet = Math.atan2(deltaX, deltaY) + Math.PI;
				}
			}
			if (players[i].controls["jetpack"] > 0 && players[i].fuel > 0 && players[i].controls["crouch"] < 1){
				players[i].fuel -= players[i].controls["jetpack"];
				players[i].velocity.x += (Math.sin(players[i].box.angle) / 10) * players[i].controls["jetpack"];
				players[i].velocity.y += (-Math.cos(players[i].box.angle) / 10) * players[i].controls["jetpack"];
			} else if (players[i].controls["crouch"] > 0){
				players[i].velocity.x = players[i].velocity.x * 0.987;
				players[i].velocity.y = players[i].velocity.y * 0.987;
			}
			var runMultiplicator = players[i].controls["run"] ? 1.7 : 1;
			if (players[i].controls["moveLeft"] > 0) players[i].box.angle -= (Math.PI / 140) * players[i].controls["moveLeft"] * runMultiplicator;
			if (players[i].controls["moveRight"] > 0) players[i].box.angle += (Math.PI / 140) * players[i].controls["moveRight"] * runMultiplicator;

			players[i].box.center.x += players[i].velocity.x;
			players[i].box.center.y += players[i].velocity.y;
		}
		players[i].setWalkframe();
	}
	return new Date();
}


if(typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = module.exports = {
	doPhysics: doPhysics,
	Player: Player,
	Planet: Planet,
	Enemy: Enemy
}
