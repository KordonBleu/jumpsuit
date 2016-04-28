"use strict";

module.exports = function(engine) {
	function onActionOne(player, angle) {
		//nuthin	
	}
	function onActionTwo(player, angle) {
		//nuthin
	}
	function onControls(player, controlsObj) {
		player.controls = controlsObj;
	}

	return {
		onControls
	};
};
