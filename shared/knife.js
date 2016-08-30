import Weapon from '<@Weapon@>';

export default class Knife extends Weapon {
	constructor(owner) {
		super(owner);
	}
}
Knife.prototype.spray = 0.005;
Knife.prototype.shotType = Shot.prototype.TYPES.KNIFE;
