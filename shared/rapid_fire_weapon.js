import Weapon from '<@Weapon@>';
import Shot from './shot.js';

export default class RapidFireWeapon extends Weapon {
	constructor(owner) {
		super(owner);
		this.cycle = 0;
	}
	canRapidFire() {
		this.cycle = ++this.cycle % this.cycleLength;
		return this.cycle === 0;
	}
}
RapidFireWeapon.prototype.shotType = Shot.prototype.TYPES.BULLET;
