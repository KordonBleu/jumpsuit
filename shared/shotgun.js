import Weapon from '<@Weapon@>';
import Shot from './shot.js';

export default class Shotgun extends Weapon {
	constructor(owner) {
		super(owner);
	}
}
Shotgun.prototype.spray = 0.05;
Shotgun.prototype.shotType = Shot.prototype.TYPES.BALL;

Shotgun.prototype.type = 'Shotgun';
