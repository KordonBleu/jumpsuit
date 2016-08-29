import Player from '../../shared/player.js';

export default class SrvPlayer extends Player {
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
			this.walkFrame = 'jump';
		} else {
			let leftOrRight = (this.controls['moveLeft'] || this.controls['moveRight']);
			if (!leftOrRight) this.walkFrame = (this.controls['crouch']) ? 'duck' : 'stand';
			else if (this._walkCounter++ >= (this.controls['run'] > 0 ? 6 : 10)){
				this._walkCounter = 0;
				this.walkFrame = (this.walkFrame === 'walk1') ? 'walk2' : 'walk1';
			}
			this.setBoxSize();
		}
	}

}
