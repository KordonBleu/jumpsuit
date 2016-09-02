const defaultSettings = {
	volMusic: '20',
	volEffects: '50',
	meteors: 'true',
	particles: 'true',
	name: 'Unnamed player',
	primary: 'Lmg',
	secondary: 'Smg'
};

let settings = {};

for (let key in defaultSettings) {
	let fromStorage = localStorage.getItem('settings.' + key);
	settings[key] = fromStorage === null ? defaultSettings[key] : fromStorage;
}

export default new Proxy(settings, {
	get: (target, property) => {
		if(target.hasOwnProperty(property)) return target[property];
		else {
			let val = localStorage.getItem('settings.' + property);

			return val === null ? undefined : val; // make it look like a normal object
		}
	},
	set: (target, property, value) => {
		target[property] = value.toString();
		localStorage.setItem('settings.' + property, value);

		return true;
	}
});
