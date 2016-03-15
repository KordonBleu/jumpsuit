"use strict";

module.exports = function(engine) {
	function handleActionOne(player, angle, lobby) {
		let newShot = new engine.Shot(player.box.center.x + 80*Math.sin(angle), player.box.center.y - 80*Math.cos(angle), angle);
		lobby.shots.push(newShot);

		return {
			addedShots: [newShot]
		};
	}
	function handleActionTwo(player, angle, lobby) {
	}

	return {
		handleActionOne,
		handleActionTwo
	};
};
