import RapidFireWeapon from '<@RapidFireWeapon@>';

export default class Lmg extends RapidFireWeapon {
	constructor(owner) {
		super(owner);
	}
}
Lmg.prototype.cycleLength = 9;
Lmg.prototype.spray = 0.025;
