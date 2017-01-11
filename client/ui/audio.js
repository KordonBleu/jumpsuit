import * as audio from '../audio.js';
import settings from '../settings.js';

const musicVolumeElement = document.getElementById('music-volume'),
	effectsVolumeElement = document.getElementById('effects-volume');

musicVolumeElement.value = settings.volMusic;
effectsVolumeElement.value = settings.volEffects;

musicVolumeElement.addEventListener('input', function(ev) {
	audio.setMusicGain(ev.target.value);
});
effectsVolumeElement.addEventListener('input', function(ev) {
	audio.setSfxGain(ev.target.value);
});
