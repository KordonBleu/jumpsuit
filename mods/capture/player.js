"use strict";
var Player = ((vinage, resources, weapon) => {
	class Player {
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
			this._walkFrame = "_stand";

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
			this.box.width = resources[this.appearance + this.walkFrame].width;
			this.box.height = resources[this.appearance + this.walkFrame].height;
		};
	}

	class SrvPlayer extends Player {
		constructor(name, appearance, walkFrame, attachedPlanet, jetpack, health, fuel, armedWeapon, carriedWeapon, aimAngle) {
			super(name, appearance, walkFrame, attachedPlanet, jetpack, health, fuel, armedWeapon, carriedWeapon, aimAngle);
			this._lastHurt = 0;
			this._walkCounter = 0;
		}
		get hurt() {
			return Date.now() - this._lastHurt < 600;
		}
		set hurt(hurt) {
			this._lastHurt = hurt ? Date.now() : 0;
		}

		setWalkFrame() {
			if (this.box === undefined) return;
			if (this.attachedPlanet === -1){
				this.walkFrame = "_jump";
			} else {
				var leftOrRight = (this.controls["moveLeft"] || this.controls["moveRight"]);
				if (!leftOrRight) this.walkFrame = (this.controls["crouch"]) ? "_duck" : "_stand";
				else if (this._walkCounter++ >= (this.controls["run"] > 0 ? 6 : 10)){
					this._walkCounter = 0;
					this.walkFrame = (this.walkFrame === "_walk1") ? "_walk2" : "_walk1";
				}
				this.setBoxSize();
			}
		};
				
	}

	class ClPlayer extends Player {
		constructor(name, appearance, walkFrame, attachedPlanet, jetpack, health, fuel, armedWeapon, carriedWeapon, aimAngle) {
			super(name, appearance, walkFrame, attachedPlanet, jetpack, health, fuel, armedWeapon, carriedWeapon, aimAngle);
			this.hurt = false;
			this.panner = makePanner(0, 0);//note: won't be used if this is not another player
			this.predictionTarget = {};
			this.predictionBase = {};
			this.lastSound = 0;
		}

		getFinalName() {
			return this.name + (typeof this.homographId === "number" && this.homographId !== 0 ? " (" + this.homographId + ")" : "");
		};
	}


	if (typeof module !== "undefined" && typeof module.exports !== "undefined") return SrvPlayer;
	else return ClPlayer;

})(
	typeof vinage === "undefined" ? require("vinage") : vinage,
	typeof resources === "undefined" ? require("../../static/resource_loader.js"): resources,
	typeof weapon === "undefined" ? require("./weapon.js") : weapon
);

if (typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = Player;
