import Shotgun from '../../shared/shotgun.js';
import * as model from '../model/index.js';

export default class CltShotgun extends Shotgun {
	draw() {
		this.prototype.prototype.draw();
		if (model.settings.particles === 'true' && this.muzzleFlash === true) {
			this.recoil = 27;
		}
	}
}

CltShotgun.prototype.offsetX = 13;
CltShotgun.prototype.offsetY = -5;
