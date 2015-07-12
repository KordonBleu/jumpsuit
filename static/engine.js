//Game engine to be shared between the client and server
"use strict";

Math.map = function(x, in_min, in_max, out_min, out_max) {
	//mapping a value x from a range to another range to allow scaling or moving values easily
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}
String.prototype.ucFirst = function (){
	//uppercasing the first letter
	return this.charAt(0).toUpperCase() + this.slice(1);
}

function Planet(x, y, radius, color, enemyAmount) {
	this.box = new Circle(new Point(x, y), radius);
	this.atmosBox = new Circle(this.box.center, radius * (1.5 + Math.random()/2));
	this.color = color;
	this.player = -1;

	this.enemies = [];
	var lastEnemyAng = 0;
	for (var j = 0; j < enemyAmount; j++) {
		var enemyAng = Math.map(Math.random(), 0, 1, lastEnemyAng + Math.PI / 4, lastEnemyAng + Math.PI * 1.875),
			enemyDistance = Math.floor(Math.map(Math.random(), 0, 1, this.atmosBox.radius, this.atmosBox.radius * 4));
		this.enemies[j] = new Enemy(Math.sin(enemyAng) * enemyDistance + this.box.center.x, -Math.cos(enemyAng) * enemyDistance + this.box.center.y);
		lastEnemyAng = enemyAng;
	}
}
function Enemy(x, y, appearance) {
	this.x = x;
	this.y = y;
	this.appearance = appearance !== undefined ? appearance : "enemy" + this.resources[Math.floor(Math.random() * this.resources.length)];
	this.box = new Rectangle(new Point(x, y), resources[this.appearance].width, resources[this.appearance].height);
	this.aggroBox = new Circle(new Point(x, y), 350);
	this.fireRate = 0;
	this.angle = 0
	this.shots = [];
}
Enemy.prototype.resources = ["Black1", "Black2", "Black3", "Black4", "Black5", "Blue1", "Blue2", "Blue3", "Green1", "Green2", "Red1", "Red2", "Red3"];

var planets = [
		//emptiness
	],
	planetColours = [
		"rgb(255,51,51)",
		"rgb(220,170,80)",
		"rgb(120, 240,60)",
		"rgb(12,135,242)",
		"rgb(162,191,57)",
		"rgb(221,86,41)",
		"rgb(54,38,127)",
		"rgb(118,33,129)"
	],
	chunks = [
		//emptiness
	],
	chunkSize = 4000;
//the server knows the content of all chunks
//the client is only aware of the chunk where it is and the 8 chunks around it
chunks.chunkExist = function(x, y) {
	var result = -1;
	this.forEach(function (element, index) {
		if (element.x === x && element.y === y) {
			result = index;
			return;
		}
	});
	return result;
}
chunks.removeChunk = function (x, y) {
	var c = this.chunkExist(x, y);
	if (c < 0) return;

	for (var i = 0; i < planets.length; i++) {
		if (planets[i].box.center.x >= x * chunkSize && planets[i].box.center.x <= (x + 1) * chunkSize && planets[i].box.center.y >= y * chunkSize && planets[i].box.center.y <= (y + 1) * chunkSize) {
			planets.splice(i,1);
			i--;
		}
	}

	chunks.splice(c, 1);
}
chunks.addChunk = function (x, y) {
	if (this.chunkExist(x, y) >= 0) return;
	var planetsAmount = Math.floor(Math.map(Math.random(), 0, 1, 2, 6));

	for (var i = 0; i < planetsAmount; i++) {
		var planetRadius = Math.map(Math.random(), 0, 1, 150, (chunkSize - 150) / (3 * planetsAmount)),
			planetColour = planetColours[Math.floor(Math.random() * planetColours.length)],
			enemyAmount = Math.floor(Math.map(Math.random(), 0, 1, 0, (planetRadius < 200) ? 2 : 4)),
			planetPosition = {px: (((i + 1) / planetsAmount) + x) * chunkSize, py: Math.map(Math.random(), 0, 1, y * chunkSize, (y + 1) * chunkSize)};

		planets.push(new Planet(planetPosition.px, planetPosition.py, planetRadius, planetColour, enemyAmount));
	}
	chunks.push({x: x, y: y});
}

//resources need to be loaded in `resources` to have the following function working
function doPhysics() {
	planets.forEach(function (planet) {
		planet.enemies.forEach(function (enemy, ei) {
			if (!(enemy.aggroBox.collision(player.box))){
				enemy.box.angle = enemy.box.angle + Math.PI / 150;
				enemy.fireRate = 0;
			} else {
				enemy.box.angle = Math.PI - Math.atan2(enemy.box.center.x - player.box.center.x, enemy.box.center.y - player.box.center.y);
				if (++enemy.fireRate >= 20) {
					enemy.fireRate = 0;
					//SHOT.BOX SHOULD NOT BE A CIRCLE BUT A RECTANGLE
					//TODO: replace this once obbObb collisions are supported
					enemy.shots.push({box: new Rectangle(new Point(enemy.box.center.x, enemy.box.center.y), resources["laserBeam"].width, resources["laserBeam"].height, enemy.box.angle - Math.PI), lt: 200});//lt = lifetime
					playSound("laser");//TODO: the server must tell the client to play this sound
				}
			}
			enemy.shots.forEach(function (shot, si) {
				shot.box.center.x += (shot.lt <= 0) ? 0 : Math.sin(shot.box.angle) * 11;
				shot.box.center.y += (shot.lt <= 0) ? 0 : -Math.cos(shot.box.angle) * 11;
				if (--shot.lt <= -20) enemy.shots.splice(si, 1);
				else if (shot.box.collision(player.box)){
					player.health -= (player.health = 0) ? 0 : 1;
					enemy.shots.splice(si, 1);
				}
			});
		});
	});

	if (player.attachedPlanet >= 0){
		var stepSize = Math.PI * 0.007 * (150 / planets[player.attachedPlanet].box.radius);
		if (controls["moveLeft"] > 0){
			stepSize = stepSize * controls["moveLeft"];
			planets[player.attachedPlanet].player += (controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
			player.looksLeft = true;
		}
		if (controls["moveRight"] > 0){
			stepSize = stepSize * controls["moveRight"];
			planets[player.attachedPlanet].player -= (controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
			player.looksLeft = false;
		}
		player.walkState = (controls["moveLeft"] || controls["moveRight"]);

		if (!player.walkState) player.walkFrame = (controls["crouch"]) ? "_duck" : "_stand";
		if (++player.walkCounter > ((controls["run"]) ? 5 : 9)){
			player.walkCounter = 0;
			if (player.walkState) player.walkFrame = (player.walkFrame === "_walk1") ? "_walk2" : "_walk1";
		}
		player.box.center.x = planets[player.attachedPlanet].box.center.x + Math.sin(planets[player.attachedPlanet].player) * (planets[player.attachedPlanet].box.radius + resources[player.name + player.walkFrame].height / 2);
		player.box.center.y = planets[player.attachedPlanet].box.center.y + Math.cos(planets[player.attachedPlanet].player) * (planets[player.attachedPlanet].box.radius + resources[player.name + player.walkFrame].height / 2);
		player.box.angle = Math.PI - planets[player.attachedPlanet].player;
		player.velX = 0;
		player.velY = 0;
		player.fuel = 300;

		if (controls["jump"] > 0) {
			player.attachedPlanet = -1;
			player.walkFrame = "_jump";
			player.velX = Math.sin(player.box.angle) * 6;
			player.velY = -Math.cos(player.box.angle) * 6;

			player.box.center.x += player.velX;
			player.box.center.y += player.velY;
		}
	} else {
		var chunkX = Math.floor(player.box.center.x / chunkSize),
			chunkY = Math.floor(player.box.center.y / chunkSize);

		if (chunkX !== player.oldChunkX || chunkY !== player.oldChunkY){
			for (var y = -3; y <= 3; y++){
				for (var x = -3; x <= 3; x++){
					if (y >= -1 && y <= 1 && x >= -1 && x <= 1) chunks.addChunk(chunkX + x, chunkY + y);
					else chunks.removeChunk(chunkX + x, chunkY + y);
				}
			}
		}

		player.oldChunkX = chunkX;
		player.oldChunkY = chunkY;

		planets.forEach(function (planet, pi){
			var deltaX = planet.box.center.x - player.box.center.x,
				deltaY = planet.box.center.y - player.box.center.y,
				distPowFour = Math.pow(Math.pow(deltaX, 2) + Math.pow(deltaY, 2), 2);

			player.velX += 9000 * planet.box.radius * deltaX / distPowFour;
			player.velY += 9000 * planet.box.radius * deltaY / distPowFour;

			if (planet.box.collision(player.box)) {
				player.attachedPlanet = pi;
				planet.player = Math.atan2(deltaX, deltaY) + Math.PI;
			}
		});

		if(controls["jetpack"] > 0 && player.fuel > 0 && controls["crouch"] < 1){
			player.fuel-= controls["jetpack"];
			player.velX += (Math.sin(player.box.angle) / 10) * controls["jetpack"];
			player.velY += (-Math.cos(player.box.angle) / 10) * controls["jetpack"];
		} else if (controls["crouch"] > 0){
			player.velX = player.velX * 0.987;
			player.velY = player.velY * 0.987;
		}

		var runMultiplicator = controls["run"] ? 1.7 : 1;
		if (controls["moveLeft"] > 0) player.box.angle -= (Math.PI / 140) * controls["moveLeft"] * runMultiplicator;
		if (controls["moveRight"] > 0) player.box.angle += (Math.PI / 140) * controls["moveRight"] * runMultiplicator;

		player.box.center.x += player.velX;
		player.box.center.y += player.velY;
	}
}