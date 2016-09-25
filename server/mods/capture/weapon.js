import Weapon from '../../../shared/weapon.js';
import Shot from './shot.js';

export default class extends Weapon {
	fire(angleOffset) {
		let shift = this.owner.looksLeft ? -1 : 1,
			inaccuracy = (2*Math.random()-1)*this.spray;

		let shotX = this.owner.box.center.x + this.muzzleX * Math.sin(this.owner.aimAngle) + this.muzzleY * shift * Math.sin(this.owner.aimAngle - Math.PI / 2),
			shotY = this.owner.box.center.y - this.muzzleX * Math.cos(this.owner.aimAngle) - this.muzzleY * shift * Math.cos(this.owner.aimAngle - Math.PI / 2);

		return [new Shot(shotX, shotY, this.owner.aimAngle + (angleOffset === undefined ? 0 : angleOffset) + inaccuracy, this.owner.pid, this.shotType)];
	}
}
