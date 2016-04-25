"use strict";

module.exports = function(engine) {
	function onActionOne(player, angle) {
		console.log(player.attachedPlanet);
		if (player.attachedPlanet !== -1) return;
		let newShot = new engine.Shot(player.box.center.x + 80*Math.sin(angle), player.box.center.y - 80*Math.cos(angle), angle, player.pid, true);
		player.lobby.shots.push(newShot);
			return {
			addedShots: [newShot]
		};
	}
	function onActionTwo(player, angle) {
		//nuthin
	}
	function onControls(player, controlsObj) {
		player.controls = controlsObj;
	}

	return {
		onActionOne,
		onActionTwo,
		onControls
	};
};
