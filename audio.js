var audioContext = new (window.AudioContext || window.webkitAudioContext)(),
sounds = {},
gain = audioContext.createGain(),
canPlay = true;
gain.gain.value = 0.5;

function loadSound(url, name){
	try {
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.responseType = "arraybuffer";
		request.onload = function() {
			audioContext.decodeAudioData(request.response, function (buffer){
				initSounds(buffer, name);
			});
		}
		request.send();
	} catch (e) {
		canPlay = false;
	}
}

function initSounds(buffer, name){
	sounds[name] = { source: null, filter: null, buffer: null};
	sounds[name].buffer = buffer;

	if (name == "background"){
		sounds[name].source = audioContext.createBufferSource();
		sounds[name].source.buffer = sounds[name].buffer;

		var filter = audioContext.createBiquadFilter();
		filter.type = "lowpass";
		filter.Q.value = 2;
		filter.frequency.value = 4000;
		
		sounds[name].filter = filter;
		sounds[name].source.connect(sounds[name].filter);
		sounds[name].filter.connect(gain);
		gain.connect(audioContext.destination);

		sounds[name].source.loop = true;
		sounds[name].source.loopStart = 110.256;
		sounds[name].source.start(0);
	}	
}

function fadeBackground(filtered){
	if (!sounds["background"]) return;

	var fv = sounds["background"].filter.frequency.value;
	if (filtered){		
		sounds["background"].filter.frequency.value = (fv <= 200) ? 200 : fv * 0.95;
	} else {
		sounds["background"].filter.frequency.value = (fv >= 4000) ? 4000 : fv * 1.05;
	}
}

function playSound(name, distance){
	if (typeof(sounds[name]) !== "undefined" && canPlay) {
		sounds[name].source = audioContext.createBufferSource();
		sounds[name].source.buffer = sounds[name].buffer;

		sounds[name].source.connect(gain);
		gain.connect(audioContext.destination);

		sounds[name].source.start(0);
	} 	
}

loadSound("assets/audio/laserTest.ogg", "laser");
loadSound("assets/audio/interstellar.ogg", "background");


