"use strict";

module.exports.onControls = function(player, controlsObj) {
	for (let i in controlsObj)
		if (player.controls[i] !== 2 || controlsObj[i] === 0) player.controls[i] = controlsObj[i];
};
