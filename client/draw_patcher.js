'use strict';


/* Client-specific extensions to render objects */

Planet.prototype.draw = function() {
	let cx = windowBox.wrapX(this.box.center.x),
		cy = windowBox.wrapY(this.box.center.y);

	//draw planet
	context.beginPath();
	context.arc(cx, cy, this.box.radius*windowBox.zoomFactor, 0, 2 * Math.PI, false);
	context.closePath();
	context.fill();

	//apply texture
	windowBox.drawRotatedImage(resources['planet'], cx, cy, this.box.radius*windowBox.zoomFactor / 200 * Math.PI, 2*this.box.radius, 2*this.box.radius);

	//draw progress indicator
	context.beginPath();
	context.arc(cx, cy, 50*windowBox.zoomFactor, -Math.PI * 0.5, (this.progress.value / 100) * Math.PI * 2 - Math.PI * 0.5, false);
	context.lineWidth = 10*windowBox.zoomFactor;
	context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
	context.stroke();
	context.closePath();
};
Planet.prototype.drawAtmos = function() {
	context.fillStyle = this.progress.color;
	context.strokeStyle = context.fillStyle;

	windowBox.strokeAtmos(
		windowBox.wrapX(this.box.center.x),
		windowBox.wrapY(this.box.center.y),
		this.box.radius*1.75, 2);
};

Enemy.prototype.draw = function() {
	windowBox.drawRotatedImage(resources[this.appearance],
		windowBox.wrapX(this.box.center.x),
		windowBox.wrapY(this.box.center.y),
		this.box.angle);
};
Enemy.prototype.drawAtmos = function() {
	context.fillStyle = '#aaa';
	context.strokeStyle = context.fillStyle;

	windowBox.strokeAtmos(
		windowBox.wrapX(this.box.center.x),
		windowBox.wrapY(this.box.center.y),
		350, 4);
};

Shot.prototype.draw = function(dead) {
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
};

weapon.Weapon.prototype.draw = function() {
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
};
