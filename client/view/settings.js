/* Meteors */
const meteorsElement = document.getElementById('meteor-option');
export function checkMeteors(bool) {
	meteorsElement.checked = bool;
}
export function bindCheckMeteors(handler) {
	meteorsElement.addEventListener('change', e => {
		handler(e.target.checked);
	});
}

/* Particles */
const particleElement = document.getElementById('particle-option');
export function checkParticles(bool) {
	particleElement.checked = bool;
}
export function bindCheckParticles(handler) {
	particleElement.addEventListener('change', e => {
		handler(e.target.checked);
	});
}


/* Name */
const nameElement = document.getElementById('name');
nameElement.addEventListener('keydown', e => {
	if (e.key === 'Enter') e.target.blur();
});
export function setName(name) {
	nameElement.value = name;
}
export function bindName(handler) {
	nameElement.addEventListener('blur', e => {
		handler(e.target.value);
	});
}
