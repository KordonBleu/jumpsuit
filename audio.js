"use strict";
var audioContext = new (window.AudioContext || window.webkitAudioContext)(),
	sounds = {},
	gain = audioContext.createGain(),
	canPlay = true;
	gain.gain.value = 0.5;

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
		}
		request.send();
	} catch(e) {
		canPlay = false;
	}
}

function fadeBackground(filtered) {
	if(!sounds["background"]) return;

	var fv = sounds["background"].filter.frequency.value;
	if(filtered) {
		sounds["background"].filter.frequency.value = (fv <= 200) ? 200 : fv * 0.95;
	} else {
		sounds["background"].filter.frequency.value = (fv >= 4000) ? 4000 : fv * 1.05;
	}
}

function playSound(name, distance) {
	var sound = sounds[name];
	if(sound === undefined || !canPlay) return;

	sound.source = audioContext.createBufferSource();
	sound.source.buffer = sound.buffer;

	if(sound.loop !== undefined && sound.loop !== null) {
		sound.source.loopStart = sounds[name].loop;
		sound.source.loop = true;
	}

	sound.source.connect(gain);
	gain.connect(audioContext.destination);

	sound.source.start(0);
}
function stopSound(name) {
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
	sound.filter.connect(gain);
	gain.connect(audioContext.destination);

	sound.source.start(0);
});
loadSound("assets/audio/jetpack.ogg", "jetpack", 1);
