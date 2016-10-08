import modulo from './modulo.js';
import Shot from '<@Shot@>';
import Player from '<@Player@>';

export function doPrediction(universe, players, enemies, shots) {
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

	let fps = 1000 / (doPrediction.newTimestamp - doPrediction.oldTimestamp);
	players.forEach(function(player) {
		if ('timestamp' in player.predictionTarget) {
			let now = Date.now(), serverTicks = 50,
				smoothingTime = (now - player.predictionTarget.timestamp) / serverTicks;

			let angleOffset = wrapOffset(player.predictionTarget.box.angle, player.predictionBase.box.angle, 2*Math.PI),
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

			player.box.angle = modulo(player.box.angle, 2 * Math.PI);
			player.aimAngle = modulo(player.aimAngle, 2 * Math.PI);
			player.box.center.x = modulo(player.box.center.x, universe.width);
			player.box.center.y = modulo(player.box.center.y, universe.height);
		}
	});
	shots.forEach(function(shot){
		shot.box.center.x += shot.speed[shot.type] * Math.sin(shot.box.angle) * (60 / fps);
		shot.box.center.y += shot.speed[shot.type] * -Math.cos(shot.box.angle) * (60 / fps);
		console.log(shot.box.center.x);
		shot.box.center.x = modulo(shot.box.center.x, universe.width);
		shot.box.center.y = modulo(shot.box.center.y, universe.height);
	});
	doPrediction.oldTimestamp = doPrediction.newTimestamp;
}
doPrediction.oldTimestamp = 0;
doPrediction.newTimestamp = 0;

export function doPhysics(universe, players, planets, enemies, shots, teamScores) {
	let playersOnPlanets = new Array(planets.length),
		entitiesDelta = {
			addedShots: [],
			removedShots: []
		};

	players.forEach(function(player) {
		if (player.attachedPlanet >= 0) {
			if (typeof playersOnPlanets[player.attachedPlanet] === 'undefined') playersOnPlanets[player.attachedPlanet] = {'alienBeige': 0, 'alienBlue': 0, 'alienGreen': 0, 'alienPink': 0, 'alienYellow': 0};
			playersOnPlanets[player.attachedPlanet][player.appearance]++;
			player.jetpack = false;
			let stepSize = (Math.PI / 100) * (150 / planets[player.attachedPlanet].box.radius);
			if (player.controls['moveLeft'] > 0) {
				stepSize = stepSize * player.controls['moveLeft'];
				player.box.angle -= (player.controls['run']) ? 1.7 * stepSize : 1 * stepSize;
				player.looksLeft = true;
			}
			if (player.controls['moveRight'] > 0) {
				stepSize = stepSize * player.controls['moveRight'];
				player.box.angle += (player.controls['run']) ? 1.7 * stepSize : 1 * stepSize;
				player.looksLeft = false;
			}
			if (player.controls['moveLeft'] === 0 && player.controls['moveRight'] === 0) {
				player.looksLeft = modulo(player.aimAngle - player.box.angle, 2*Math.PI) > Math.PI;
			}

			player.box.center.x = planets[player.attachedPlanet].box.center.x + Math.sin(Math.PI - player.box.angle) * (planets[player.attachedPlanet].box.radius + player.box.height / 2);
			player.box.center.y = planets[player.attachedPlanet].box.center.y + Math.cos(Math.PI - player.box.angle) * (planets[player.attachedPlanet].box.radius + player.box.height / 2);
			player.velocity.x = 0;
			player.velocity.y = 0;
			player.fuel = 400;
			if (player.controls['jump'] > 0) {
				player.attachedPlanet = -1;
				player.velocity.x = Math.sin(player.box.angle) * 6;
				player.velocity.y = -Math.cos(player.box.angle) * 6;
				player.box.center.x += player.velocity.x;
				player.box.center.y += player.velocity.y;
			}
		} else {
			player.looksLeft = (player.aimAngle - player.box.angle + 2*Math.PI) % (2*Math.PI) > Math.PI;
			player.jetpack = false;
			for (let j = 0; j < planets.length; j++){
				let deltaX = planets[j].box.center.x - player.box.center.x,
					deltaY = planets[j].box.center.y - player.box.center.y,
					distPowFour = Math.pow(Math.pow(deltaX, 2) + Math.pow(deltaY, 2), 2);

				player.velocity.x += 9000 * planets[j].box.radius * deltaX / distPowFour;
				player.velocity.y += 9000 * planets[j].box.radius * deltaY / distPowFour;
				if (universe.collide(planets[j].box, player.box)) {
					player.attachedPlanet = j;
					player.box.angle = Math.PI + Math.trunc(player.box.angle / (2 * Math.PI)) * Math.PI * 2 - Math.atan2(deltaX, deltaY) - Math.PI;
				}
			}
			if (player.controls['jetpack'] > 0 && player.fuel > 0 && player.controls['crouch'] < 1){
				player.fuel -= player.controls['jetpack'];
				player.jetpack = (player.controls['jetpack'] > 0);
				player.velocity.x += (Math.sin(player.box.angle) / 6) * player.controls['jetpack'];
				player.velocity.y += (-Math.cos(player.box.angle) / 6) * player.controls['jetpack'];
			} else if (player.controls['crouch'] > 0){
				player.velocity.x = player.velocity.x * 0.987;
				player.velocity.y = player.velocity.y * 0.987;
			}
			let runMultiplicator = player.controls['run'] ? 1.7 : 1;
			if (player.controls['moveLeft'] > 0) player.box.angle -= (Math.PI / 60) * player.controls['moveLeft'] * runMultiplicator;
			if (player.controls['moveRight'] > 0) player.box.angle += (Math.PI / 60) * player.controls['moveRight'] * runMultiplicator;

			player.box.center.x += player.velocity.x;
			player.box.center.y += player.velocity.y;
			player.box.center.x = (universe.width + player.box.center.x) % universe.width;
			player.box.center.y = (universe.height + player.box.center.y) % universe.height;
		}
		if (player.controls['changeWeapon'] === 1) [player.armedWeapon, player.carriedWeapon] = [player.carriedWeapon, player.armedWeapon];

		if (player.controls['shoot'] === 1 || (player.controls['shoot'] === 2 && player.armedWeapon.canRapidFire !== undefined && player.armedWeapon.canRapidFire())) {
			for (let shot of player.armedWeapon.fire()) {
				shots.push(shot);
				entitiesDelta.addedShots.push(shot);
			}
		}
		let needsPressState = {'changeWeapon': null, 'shoot': null}; //it needs to be an Object to use the operater `in`
		for (let key in player.controls) if (player.controls[key] !== 0 && key in needsPressState) player.controls[key] = 2;
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
					let suitablePlanets = [];
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
		let playerToHit = null;
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

	for (let i = 0; i < playersOnPlanets.length; i++){
		if (typeof playersOnPlanets[i] === 'undefined') continue;
		let toArray = Object.keys(playersOnPlanets[i]).map(function (key){return playersOnPlanets[i][key];}),
			max = Math.max.apply(null, toArray),
			teams = ['alienBeige', 'alienBlue', 'alienGreen', 'alienPink', 'alienYellow'];

		if (max > 0) {
			let team, a, b = 0;
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
