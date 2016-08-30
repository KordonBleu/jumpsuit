import Shotgun from '../../shared/shotgun.js';

Shotgun.fire = function fire() {
	let shots = [];
	for (let i = -1; i !== 1; ++i) {
		shots = shots.concat(super.fire(i*0.12));
	}

	return shots;
}

export default Shotgun;
