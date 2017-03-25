import Player from '../../../shared/player.js';
import { config } from '../../config_loader.js';
import * as monitor from '../../monitor.js';

export default class SrvPlayer extends Player {
	constructor(dc) {
		super();
		this.dc = dc;

		this.lastMessage = Date.now();
		this._lastHurt = 0;
		this._walkCounter = 0;

		this.jumpState = this.jumpStates.FLOATING;
	}

	send(data) {
		try {
			this.dc.send(data);
			if (config.monitor) {
				monitor.traffic.beingConstructed.out += data.byteLength;//record outgoing traffic for logging
			}
		} catch (err) {
			console.error(err);
		}
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
			let walkFlag = (this.controls['moveLeft'] > 0) * 1 | (this.controls['moveRight'] > 0) * 2 | (this.controls['run'] > 0) * 4;
			if (!(walkFlag & 3) || (walkFlag & 3) === 3) this.walkFrame = (this.controls['crouch']) ? 'duck' : 'stand';
			else if (this._walkCounter++ >= (walkFlag >> 2 ? 6 : 10)) {
				this._walkCounter = 0;
				this.walkFrame = (this.walkFrame === 'walk1') ? 'walk2' : 'walk1';
			}
			this.setBoxSize();
		}
	}

	updateJumpState(jumpPressed) {
		switch (this.jumpState) {
			case this.jumpStates.JUMPING:
				if (!jumpPressed) this.jumpState = this.jumpStates.FLOATING;
				break;
			case this.jumpStates.FLOATING:
				if (jumpPressed) this.jumpState = this.jumpStates.JETPACK;
				break;
			case this.jumpStates.JETPACK:
				if (!jumpPressed) this.jumpState = this.jumpStates.FLOATING;
		}
	}
	jump() {
		this.jumpState = this.jumpStates.JUMPING;
		this.attachedPlanet = -1;

		this.velocity.x = Math.sin(this.box.angle) * 6;
		this.velocity.y = -Math.cos(this.box.angle) * 6;

		this.box.center.x += this.velocity.x;
		this.box.center.y += this.velocity.y;
	}
}
SrvPlayer.prototype.jumpStates = { // FSM
	JUMPING: 0, // the player has pressed space (they may hold it)
	FLOATING: 1, // the player has released space
	JETPACK: 2 // the player has pressed space again (they may hold it)
};
