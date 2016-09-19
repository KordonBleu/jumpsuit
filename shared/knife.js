import Weapon from '<@Weapon@>';
import Shot from './shot.js';

export default class Knife extends Weapon {
	constructor(owner) {
		super(owner);
	}
}
Knife.prototype.spray = 0.005;
Knife.prototype.shotType = Shot.prototype.TYPES.KNIFE;

Knife.prototype.type = 'Knife';
