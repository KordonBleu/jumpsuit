'use strict';

import Shot from './shot.js';
class Weapon {
	constructor(owner) {
		this.owner = owner;
		this.recoil = 0;
	}
	fire(angleOffset) {
		let shift = this.owner.looksLeft ? -1 : 1,
			inaccuracy = (2*Math.random()-1)*this.spray;

		let shotX = this.owner.box.center.x + this.muzzleX * Math.sin(this.owner.aimAngle) + this.muzzleY * shift * Math.sin(this.owner.aimAngle - Math.PI / 2),
			shotY = this.owner.box.center.y - this.muzzleX * Math.cos(this.owner.aimAngle) - this.muzzleY * shift * Math.cos(this.owner.aimAngle - Math.PI / 2);

		return [new Shot(shotX, shotY, this.owner.aimAngle + (angleOffset === undefined ? 0 : angleOffset) + inaccuracy, this.owner.pid, this.shotType)];
	}
	draw(context, windowBox) { // TODO: get this out of `mods/capture`
		let weaponAngle = (this.owner.pid === ownIdx ? game.mousePos.angle : this.aimAngle),
			weaponRotFact = this.owner.looksLeft === true ? -(weaponAngle - this.owner.box.angle + Math.PI/2) : (weaponAngle - this.owner.box.angle + 3*Math.PI/2);

		this.recoil = this.recoil < 0.05 ? 0 : this.recoil * 0.7;
		context.rotate(weaponRotFact);
		if (particlesElement.checked && this.muzzleFlash === true) {
			var	muzzleX = this.muzzleX*windowBox.zoomFactor + resources['muzzle'].width*0.5*windowBox.zoomFactor,
				muzzleY = this.muzzleY*windowBox.zoomFactor - resources['muzzle'].height*0.25*windowBox.zoomFactor;

			context.drawImage(resources[(Math.random() > 0.5 ? 'muzzle' : 'muzzle2')],
				muzzleX, muzzleY + this.offsetY*windowBox.zoomFactor,
				resources['muzzle'].width * windowBox.zoomFactor,
				resources['muzzle'].height * windowBox.zoomFactor);//muzzle flash

			this.muzzleFlash = false;
			this.recoil = (this instanceof weapon.Shotgun) ? 27 : 10;
		}
		context.drawImage(resources[this.constructor.name.toLowerCase()], // this is ugly buuuuuuut... it works
			(this.offsetX - this.recoil)*windowBox.zoomFactor,
			this.offsetY*windowBox.zoomFactor,
			resources[this.constructor.name.toLowerCase()].width*windowBox.zoomFactor, resources[this.constructor.name.toLowerCase()].height*windowBox.zoomFactor
		);
		context.rotate(-weaponRotFact);
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

export class Lmg extends RapidFireWeapon {
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

export class Smg extends RapidFireWeapon {
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

export class Shotgun extends Weapon {
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

export class Knife extends Weapon {
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
