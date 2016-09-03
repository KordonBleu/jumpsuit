import settings from './settings.js';

let audioContext = new AudioContext();

export const sfxGain = audioContext.createGain(); // only to be used as a reference, MUST NOT BE MODIFIED DIRECTLY
sfxGain.gain.value = parseInt(settings.volEffects, 10) / 100;
sfxGain.connect(audioContext.destination);
export function setSfxGain(value) {
	settings.volEffects = value;
	sfxGain.gain.value = value / 100;
}

const musicGain = audioContext.createGain();
musicGain.gain.value = parseInt(settings.volMusic, 10) / 100;
musicGain.connect(audioContext.destination);
export function setMusicGain(value) {
	settings.volMusic = value;
	musicGain.gain.value = value / 100;
}

function SoundModel(url, callback) {
	let request = new XMLHttpRequest(),
		that = this;
	request.responseType = 'arraybuffer';
	request.open('GET', url, true);
	request.onload = function() {
		return audioContext.decodeAudioData(request.response).then(function(buffer) {
			that.buffer = buffer;

			if(typeof callback === 'function') callback.call(that);
		}).catch(function(err) {
			// use ogg in case the browser doesn't support opus
			// https://bugs.chromium.org/p/chromium/issues/detail?id=482934
			let indexOpus = url.lastIndexOf('.opus');
			if (indexOpus !== -1) {//prevent recursivity
				SoundModel.call(that, url.slice(0, indexOpus) + '.ogg', callback);
			} else console.log(err);
		});
	}.bind(this);
	request.send();
}
SoundModel.prototype.makeSound = function(nextNode, loop) {
	let sound = audioContext.createBufferSource();
	sound.buffer = this.buffer;

	if(typeof loop === 'number') {
		sound.loopStart = loop;
		sound.loop = true;
	}

	sound.connect(nextNode);

	return sound;
};

export function makePanner(deltaPosX, deltaPosY) {
	let panner = audioContext.createPanner();
	setPanner(panner, deltaPosX, deltaPosY);
	panner.connect(sfxGain);

	return panner;
}
export function setPanner(panner, deltaPosX, deltaPosY) {
	if(Math.sqrt(Math.pow(deltaPosX, 2) + Math.pow(deltaPosY, 2)) < 200) {//if dist < 200
		let ang = Math.atan2(deltaPosX, deltaPosY);//take it to 200
		deltaPosX = Math.cos(ang) * 200;
		deltaPosY = Math.sin(ang) * 200;
	}

	panner.setPosition(deltaPosX, deltaPosY, 0);
	panner.refDistance = 200;
}


export const bgFilter = audioContext.createBiquadFilter();
bgFilter.type = 'lowpass';
bgFilter.Q.value = 2;
bgFilter.frequency.value = 4000;

bgFilter.connect(musicGain);

export const laserModel = new SoundModel('/assets/audio/laser.opus'),
	jetpackModel = new SoundModel('/assets/audio/jetpack.opus'),
	backgroundModel = new SoundModel('/assets/audio/interstellar.opus', function() {
		this.makeSound(bgFilter, 110.256).start(0);
	}),
	stepModels = [[], []];
for (let i = 0; i !== 5; ++i) {
	stepModels[0].push(new SoundModel('/assets/audio/step/concrete_' + i + '.opus'));
	stepModels[1].push(new SoundModel('/assets/audio/step/grass_' + i + '.opus'));
}
