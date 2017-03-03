import Weapon from '../../shared/weapon.js';
import * as model from '../model/index.js';

export default class extends Weapon {
	constructor(owner) {
		super(owner);
		this.recoil = 0;
	}
	draw(context, weaponAngle) {
		let weaponRotFact = this.owner.looksLeft === true ? -(weaponAngle - this.owner.box.angle + Math.PI/2) : (weaponAngle - this.owner.box.angle + 3*Math.PI/2);

		this.recoil = this.recoil < 0.05 ? 0 : this.recoil * 0.7;
		context.rotate(weaponRotFact);
		if (model.settings.particles === 'true' && this.muzzleFlash === true) {
			var	muzzleX = this.muzzleX*model.controls.zoomFactor + window.resources['muzzle'].width*0.5*model.controls.zoomFactor,
				muzzleY = this.muzzleY*model.controls.zoomFactor - window.resources['muzzle'].height*0.25*model.controls.zoomFactor;

			context.drawImage(window.resources[(Math.random() > 0.5 ? 'muzzle' : 'muzzle2')],
				muzzleX, muzzleY + this.offsetY*model.controls.zoomFactor,
				window.resources['muzzle'].width * model.controls.zoomFactor,
				window.resources['muzzle'].height * model.controls.zoomFactor);//muzzle flash

			this.muzzleFlash = false;
			this.recoil = 10;
		}
		context.drawImage(window.resources[this.type.toLowerCase()], // this is ugly buuuuuuut... it works
			(this.offsetX - this.recoil)*model.controls.zoomFactor,
			this.offsetY*model.controls.zoomFactor,
			window.resources[this.type.toLowerCase()].width*model.controls.zoomFactor,
			window.resources[this.type.toLowerCase()].height*model.controls.zoomFactor
		);
		context.rotate(-weaponRotFact);
	}
}
