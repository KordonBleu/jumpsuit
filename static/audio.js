"use strict";

var audioContext = new AudioContext,
	soundEffectGain = audioContext.createGain(),
	musicGain = audioContext.createGain();

soundEffectGain.gain.value = 1;
soundEffectGain.connect(audioContext.destination);

musicGain.gain.value = 0.5;
musicGain.connect(audioContext.destination);

function loadSound(url) {
	return new Promise(function(resolve, reject) {
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";
		try {
			request.onload = function() {
				audioContext.decodeAudioData(request.response, function(buffer) {
					resolve(buffer);
				});
			};
		} catch(e) {
			reject(e);
		}
		request.send();
	});
}

function SoundModel(url, callback) {
	loadSound(url).then(function(buffer) {
		this.buffer = buffer;
		if(typeof callback === "function") callback.bind(this)();
	}.bind(this)).catch(function(err) {
		console.error(err);
	});
}
SoundModel.prototype.makeSound = function(nextNode, loop) {//fails silenciously if this.buffer isn't loaded (yet)
	var sound = audioContext.createBufferSource();
	sound.buffer = this.buffer;

	if(typeof loop === "number") {
		sound.loopStart = loop;
		sound.loop = true;
	}
	sound.connect(nextNode);

	return sound;
}

function makePanner(deltaPosX, deltaPosY) {
	var panner = audioContext.createPanner();
	setPanner(panner, deltaPosX, deltaPosY);
	panner.connect(soundEffectGain);

	return panner;
}
function setPanner(panner, deltaPosX, deltaPosY) {
	if(Math.sqrt(Math.pow(deltaPosX, 2) + Math.pow(deltaPosY, 2)) < 200) {//if dist < 200
		var ang = Math.atan2(deltaPosX, deltaPosY);//take it to 200
		deltaPosX = Math.cos(ang) * 200;
		deltaPosY = Math.sin(ang) * 200;
	}

	panner.setPosition(deltaPosX, deltaPosY, 0);
	panner.refDistance = 200;
}


var bgFilter = audioContext.createBiquadFilter();
	bgFilter.type = "lowpass";
	bgFilter.Q.value = 2;
	bgFilter.frequency.value = 4000;

	bgFilter.connect(musicGain);

var laserModel = new SoundModel("/assets/audio/laserTest.ogg"),
	jetpackModel = new SoundModel("/assets/audio/jetpack.ogg"),
	backgroundModel = new SoundModel("/assets/audio/interstellar.ogg", function() {
		this.makeSound(bgFilter, 110.256).start(0);
	});
