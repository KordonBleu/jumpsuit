import * as model from '../model/index.js';
import * as view from '../view/index.js';

// callbacks called by the view
view.audio.bindSfxVolChange(volume => {
	model.settings.volEffects = volume;
	view.audio.setSfxGain(volume);
});
view.audio.bindMusicVolChange(volume => {
	model.settings.volMusic = volume;
	view.audio.setMusicGain(volume);
});

// initialisation
view.audio.setSfxGain(parseInt(model.settings.volEffects, 10));
view.audio.setMusicGain(parseInt(model.settings.volMusic, 10));
