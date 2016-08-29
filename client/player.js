import Player from '../shared/player.js';
import * as audio from './audio.js';

class Particle {
	constructor(size, startX, startY, velocityX, velocityY, lifetime) {
		this.box = new vinage.Rectangle(new vinage.Point(startX, startY), 0, 0, Math.random() * 2 * Math.PI);
		this.size = size;
		this.maxLifetime = lifetime;
		this.lifetime = 0;
		this.rotSpeed = Math.random() * Math.PI * 0.04;
		this.velocity = {x: velocityX || (Math.random() * 2 - 1) * 2 * Math.sin(this.box.angle), y: velocityY || (Math.random() * 2 - 1) * 2 * Math.cos(this.box.angle)};
	}
	update() {
		this.lifetime++;
		this.box.center.x += this.velocity.x;
		this.box.center.y += this.velocity.y;
		this.box.angle += this.rotSpeed;
		this.size *= 0.95;
		return this.lifetime >= this.maxLifetime;
	}
}

export default class extends Player {
	constructor(name, appearance, walkFrame, attachedPlanet, jetpack, health, fuel, armedWeapon, carriedWeapon, aimAngle) {
		super(name, appearance, walkFrame, attachedPlanet, jetpack, health, fuel, armedWeapon, carriedWeapon, aimAngle);
		this.hurt = false;
		this.panner = audio.makePanner(0, 0);//note: won't be used if this is not another player
		this.predictionTarget = {};
		this.predictionBase = {};
		this.lastSound = 0;
	}

	getFinalName() {
		return this.name + (typeof this.homographId === 'number' && this.homographId !== 0 ? ' (' + this.homographId + ')' : '');
	}
	draw(context, windowBox, particles, showName) {
		let res = resources[this.appearance + '_' + this.walkFrame],
			playerX = windowBox.wrapX(this.box.center.x),
			playerY = windowBox.wrapY(this.box.center.y);


		//name
		if (showName) {
			let distance = Math.sqrt(Math.pow(res.width, 2) + Math.pow(res.height, 2)) * 0.5 + 8;
			context.fillText(this.name, this, this - distance*windowBox.zoomFactor);
		}

		let wdt = res.width * windowBox.zoomFactor,
			hgt = res.height * windowBox.zoomFactor,
			centerX = -(wdt / 2),
			centerY = -(hgt / 2);

		context.translate(playerX, playerY);
		context.rotate(this.box.angle);
		context.scale(this.looksLeft === true ? -1 : 1, 1);

		let jetpackRes = resources['jetpack'],
			jetpackX = centerX - 5*windowBox.zoomFactor,
			jetpackY = centerY + 16*windowBox.zoomFactor;
		context.drawImage(resources['jetpack'], jetpackX, jetpackY, resources['jetpack'].width*0.75*windowBox.zoomFactor, resources['jetpack'].height*0.75*windowBox.zoomFactor);

		if (this.jetpack) {
			let shift = this.looksLeft === true ? -windowBox.zoomFactor : windowBox.zoomFactor;
			if (document.getElementById('particle-option').checked && Date.now() % 2 === 0) {
				particles.push(new Particle(18,
					this.box.center.x - shift*14*Math.sin(this.box.angle + Math.PI/2) - 70 * Math.sin(this.box.angle - Math.PI / 11),
					this.box.center.y + shift*14*Math.cos(this.box.angle + Math.PI/2) + 70 * Math.cos(this.box.angle - Math.PI / 11),
					undefined,
					5.2 * Math.cos(this.box.angle),
					80));
				particles.push(new Particle(18,
					this.box.center.x - shift*14*Math.sin(this.box.angle + Math.PI/2) - 70 * Math.sin(this.box.angle + Math.PI / 11),
					this.box.center.y + shift*14*Math.cos(this.box.angle + Math.PI/2) + 70 * Math.cos(this.box.angle + Math.PI / 11),
					undefined,
					5.2 * Math.cos(this.box.angle),
					80));
			}

			let jetpackFireRes = resources['jetpackFire'];
			context.drawImage(jetpackFireRes, -(jetpackFireRes.width/2)*windowBox.zoomFactor, jetpackY + jetpackRes.height*0.75*windowBox.zoomFactor, jetpackFireRes.width*windowBox.zoomFactor, jetpackFireRes.height*windowBox.zoomFactor);
			context.drawImage(jetpackFireRes, (jetpackFireRes.width/2 - jetpackRes.width*0.75)*windowBox.zoomFactor, jetpackY + jetpackRes.height*0.75*windowBox.zoomFactor, jetpackFireRes.width*windowBox.zoomFactor, jetpackFireRes.height*windowBox.zoomFactor);
		}


		this.armedWeapon.draw();

		context.drawImage(res, centerX, centerY, wdt, hgt);//body

		let helmetRes = resources['astronaut_helmet'];
		if (this.walkFrame === 'duck') {
			let mouthRes = resources[this.appearance + '_mouth_surprise'];
			context.rotate(res.mouthAngle);
			context.drawImage(mouthRes, centerX + res.mouthPosX*windowBox.zoomFactor, centerY + res.mouthPosY*windowBox.zoomFactor, mouthRes.width*windowBox.zoomFactor, mouthRes.height*windowBox.zoomFactor);//mouth
			context.drawImage(helmetRes, centerX, centerY, helmetRes.width*windowBox.zoomFactor, helmetRes.height*windowBox.zoomFactor);
			context.rotate(-res.mouthAngle);
		} else {
			let mouthRes = resources[this.appearance + '_mouth_' + (this.hurt ? 'unhappy' : this.walkFrame === 'jump' ? 'surprise' : 'happy')];
			context.drawImage(mouthRes, centerX + res.mouthPosX*windowBox.zoomFactor, centerY + res.mouthPosY*windowBox.zoomFactor, mouthRes.width*windowBox.zoomFactor, mouthRes.height*windowBox.zoomFactor);//mouth
			context.drawImage(helmetRes, centerX, centerY, helmetRes.width*windowBox.zoomFactor, helmetRes.height*windowBox.zoomFactor);
		}
		context.resetTransform();
	}
}
