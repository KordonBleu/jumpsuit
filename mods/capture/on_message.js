"use strict";

module.exports = function(engine) {
	function onActionOne(player, angle) {
		let newShot = new engine.Shot(player.box.center.x + 80*Math.sin(angle), player.box.center.y - 80*Math.cos(angle), angle);
		player.lobby.shots.push(newShot);

		return {
			addedShots: [newShot]
		};
	}
	function onActionTwo(player, angle) {
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
