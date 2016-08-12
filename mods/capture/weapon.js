"use strict";

if (Shot === undefined) var Shot = require("./shot.js");

var weapon = (function() {
	class Weapon {
		constructor(owner) {
			this.owner = owner;
			this.recoil = 0;
		}
		fire() {
			let shotType = Shot.prototype.BULLET,
				shift = this.owner.looksLeft ? -1 : 1,
				inaccuracy = (2*Math.random()-1)*this.spray,
				newShots = [];

			for (let i = -1; i <= 1; i++) {
				if (shotType !== 3 && i !== 0) continue;
				if (i !== 0) inaccuracy += (2 * Math.random() - 1) * this.spray * 0.45;
				let shotX = this.owner.box.center.x + this.muzzleX * Math.sin(this.owner.aimAngle) + this.muzzleY * shift * Math.sin(this.owner.aimAngle - Math.PI / 2),
					shotY = this.owner.box.center.y - this.muzzleX * Math.cos(this.owner.aimAngle) - this.muzzleY * shift * Math.cos(this.owner.aimAngle - Math.PI / 2);

				newShots.push(new Shot(shotX, shotY, this.owner.aimAngle + i*0.12 + inaccuracy, this.owner.pid, shotType));
			}
			return newShots;
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

	class Lmg extends RapidFireWeapon {
	}
	Lmg.prototype.offsetX = 13;
	Lmg.prototype.offsetY = -15;
	Lmg.prototype.cycleLength = 9;
	Lmg.prototype.muzzleX = 81;
	Lmg.prototype.muzzleY = 6;
	Lmg.prototype.spray = 0.025;

	class Smg extends RapidFireWeapon {
	}
	Smg.prototype.offsetX = 13;
	Smg.prototype.offsetY = -3;
	Smg.prototype.cycleLength = 5;
	Smg.prototype.muzzleX = 58;
	Smg.prototype.muzzleY = -2;
	Smg.prototype.spray = 0.04;

	class Shotgun extends Weapon {
	}
	Shotgun.prototype.offsetX = 13;
	Shotgun.prototype.offsetY = -5;
	Shotgun.prototype.muzzleX = 84;
	Shotgun.prototype.muzzleY = 2;
	Shotgun.prototype.spray = 0.05;

	class Knife extends Weapon {
	}
	Knife.prototype.offsetX = 23;
	Knife.prototype.offsetY = -20;
	Knife.prototype.muzzleX = 23;
	Knife.prototype.muzzleY = 0;
	Knife.prototype.spray = 0.005;

	return {
		Lmg,
		Smg,
		Shotgun,
		Knife
	}
})();

if (typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = weapon;
