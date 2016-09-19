import RapidFireWeapon from '<@RapidFireWeapon@>';

export default class Smg extends RapidFireWeapon {
	constructor(owner) {
		super(owner);
	}
}
Smg.prototype.cycleLength = 5;
Smg.prototype.spray = 0.04;

Smg.prototype.type = 'Smg';
