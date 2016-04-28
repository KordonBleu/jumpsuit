"use strict";

module.exports = function(engine) {
	function onControls(player, controlsObj) {
		player.controls = controlsObj;
	}

	return {
		onControls
	};
};
