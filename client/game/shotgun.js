import Shotgun from '../../shared/shotgun.js';
import * as model from '../model/index.js';

export default class CltShotgun extends Shotgun {
	constructor(owner) {
		super(owner);
	}
	draw(context, isMe) {
		Object.getPrototypeOf(Object.getPrototypeOf(this)).draw.call(this, context, isMe);
		if (model.settings.particles === 'true' && this.muzzleFlash === true) {
			this.recoil = 27;
		}
	}
}

CltShotgun.prototype.offsetX = 13;
CltShotgun.prototype.offsetY = -5;
