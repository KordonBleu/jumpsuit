import vinage from 'vinage';
import resources from '../server/resource_loader.js';

import Smg from '<@Smg@>';
import Lmg from '<@Lmg@>';
import Shotgun from '<@Shotgun@>';
import Knife from '<@Knife@>';

export default class {
	constructor() {//name, appearance, walkFrame, attachedPlanet, jetpack, health, fuel, armedWeapon, carriedWeapon, aimAngle) {
		this.box = new vinage.Rectangle(new vinage.Point(0, 0), 0, 0);
		this.controls = {
			jump: 0,
			crouch: 0,
			jetpack: 0,
			moveLeft: 0,
			moveRight: 0,
			run: 0,
			changeWeapon: 0,
			shoot: 0
		};
		this.velocity = new vinage.Vector(0, 0);
		this._walkFrame = 'stand';

		this.jetpack = false;
		this.health =  8;
		this.fuel =  300;
		this.attachedPlanet = -1;
		this.lastlyAimedAt = Date.now();

		this.weapons = {
			Smg: new Smg(this),
			Lmg: new Lmg(this),
			Shotgun: new Shotgun(this),
			Knife: new Knife(this)
		};
		this.armedWeapon = this.weapons.Lmg;
		this.carriedWeapon = this.weapons.Smg;

		this.aimAngle = 0;
	}
	get appearance() {
		return this._appearance;
	}
	set appearance(newAppearance) {
		this._appearance = newAppearance;
		this.setBoxSize();
	}
	get walkFrame() {
		return this._walkFrame;
	}
	set walkFrame(newWalkFrame) {
		this._walkFrame = newWalkFrame;
		this.setBoxSize();
	}

	setBoxSize() {
		this.box.width = resources[this.appearance + '_' + this.walkFrame].width;
		this.box.height = resources[this.appearance + '_' + this.walkFrame].height;
	}
}
