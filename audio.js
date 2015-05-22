var audioContext = new (window.AudioContext || window.webkitAudioContext)(),
audioBuffer,
audioSource,
audioFilter,
audioGain,
audioLoaded = false;

function loadSound(url) {
	var request = new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType = 'arraybuffer';

	request.onload = function() {
		audioContext.decodeAudioData(request.response, function(buffer) {
			audioBuffer = buffer;
			initAudioSystem();
		});
	}
	request.send();
}

function initAudioSystem(){
	audioSource = audioContext.createBufferSource();
	audioSource.buffer = audioBuffer;

	audioFilter = audioContext.createBiquadFilter();
	audioFilter.type = "lowpass";
	audioFilter.Q.value = 2;
	audioFilter.frequency.value = 200;

	audioGain = audioContext.createGain();
	audioGain.gain.value = 0.5;

	audioSource.connect(audioGain);
	audioGain.connect(audioFilter);
	audioFilter.connect(audioContext.destination);

	audioSource.loop = true;
	audioSource.loopStart = 110.256;
	audioSource.start(0);
	audioLoaded = true;
}

function fadeSound(filtered){
	if (!audioLoaded) return;

	var fv = audioFilter.frequency.value;
	if (filtered){		
		audioFilter.frequency.value = (fv <= 200) ? 200 : fv * 0.95;
	} else {
		audioFilter.frequency.value = (fv >= 4000) ? 4000 : fv * 1.05;
	}
}
loadSound("assets/audio/interstellar.ogg");

audioIcon = document.getElementById("audio-icon");
audioIcon.addEventListener("click", function() {
	if(audioIcon.getAttribute('src') === "assets/images/controlsMute.png") {
		audioIcon.src = "assets/images/controlsUnmute.png";
		audioGain.gain.value = 0;
	} else {
		audioIcon.src = "assets/images/controlsMute.png"; 
		audioGain.gain.value = 0.5;
	}
});
