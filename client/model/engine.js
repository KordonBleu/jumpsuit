export function doPhysicsClient(universe, planets, shots, players) {
	shots.forEach(function(shot, si) {
		if (--shot.lifeTime === 0 ||
			players.some(function(player) { if (player.pid !== shot.origin && universe.collide(shot.box, player.box)) return true;  }) ||
			planets.some(function(planet) { if (universe.collide(shot.box, planet.box)) return true; })) shots.splice(si, 1);
		//delete shot, if lifetime equals 0 OR collision with a player that hasn't shot the shot OR collision with a planet
	});
}

export * from '../../shared/engine.js';
