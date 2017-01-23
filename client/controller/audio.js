import settings from '../settings.js';
import * as view from '../view/audio.js';

// callbacks called by the view
view.bindSfxVolChange(volume => {
	settings.volEffects = volume;
	view.setSfxGain(volume);
});
view.bindMusicVolChange(volume => {
	settings.volMusic = volume;
	view.setMusicGain(volume);
});

// initialisation
view.setSfxGain(parseInt(settings.volEffects, 10));
view.setMusicGain(parseInt(settings.volMusic, 10));
