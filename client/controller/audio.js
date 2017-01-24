import settings from '../model/settings.js';
import * as view from '../view/index.js';

// callbacks called by the view
view.audio.bindSfxVolChange(volume => {
	settings.volEffects = volume;
	view.audio.setSfxGain(volume);
});
view.audio.bindMusicVolChange(volume => {
	settings.volMusic = volume;
	view.audio.setMusicGain(volume);
});

// initialisation
view.audio.setSfxGain(parseInt(settings.volEffects, 10));
view.audio.setMusicGain(parseInt(settings.volMusic, 10));
