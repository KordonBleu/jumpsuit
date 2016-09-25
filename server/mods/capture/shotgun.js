import Shotgun from '../../../shared/shotgun.js';

Shotgun.fire = function fire() {
	let shots = [];
	for (let i = -1; i !== 1; ++i) {
		shots = shots.concat(this.prototype.fire(i*0.12));
	}

	return shots;
};

Shotgun.prototype.muzzleX = 84;
Shotgun.prototype.muzzleY = 2;

export default Shotgun;
