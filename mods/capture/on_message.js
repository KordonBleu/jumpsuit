"use strict";

module.exports = function(engine) {
	function onControls(player, controlsObj) {
		for (var i in controlsObj) 
			if (player.controls[i] !== 2 || controlsObj[i] === 0) player.controls[i] = controlsObj[i];
	}

	return {
		onControls
	};
};
