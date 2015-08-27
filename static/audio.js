"use strict";
var audioContext = new (window.AudioContext || window.webkitAudioContext)(),
	sounds = {},
	soundEffectsGain = audioContext.createGain(),
	musicGain = audioContext.createGain(),
	canPlay = true;

	soundEffectsGain.gain.value = 1;
	musicGain.gain.value = 0.5;

function loadSound(url, name, loop, callback) {
	try {
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";
		request.onload = function() {
			audioContext.decodeAudioData(request.response, function (buffer) {
				sounds[name] = {source: null, filter: null, buffer: buffer, loop: loop};
				if(callback !== undefined) callback(sounds[name]);
			});
		};
		request.send();
	} catch(e) {
		canPlay = false;
	}
}

function fadeBackground(filtered) {
	if(typeof sounds === "undefined" || !sounds["background"]) return;

	var fv = sounds["background"].filter.frequency.value;
	if(filtered) {
		sounds["background"].filter.frequency.value = (fv <= 200) ? 200 : fv * 0.95;
	} else {
		sounds["background"].filter.frequency.value = (fv >= 4000) ? 4000 : fv * 1.05;
	}
}

function playSound(name, deltaPosX, deltaPosY) {
	if(typeof sounds === "undefined" || sounds[name] === undefined || !canPlay) return;
	if(Math.sqrt(Math.pow(deltaPosX, 2) + Math.pow(deltaPosY, 2)) < 200) {//if dist < 200
		var ang = Math.atan2(deltaPosX, deltaPosY);//take it to 200
		deltaPosX = Math.cos(ang) * 200;
		deltaPosY = Math.sin(ang) * 200;
	}
	var sound = sounds[name];
	sound.source = audioContext.createBufferSource();
	sound.source.buffer = sound.buffer;

	if(sound.loop !== undefined && sound.loop !== null) {
		sound.source.loopStart = sounds[name].loop;
		sound.source.loop = true;
	}

	var panner = audioContext.createPanner();
	panner.setPosition(deltaPosX, deltaPosY, 0);
	panner.refDistance = 200;
	sound.source.connect(panner);
	panner.connect(soundEffectsGain);
	soundEffectsGain.connect(audioContext.destination);

	sound.source.start(0);
}
function stopSound(name) {
	if(sounds[name] === undefined) return;
	sounds[name].source.stop();
}

loadSound("assets/audio/laserTest.ogg", "laser");
loadSound("assets/audio/interstellar.ogg", "background", 110.256, function(sound) {
	sound.source = audioContext.createBufferSource();
	sound.source.buffer = sound.buffer;

	sound.source.loop = true;
	sound.source.loopStart = sound.loop;

	sound.filter = audioContext.createBiquadFilter();
	sound.filter.type = "lowpass";
	sound.filter.Q.value = 2;
	sound.filter.frequency.value = 4000;

	sound.source.connect(sound.filter);
	sound.filter.connect(musicGain);
	musicGain.connect(audioContext.destination);

	sound.source.start(0);
});
loadSound("assets/audio/jetpack.ogg", "jetpack", 1);
