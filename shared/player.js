export default class {
	constructor(name, appearance, walkFrame, attachedPlanet, jetpack, health, fuel, armedWeapon, carriedWeapon, aimAngle) {
		this.name = name;
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
		this._appearance = appearance;
		this._walkFrame = 'stand' || walkFrame;

		this.jetpack = jetpack || false;
		this.health = health || 8;
		this.fuel = fuel || 300;
		this.attachedPlanet = attachedPlanet || -1;
		this.lastlyAimedAt = Date.now();
		this.weapons = {
			Smg: new weapon.Smg(this),
			Lmg: new weapon.Lmg(this),
			Shotgun: new weapon.Shotgun(this),
			Knife: new weapon.Knife(this)
		};
		this.armedWeapon = armedWeapon !== undefined ? this.weapons[armedWeapon] : this.weapons.Lmg;
		this.carriedWeapon = carriedWeapon !== undefined ? this.weapons[carriedWeapon] : this.weapons.Smg;
		this.aimAngle = aimAngle || 0;
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
