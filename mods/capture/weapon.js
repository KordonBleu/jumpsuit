'use strict';

if (Shot === undefined) var Shot = require('./shot.js');

var weapon = (function() {
	class Weapon {
		constructor(owner) {
			this.owner = owner;
			this.recoil = 0;
		}
		fire(angleOffset) {
			let shift = this.owner.looksLeft ? -1 : 1,
				inaccuracy = (2*Math.random()-1)*this.spray,
				newShots = [];

			let shotX = this.owner.box.center.x + this.muzzleX * Math.sin(this.owner.aimAngle) + this.muzzleY * shift * Math.sin(this.owner.aimAngle - Math.PI / 2),
				shotY = this.owner.box.center.y - this.muzzleX * Math.cos(this.owner.aimAngle) - this.muzzleY * shift * Math.cos(this.owner.aimAngle - Math.PI / 2);

			return [new Shot(shotX, shotY, this.owner.aimAngle + (angleOffset === undefined ? 0 : angleOffset) + inaccuracy, this.owner.pid, this.shotType)];
		}
	}
	class RapidFireWeapon extends Weapon {
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

	class Lmg extends RapidFireWeapon {
		constructor(owner) {
			super(owner);
		}
	}
	Lmg.prototype.offsetX = 13;
	Lmg.prototype.offsetY = -15;
	Lmg.prototype.cycleLength = 9;
	Lmg.prototype.muzzleX = 81;
	Lmg.prototype.muzzleY = 6;
	Lmg.prototype.spray = 0.025;

	class Smg extends RapidFireWeapon {
		constructor(owner) {
			super(owner);
		}
	}
	Smg.prototype.offsetX = 13;
	Smg.prototype.offsetY = -3;
	Smg.prototype.cycleLength = 5;
	Smg.prototype.muzzleX = 58;
	Smg.prototype.muzzleY = -2;
	Smg.prototype.spray = 0.04;

	class Shotgun extends Weapon {
		constructor(owner) {
			super(owner);
		}
		fire() {
			let shots = [];
			for (let i = -1; i !== 1; ++i) {
				shots = shots.concat(super.fire(i*0.12));
			}

			return shots;
		}
	}
	Shotgun.prototype.offsetX = 13;
	Shotgun.prototype.offsetY = -5;
	Shotgun.prototype.muzzleX = 84;
	Shotgun.prototype.muzzleY = 2;
	Shotgun.prototype.spray = 0.05;
	Shotgun.prototype.shotType = Shot.prototype.TYPES.BALL;

	class Knife extends Weapon {
		constructor(owner) {
			super(owner);
		}
	}
	Knife.prototype.offsetX = 23;
	Knife.prototype.offsetY = -20;
	Knife.prototype.muzzleX = 23;
	Knife.prototype.muzzleY = 0;
	Knife.prototype.spray = 0.005;
	Knife.prototype.shotType = Shot.prototype.TYPES.KNIFE;

	return {
		Lmg,
		Smg,
		Shotgun,
		Knife,
		Weapon // TODO: remove this maybe?
	};
})();

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') module.exports = weapon;
