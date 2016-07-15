"use strict";

var resPaths = [
	"meteorBig1.svg", "meteorBig2.svg", "meteorBig3.svg", "meteorBig4.svg", "meteorMed1.svg", "meteorMed2.svg", "meteorSmall1.svg", "meteorSmall2.svg", "meteorTiny1.svg", "meteorTiny2.svg",
	"laserBeam.svg", "laserBeamDead.svg", "jetpack.svg", "jetpackFire.svg", "jetpackParticle.svg", "planet.svg",
	"heartFilled.svg", "heartHalfFilled.svg", "heartNotFilled.svg",
	//"goldCoin.svg", "silverCoin.svg", "bronzeCoin.svg",
	"alienBlue_duck.svg", "alienBlue_hurt.svg", "alienBlue_jump.svg", "alienBlue_stand.svg", "alienBlue_walk1.svg", "alienBlue_walk2.svg",
	"alienBeige_duck.svg", "alienBeige_hurt.svg", "alienBeige_jump.svg", "alienBeige_stand.svg", "alienBeige_walk1.svg", "alienBeige_walk2.svg",
	"alienGreen_duck.svg", "alienGreen_hurt.svg", "alienGreen_jump.svg", "alienGreen_stand.svg", "alienGreen_walk1.svg", "alienGreen_walk2.svg",
	"alienPink_duck.svg", "alienPink_hurt.svg", "alienPink_jump.svg", "alienPink_stand.svg", "alienPink_walk1.svg", "alienPink_walk2.svg",
	"alienYellow_duck.svg", "alienYellow_hurt.svg", "alienYellow_jump.svg", "alienYellow_stand.svg", "alienYellow_walk1.svg", "alienYellow_walk2.svg",
	"alienBlue_mouth_happy.svg", "alienBlue_mouth_unhappy.svg", "alienBlue_mouth_surprise.svg",
	"alienBeige_mouth_happy.svg", "alienBeige_mouth_unhappy.svg", "alienBeige_mouth_surprise.svg",
	"alienGreen_mouth_happy.svg", "alienGreen_mouth_unhappy.svg", "alienGreen_mouth_surprise.svg",
	"alienPink_mouth_happy.svg", "alienPink_mouth_unhappy.svg", "alienPink_mouth_surprise.svg",
	"alienYellow_mouth_happy.svg", "alienYellow_mouth_unhappy.svg", "alienYellow_mouth_surprise.svg",
	"astronaut_helmet.svg",
	"enemyBlack1.svg", "enemyBlack2.svg", "enemyBlack3.svg", "enemyBlack4.svg", "enemyBlack5.svg",
	"enemyBlue1.svg", "enemyBlue2.svg", "enemyBlue3.svg", "enemyBlue4.svg", "enemyBlue5.svg",
	"enemyGreen1.svg", "enemyGreen2.svg", "enemyGreen3.svg", "enemyGreen4.svg", "enemyGreen5.svg",
	"enemyRed1.svg", "enemyRed2.svg", "enemyRed3.svg", "enemyRed4.svg", "enemyRed5.svg",
	"rifleShot.svg", "lmg.svg", "smg.svg", "shotgun.svg", "knife.svg", "shotgunBall.svg", "muzzle.svg", "muzzle2.svg"
	];

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	var vinage = require("vinage"),
		Point = vinage.Point,
		Rectangle = vinage.Rectangle,
		Circle = vinage.Circle,
		Vector = vinage.Vector,
		resources = require("../../static/resource_loader.js");
}

const weaponList = {
	lmg: {offsetX: 13, offsetY: -15, cycle: 9, muzzleX: 81, muzzleY: 6, shotType: 1, spray: 0.025}, //offsetX and offsetY could be packed in one Object but it's kinda stupid having an Object in an Object in an Object
	smg: {offsetX: 13, offsetY: -3, cycle: 5, muzzleX: 58, muzzleY: -2, shotType: 1, spray: 0.04},
	shotgun: {offsetX: -13, offsetY: -5, cycle: -1, muzzleX: 84, muzzleY: 2, shotType: 3, spray: 0.08},
	knife: {offsetX: 23, offsetY: -20, cycle: -1, muzzleX: 23, muzzleY: 0, shotType: 2, spray: 0.005}
};

function Player(name, appearance, walkFrame, attachedPlanet, jetpack, health, fuel, armedWeapon, carriedWeapon, aimAngle) {
	this._walkCounter = 0;
	this.name = name;
	this.box = new Rectangle(new Point(0, 0), 0, 0);
	this.predictionTarget = {};
	this.predictionBase = {};
	this.controls = {jump: 0, crouch: 0, jetpack: 0, moveLeft: 0, moveRight: 0, run: 0, changeWeapon: 0, shoot: 0};
	this.velocity = new Vector(0, 0);
	this._appearance = appearance;
	this._walkFrame = "_stand";
	Object.defineProperties(this, {
		appearance: {
			get: function() {
				return this._appearance;
			},
			set: function(newAppearance) {
				this._appearance = newAppearance;
				this.setBoxSize();
			}
		},
		walkFrame: {
			get: function() {
				return this._walkFrame;
			},
			set: function(newWalkFrame) {
				this._walkFrame = newWalkFrame;
				this.setBoxSize();
			}
		}
	});
	this.jetpack = jetpack || false;
	if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
		this._lastHurt = 0;
		Object.defineProperty(this, "hurt", {
			get: function() {
				return Date.now() - this._lastHurt < 600;
			},
			set: function(hurt) {
				this._lastHurt = hurt ? Date.now() : 0;
			}
		});
	} else this.hurt = false;
	this.health = health || 8;
	this.fuel = fuel || 300;
	this.attachedPlanet = attachedPlanet || -1;
	this.lastlyAimedAt = Date.now();
	this.weaponry = {armed: armedWeapon || "lmg", carrying: carriedWeapon || "smg", cycle: 0, recoil: 0};
	this.aimAngle = aimAngle || 0;
	if (typeof module === "undefined" || typeof module.exports === "undefined") {
		this.panner = makePanner(0, 0);//note: won't be used if this is not another player
	}
}
Player.prototype.setWalkFrame = function() {
	if (this.box === undefined) return;
	if (this.attachedPlanet === -1){
		this.walkFrame = "_jump";
	} else {
		var leftOrRight = (this.controls["moveLeft"] || this.controls["moveRight"]);
		if (!leftOrRight) this.walkFrame = (this.controls["crouch"]) ? "_duck" : "_stand";
		else if (this._walkCounter++ >= (this.controls["run"] > 0 ? 6 : 10)){
			this._walkCounter = 0;
			this.walkFrame = (this.walkFrame === "_walk1") ? "_walk2" : "_walk1";
		}
		this.setBoxSize();
	}
};
Player.prototype.setBoxSize = function() {
//	console.log(this.appearance, this.walkFrame);
	this.box.width = resources[this.appearance + this.walkFrame].width
	this.box.height = resources[this.appearance + this.walkFrame].height;
};
Player.prototype.getFinalName = function() {
	return this.name + (typeof this.homographId === "number" && this.homographId !== 0 ? " (" + this.homographId + ")" : "");
}

function Planet(x, y, radius, type) {
	this.box = new Circle(new Point(x, y), radius);
	this.atmosBox = new Circle(this.box.center, Math.floor(radius * (1.5 + Math.random()/2)));
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

function Enemy(x, y, appearance) {
	this.appearance = appearance || "enemy" + this.resources[Math.floor(Math.random() * this.resources.length)];
	this.box = new Rectangle(new Point(x, y), resources[this.appearance].width, resources[this.appearance].height);
	this.aggroBox = new Circle(new Point(x, y), 350);
	this.fireRate = 0;
}
Enemy.prototype.resources = ["Black1", "Black2", "Black3", "Black4", "Black5", "Blue1", "Blue2", "Blue3", "Green1", "Green2", "Red1", "Red2", "Red3"];

function Shot(x, y, angle, origin, type) {
	this.box = new Rectangle(new Point(x, y), resources["laserBeam"].width, resources["laserBeam"].height, angle);
	this.lifeTime = 100;
	this.origin = origin;
	this.type = type || 0;
}
Shot.prototype.shotEnum = {laser: 0, bullet: 1, knife: 2, ball: 3}; //a knife is no shot but can be handled the same way
Shot.prototype.speed = [30, 25, 13, 22];

function doPrediction(universe, players, enemies, shots) {
	doPrediction.newTimestamp = Date.now();
	doPrediction.oldTimestamp = doPrediction.oldTimestamp || Date.now();

	function lerp(x, y, t) {
		//lerp = linear interpolation
		return x + t * (y - x);
	}
	function wrapOffset(x, y, size) {
		//shortcut
		if (Math.abs((x - size/2) - (y - size/2)) >= size*0.6) return (x > y ? -size : size);
		return 0;
	}

	var fps = 1000 / (doPrediction.newTimestamp - doPrediction.oldTimestamp);
	game.fps = fps;
	players.forEach(function(player) {
		if ("timestamp" in player.predictionTarget) {
			var now = Date.now(), serverTicks = 50,
				smoothingTime = (now - player.predictionTarget.timestamp) / serverTicks;

			var angleOffset = wrapOffset(player.predictionTarget.box.angle, player.predictionBase.box.angle, 2*Math.PI),
				xOffset = wrapOffset(player.predictionTarget.box.center.x, player.predictionBase.box.center.x, universe.width),
				yOffset = wrapOffset(player.predictionTarget.box.center.y, player.predictionBase.box.center.y, universe.height),
				aimAngleOffset = wrapOffset(player.predictionTarget.aimAngle, player.predictionBase.aimAngle, 2*Math.PI);

			player.box.angle = lerp(
				player.predictionBase.box.angle,
				player.predictionTarget.box.angle + angleOffset,
				smoothingTime
			);
			player.box.center.x = lerp(
				player.predictionBase.box.center.x,
				player.predictionTarget.box.center.x + xOffset,
				smoothingTime
			);
			player.box.center.y = lerp(
				player.predictionBase.box.center.y,
				player.predictionTarget.box.center.y + yOffset,
				smoothingTime
			);
			player.aimAngle = lerp(
				player.predictionBase.aimAngle,
				player.predictionTarget.aimAngle + aimAngleOffset,
				smoothingTime
			);
							
			player.box.angle = (2 * Math.PI + player.box.angle) % (2 * Math.PI);
			player.aimAngle = (2 * Math.PI + player.aimAngle) % (2 * Math.PI);
			player.box.center.x = (universe.width + player.box.center.x) % universe.width;
			player.box.center.y = (universe.height + player.box.center.y) % universe.height;
		}
	});
	shots.forEach(function(shot){
		shot.box.center.x += shot.speed[shot.type] * Math.sin(shot.box.angle) * (60 / fps);
		shot.box.center.y += shot.speed[shot.type] * -Math.cos(shot.box.angle) * (60 / fps);
	});
	doPrediction.oldTimestamp = doPrediction.newTimestamp;
}
doPrediction.oldTimestamp = 0;
doPrediction.newTimestamp = 0;

function doPhysics(universe, players, planets, enemies, shots, teamScores) {
	var playersOnPlanets = new Array(planets.length),
		entitiesDelta = {
			addedShots: [],
			removedShots: []
		};

	players.forEach(function(player) {
		if (player.attachedPlanet >= 0) {
			if (typeof playersOnPlanets[player.attachedPlanet] === "undefined") playersOnPlanets[player.attachedPlanet] = {"alienBeige": 0, "alienBlue": 0, "alienGreen": 0, "alienPink": 0, "alienYellow": 0};
			playersOnPlanets[player.attachedPlanet][player.appearance]++;
			player.jetpack = false;
			var stepSize = (Math.PI / 100) * (150 / planets[player.attachedPlanet].box.radius);
			if (player.controls["moveLeft"] > 0) {
				stepSize = stepSize * player.controls["moveLeft"];
				player.box.angle -= (player.controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
				player.looksLeft = true;
			}
			if (player.controls["moveRight"] > 0) {
				stepSize = stepSize * player.controls["moveRight"];
				player.box.angle += (player.controls["run"]) ? 1.7 * stepSize : 1 * stepSize;
				player.looksLeft = false;
			}
			if (player.controls["moveLeft"] === 0 && player.controls["moveRight"] === 0) {
				player.looksLeft = (player.aimAngle - player.box.angle + 2*Math.PI) % (2*Math.PI) > Math.PI;
			}

			player.box.center.x = planets[player.attachedPlanet].box.center.x + Math.sin(Math.PI - player.box.angle) * (planets[player.attachedPlanet].box.radius + player.box.height / 2);
			player.box.center.y = planets[player.attachedPlanet].box.center.y + Math.cos(Math.PI - player.box.angle) * (planets[player.attachedPlanet].box.radius + player.box.height / 2);
			player.velocity.x = 0;
			player.velocity.y = 0;
			player.fuel = 400;
			if (player.controls["jump"] > 0) {
				player.attachedPlanet = -1;
				player.velocity.x = Math.sin(player.box.angle) * 6;
				player.velocity.y = -Math.cos(player.box.angle) * 6;
				player.box.center.x += player.velocity.x;
				player.box.center.y += player.velocity.y;
			}
		} else {
			player.looksLeft = (player.aimAngle - player.box.angle + 2*Math.PI) % (2*Math.PI) > Math.PI;
			player.jetpack = false;
			for (var j = 0; j < planets.length; j++){
				var deltaX = planets[j].box.center.x - player.box.center.x,
					deltaY = planets[j].box.center.y - player.box.center.y,
					distPowFour = Math.pow(Math.pow(deltaX, 2) + Math.pow(deltaY, 2), 2);

				player.velocity.x += 9000 * planets[j].box.radius * deltaX / distPowFour;
				player.velocity.y += 9000 * planets[j].box.radius * deltaY / distPowFour;
				if (universe.collide(planets[j].box, player.box)) {
					player.attachedPlanet = j;
					player.box.angle = Math.PI + Math.trunc(player.box.angle / (2 * Math.PI)) * Math.PI * 2 - Math.atan2(deltaX, deltaY) - Math.PI;
				}
			}
			if (player.controls["jetpack"] > 0 && player.fuel > 0 && player.controls["crouch"] < 1){
				player.fuel -= player.controls["jetpack"];
				player.jetpack = (player.controls["jetpack"] > 0);
				player.velocity.x += (Math.sin(player.box.angle) / 6) * player.controls["jetpack"];
				player.velocity.y += (-Math.cos(player.box.angle) / 6) * player.controls["jetpack"];
			} else if (player.controls["crouch"] > 0){
				player.velocity.x = player.velocity.x * 0.987;
				player.velocity.y = player.velocity.y * 0.987;
			}
			var runMultiplicator = player.controls["run"] ? 1.7 : 1;
			if (player.controls["moveLeft"] > 0) player.box.angle -= (Math.PI / 60) * player.controls["moveLeft"] * runMultiplicator;
			if (player.controls["moveRight"] > 0) player.box.angle += (Math.PI / 60) * player.controls["moveRight"] * runMultiplicator;

			player.box.center.x += player.velocity.x;
			player.box.center.y += player.velocity.y;
			player.box.center.x = (universe.width + player.box.center.x) % universe.width;
			player.box.center.y = (universe.height + player.box.center.y) % universe.height;
		}
		if (player.controls["changeWeapon"] === 1) {
			var a = player.weaponry.armed, b = player.weaponry.carrying;
			player.weaponry.armed = b;
			player.weaponry.carrying = a;
		}
		if (player.controls["shoot"] !== 0) {
			if (player.controls["shoot"] === 2 && weaponList[player.weaponry.armed].cycle > 0) player.weaponry.cycle = ++player.weaponry.cycle % weaponList[player.weaponry.armed].cycle;
			else player.weaponry.cycle = player.controls["shoot"] - 1;

			if (player.weaponry.cycle === 0) {
				let shotType = weaponList[player.weaponry.armed].shotType, shift = player.looksLeft ? -1 : 1,
					inaccuracy = (2*Math.random()-1)*weaponList[player.weaponry.armed].spray;
				for (var i = -1; i <= 1; i++) {
					if (shotType !== 3 && i !== 0) continue;
					let shotX = player.box.center.x + weaponList[player.weaponry.armed].muzzleX * Math.sin(player.aimAngle) + weaponList[player.weaponry.armed].muzzleY * shift * Math.sin(player.aimAngle - Math.PI / 2),
						shotY = player.box.center.y - weaponList[player.weaponry.armed].muzzleX * Math.cos(player.aimAngle) - weaponList[player.weaponry.armed].muzzleY * shift * Math.cos(player.aimAngle - Math.PI / 2);
					let newShot = new Shot(shotX, shotY, player.aimAngle + i*0.12 + inaccuracy, player.pid, shotType);
					shots.push(newShot);
					entitiesDelta.addedShots.push(newShot);
				}
			}
		}
		var needsPressState = {"changeWeapon": null, "shoot": null}; //it needs to be an Object to use the operater `in`
		for (var key in player.controls) if (player.controls[key] !== 0 && key in needsPressState) player.controls[key] = 2;
		player.setWalkFrame();
	});
	shots.forEach(function(shot, si) {
		let velocity = shot.speed[shot.type];
		shot.box.center.x += Math.sin(shot.box.angle) * velocity;
		shot.box.center.y += -Math.cos(shot.box.angle) * velocity;
		shot.box.center.x = (universe.width + shot.box.center.x) % universe.width;
		shot.box.center.y = (universe.height + shot.box.center.y) % universe.height;
		if (--shot.lifeTime <= 0) {
			entitiesDelta.removedShots.push(shot);
			shots.splice(si, 1);
		} else if (!players.some(function(player) {
			if (player.constructor !== Player) return;
			if (player.pid !== shot.origin && universe.collide(shot.box, player.box)) {
				player.health -= (player.health === 0) ? 0 : 1;
				if (player.health <= 0) {
					var suitablePlanets = [];
					planets.forEach(function(planet, pi) {
						if (planet.progress.team === player.appearance) suitablePlanets.push(pi);
					});
					player.box.angle = 0;
					if (suitablePlanets.length === 0) player.attachedPlanet = Math.floor(Math.random() * planets.length);
					else player.attachedPlanet = suitablePlanets[Math.floor(Math.random() * suitablePlanets.length)];
					player.health = 8;
					player.fuel = 300;
					teamScores[player.appearance] -= 5;
				}
				player.hurt = true;
				entitiesDelta.removedShots.push(shot);
				shots.splice(si, 1);
				return true;
			}
		})) planets.some(function(planet) {
			if (universe.collide(shot.box, planet.box)) {
				entitiesDelta.removedShots.push(shot);
				shots.splice(si, 1);
				return true;
			}
		});
	});
	enemies.forEach(function(enemy) {
		var playerToHit = null;
		players.forEach(function(player) {
			if (universe.collide(enemy.aggroBox, player.box) && (playerToHit === null || player.lastlyAimedAt < playerToHit.lastlyAimedAt)) {
				playerToHit = player;
			}
		});
		if (playerToHit === null) {
			enemy.fireRate = 0;
			enemy.box.angle += Math.PI/150;
		} else {
			enemy.box.angle = Math.PI - Math.atan2(enemy.box.center.x - playerToHit.box.center.x, enemy.box.center.y - playerToHit.box.center.y);
			if (++enemy.fireRate >= 20) {
				playerToHit.lastlyAimedAt = Date.now();
				enemy.fireRate = 0;
				let newShot = new Shot(enemy.box.center.x, enemy.box.center.y, enemy.box.angle - Math.PI, -1, 0);
				shots.push(newShot);
				entitiesDelta.addedShots.push(newShot);
			}
		}
	});

	for (var i = 0; i < playersOnPlanets.length; i++){
		if (typeof playersOnPlanets[i] === "undefined") continue;
		var toArray = Object.keys(playersOnPlanets[i]).map(function (key){return playersOnPlanets[i][key];}),
			max = Math.max.apply(null, toArray),
			teams = ["alienBeige", "alienBlue", "alienGreen", "alienPink", "alienYellow"];

		if (max > 0) {
			var team, a, b = 0;
			while (toArray.indexOf(max) !== -1) {
				a = toArray.indexOf(max);
				b++;
				toArray.splice(a, 1);
			}
			if (b >= 2) return entitiesDelta;
			team = teams[a];
			if (team === planets[i].progress.team) planets[i].progress.value = (planets[i].progress.value + (max / 3) > 100) ? 100 : planets[i].progress.value + (max / 3);
			else {
				planets[i].progress.value -= max / 3;
				if (planets[i].progress.value <= 0) planets[i].progress = {value: 0, team: team};
			}
		}
	}

	return entitiesDelta;
}

function doPhysicsClient(universe, planets, shots, players) {
	shots.forEach(function(shot, si) {
		if (--shot.lifeTime === 0 ||
			players.some(function(player) { if (player.pid !== shot.origin && universe.collide(shot.box, player.box)) return true;  }) ||
			planets.some(function(planet) { if (universe.collide(shot.box, planet.box)) return true; })) shots.splice(si, 1);
		//delete shot, if lifetime equals 0 OR collision with a player that hasn't shot the shot OR collision with a planet
	});
}

if (typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = module.exports = {
	doPhysics: doPhysics,
	Player: Player,
	Planet: Planet,
	Enemy: Enemy,
	Shot: Shot
};
