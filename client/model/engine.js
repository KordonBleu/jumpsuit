import modulo from '../../shared/modulo.js';

export function doPhysicsClient(universe, planets, shots, players) {
	shots.forEach(function(shot, si) {
		if (--shot.lifeTime === 0 ||
			players.some(function(player) { if (player.pid !== shot.origin && universe.collide(shot.box, player.box)) return true;  }) ||
			planets.some(function(planet) { if (universe.collide(shot.box, planet.box)) return true; })) shots.splice(si, 1);
		//delete shot, if lifetime equals 0 OR collision with a player that hasn't shot the shot OR collision with a planet
	});
}

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
			let now = Date.now(),
				serverTicks = 50,
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
		shot.box.center.x = modulo(shot.box.center.x, universe.width);
		shot.box.center.y = modulo(shot.box.center.y, universe.height);
	});
	doPrediction.oldTimestamp = doPrediction.newTimestamp;
}
doPrediction.oldTimestamp = 0;
doPrediction.newTimestamp = 0;


export * from '../../shared/engine.js';
