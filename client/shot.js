import Shot from '../shared/shot.js';

export default class extends Shot {
	constructor(x, y, angle, origin, type) {
		super(x, y, angle, origin, type);
	}
	draw(context, windowBox, dead) {
		let resourceKey;
		if (this.type === this.TYPES.BULLET && !dead) resourceKey = 'rifleShot';
		else if (this.type === this.TYPES.KNIFE && !dead) resourceKey = 'knife';
		else if (this.type === this.TYPES.LASER) resourceKey = (dead ? 'laserBeamDead' : 'laserBeam');
		else if (this.type === this.TYPES.BALL) resourceKey = 'shotgunBall';

		if (resourceKey === undefined) return;
		windowBox.drawRotatedImage(resources[resourceKey],
			windowBox.wrapX(this.box.center.x),
			windowBox.wrapY(this.box.center.y),
			this.box.angle + (resourceKey === 'knife' ? (100 - this.lifeTime) * Math.PI * 0.04 - Math.PI / 2 : 0));
	}
}
