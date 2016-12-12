import Player from '../../../shared/player.js';
import { config } from '../../config_loader.js';
import * as monitor from '../../monitor.js';

export default class SrvPlayer extends Player {
	constructor(dc) {
		super();
		this.dc = dc;

		this._lastHurt = 0;
		this._walkCounter = 0;
	}

	send(data) {
		console.log('sentsrstsr');
		try {
			this.dc.send(data);
			if (config.monitor) {
				monitor.traffic.beingConstructed.out += data.byteLength;//record outgoing traffic for logging
			}
		}catch (err) {
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
