"use strict";

var audioContext = new AudioContext,
	soundEffectGain = audioContext.createGain(),
	musicGain = audioContext.createGain();

soundEffectGain.gain.value = 1;
soundEffectGain.connect(audioContext.destination);

musicGain.gain.value = 0.5;
musicGain.connect(audioContext.destination);

function SoundModel(url, callback) {
	var request = new XMLHttpRequest(),
		that = this;
	request.open("GET", url, true);
	request.responseType = "arraybuffer";
	request.onload = function() {
		audioContext.decodeAudioData(request.response).then(function(buffer) {
				that.buffer = buffer;

				if(typeof callback === "function") callback.bind(that)();
			}).catch(function(err) {
				that.elem = new Audio(url);// https://bugs.chromium.org/p/chromium/issues/detail?id=482934
				//that.elem.play();
				//TODO: load with audio element
				console.log("bim bam", err);

				if (typeof callback === "function") callback.call(that);
			});
	};
	request.send();
}
SoundModel.prototype.makeSound = function(nextNode, loop) {//fails silenciously if this.buffer isn't loaded (yet)
	if (this.buffer !== undefined) {
		var sound = audioContext.createBufferSource();
		sound.buffer = this.buffer;

		if(typeof loop === "number") {
			sound.loopStart = loop;
			sound.loop = true;
		}
	} else {
		//this.elem.play();
		var sound = audioContext.createMediaElementSource(this.elem.cloneNode());
		sound.start = function(time) {
			this.mediaElement.currentTime = time;
			this.mediaElement.play();
		}
		sound.stop = function() {
			this.mediaElement.pause();
		}
		console.log(sound);

		if (typeof loop === "number") {
			sound.mediaElement.dataset.loop = loop;
			console.log(parseFloat(sound.mediaElement.dataset.loop, 10));
			sound.mediaElement.addEventListener("ended", function() {
				this.currentTime = parseFloat(this.dataset.loop, 10);
				this.play();
			});
		}
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

var laserModel = new SoundModel("/assets/audio/laser.opus"),
	jetpackModel = new SoundModel("/assets/audio/jetpack.opus"),
	backgroundModel = new SoundModel("/assets/audio/interstellar.opus", function() {
		this.makeSound(bgFilter, 110.256).start(0);
	}),
	stepModels = [[], []];
for (let i = 0; i !== 5; ++i) {
	stepModels[0].push(new SoundModel("/assets/audio/step/concrete_" + i + ".opus"));
	stepModels[1].push(new SoundModel("/assets/audio/step/grass_" + i + ".opus"));
}
