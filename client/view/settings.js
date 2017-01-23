import settings from '../model/settings.js';
import * as draw from '../draw.js';
import * as wsClt from '../websockets.js';

/* Graphics */
const meteorsElement = document.getElementById('meteor-option');
meteorsElement.checked = settings.meteors === 'true';
meteorsElement.addEventListener('change', (e) => {
	if (e.target.checked) draw.stopMeteorSpawning();
	settings.meteors = e.target.checked;
});
export function spawnMeteorsEnabled() {
	return meteorsElement.checked;
}
document.getElementById('particle-option').checked = settings.particles === 'true';


/* Name */
const nameElement = document.getElementById('name');
nameElement.value = settings.name;
nameElement.addEventListener('keydown', function(e) {
	if (e.key === 'Enter') e.target.blur();
});
nameElement.addEventListener('blur', function(e) {
	settings.name = e.target.value;
	wsClt.currentConnection.setPreferences();
});
