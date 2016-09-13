/*
	The default export of this module acts like an object containing values gotten from the storage.
	When one of these is modified, the change is also applied to the storage.
	If it is rather `delete`d, it is replaced by the default value.
*/

const defaultKeymap = {
		ShiftLeft: 'run',
		Space: 'jump',
		ArrowLeft: 'moveLeft',
		ArrowUp: 'jetpack',
		ArrowRight: 'moveRight',
		ArrowDown: 'crouch',
		KeyA: 'moveLeft',
		KeyW: 'jetpack',
		KeyD: 'moveRight',
		KeyS: 'crouch',
		KeyT: 'chat',
		Digit1: 'changeWeapon',
		Digit2: 'changeWeapon'
	},
	defaultSettings = {
		volMusic: '20',
		volEffects: '50',
		meteors: 'true',
		particles: 'true',
		name: 'Unnamed player',
		primary: 'Lmg',
		secondary: 'Smg',
		keymap: JSON.stringify(defaultKeymap)
	};

let settings = {};

for (let key in defaultSettings) {
	let fromStorage = localStorage.getItem('settings.' + key);
	settings[key] = fromStorage === null ? defaultSettings[key] : fromStorage;
}

let proxy = new Proxy(settings, {
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
	},
	deleteProperty: (target, property) => {
		if (defaultSettings[property] !== undefined) proxy[property] = defaultSettings[property];
	}
});

export default proxy;
