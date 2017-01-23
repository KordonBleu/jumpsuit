import Player from '../shared/player.js';
import vinage from 'vinage';
import * as audio from './view/audio.js';
import * as entities from './model/entities.js';
import windowBox from './windowbox.js';

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
	constructor(pid, appearance, homographId, name) {
		super();

		this.pid = pid;
		this._appearance = appearance;
		this.homographId = homographId;
		this.name = name;


		this.panner = audio.makePanner(0, 0);//note: won't be used if this is not another player
		this.predictionTarget = {};
		this.predictionBase = {};
		this.lastSound = 0;
	}
	update(x, y, attachedPlanet, angle, looksLeft, jetpack, hurt, walkFrame, armedWeapon, carriedWeapon, aimAngle) {
		this.attachedPlanet = attachedPlanet;
		this.looksLeft = looksLeft;
		this.jetpack = jetpack;
		this.hurt = hurt;
		this.walkFrame = walkFrame;
		this.armedWeapon = this.weapons[armedWeapon];
		this.carriedWeapon = this.weapons[carriedWeapon];

		let param1 = Date.now();

		if ('timestamp' in this.predictionTarget) param1 = this.predictionTarget.timestamp;
		this.predictionTarget = {
			timestamp: Date.now(),
			box: new vinage.Rectangle(new vinage.Point(x, y), 0, 0, angle),
			aimAngle: aimAngle
		};
		this.predictionBase = {
			timestamp: param1,
			box: new vinage.Rectangle(new vinage.Point(this.box.center.x, this.box.center.y), 0, 0, this.box.angle),
			aimAngle: this.aimAngle
		};
	}
	playSteps(ownPlayer, walkFrame, x, y) {
		if ((this.walkFrame === 'walk1' && walkFrame === 'walk2') || (this.walkFrame === 'walk2' && walkFrame === 'walk1')) {
			let type = entities.planets[this.attachedPlanet].type,
				stepSound = audio.stepModels[type][this.lastSound].makeSound(audio.makePanner(x - ownPlayer.box.center.x, y - ownPlayer.box.center.y));
			stepSound.playbackRate.value = Math.random() + 0.5;//pitch is modified from 50% to 150%
			stepSound.start(0);
			this.lastSound = (this.lastSound + 1) % 5;
		}
	}
	playJetpack(ownPlayer, jetpack) {
		if (this === ownPlayer) {
			if (!this.jetpack && jetpack) {
				this.jetpackSound = audio.jetpackModel.makeSound(audio.sfxGain, 1);
				this.jetpackSound.start(0);
			} else if (this.jetpack && !jetpack && this.jetpackSound !== undefined) {
				this.jetpackSound.stop();
			}
		} else {
			if (!this.jetpack && jetpack) {
				audio.setPanner(this.panner, this.box.center.x - ownPlayer.box.center.x, this.box.center.y - ownPlayer.box.center.y);
				this.jetpackSound = audio.jetpackModel.makeSound(this.panner, 1);
				this.jetpackSound.start(0);
			} else if(this.jetpack && !jetpack && this.jetpackSound !== undefined) {
				this.jetpackSound.stop();
			}
		}
	}

	getFinalName() {
		return this.name + (typeof this.homographId === 'number' && this.homographId !== 0 ? ' (' + this.homographId + ')' : '');
	}
	draw(context, particles, isMe) {
		let res = window.resources[this.appearance + '_' + this.walkFrame],
			playerX = windowBox.wrapX(this.box.center.x),
			playerY = windowBox.wrapY(this.box.center.y);


		//name
		if (!isMe) {
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

		let jetpackRes = window.resources['jetpack'],
			jetpackX = centerX - 5*windowBox.zoomFactor,
			jetpackY = centerY + 16*windowBox.zoomFactor;
		context.drawImage(window.resources['jetpack'], jetpackX, jetpackY, window.resources['jetpack'].width*0.75*windowBox.zoomFactor, window.resources['jetpack'].height*0.75*windowBox.zoomFactor);

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

			let jetpackFireRes = window.resources['jetpackFire'];
			context.drawImage(jetpackFireRes, -(jetpackFireRes.width/2)*windowBox.zoomFactor, jetpackY + jetpackRes.height*0.75*windowBox.zoomFactor, jetpackFireRes.width*windowBox.zoomFactor, jetpackFireRes.height*windowBox.zoomFactor);
			context.drawImage(jetpackFireRes, (jetpackFireRes.width/2 - jetpackRes.width*0.75)*windowBox.zoomFactor, jetpackY + jetpackRes.height*0.75*windowBox.zoomFactor, jetpackFireRes.width*windowBox.zoomFactor, jetpackFireRes.height*windowBox.zoomFactor);
		}


		this.armedWeapon.draw(context, isMe);

		context.drawImage(res, centerX, centerY, wdt, hgt);//body

		let helmetRes = window.resources['astronaut_helmet'];
		if (this.walkFrame === 'duck') {
			let mouthRes = window.resources[this.appearance + '_mouth_surprise'];
			context.rotate(res.mouthAngle);
			context.drawImage(mouthRes, centerX + res.mouthPosX*windowBox.zoomFactor, centerY + res.mouthPosY*windowBox.zoomFactor, mouthRes.width*windowBox.zoomFactor, mouthRes.height*windowBox.zoomFactor);//mouth
			context.drawImage(helmetRes, centerX, centerY, helmetRes.width*windowBox.zoomFactor, helmetRes.height*windowBox.zoomFactor);
			context.rotate(-res.mouthAngle);
		} else {
			let mouthRes = window.resources[this.appearance + '_mouth_' + (this.hurt ? 'unhappy' : this.walkFrame === 'jump' ? 'surprise' : 'happy')];
			context.drawImage(mouthRes, centerX + res.mouthPosX*windowBox.zoomFactor, centerY + res.mouthPosY*windowBox.zoomFactor, mouthRes.width*windowBox.zoomFactor, mouthRes.height*windowBox.zoomFactor);//mouth
			context.drawImage(helmetRes, centerX, centerY, helmetRes.width*windowBox.zoomFactor, helmetRes.height*windowBox.zoomFactor);
		}
		context.resetTransform();
	}
}
