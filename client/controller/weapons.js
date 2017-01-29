import * as view from '../view/index.js';
import * as model from '../model/index.js';
import * as wsClt from '../websockets.js';

function getNextWeapon(weaponType) {
	const nextWeapon = {
		Lmg: 'Smg',
		Smg: 'Knife',
		Knife: 'Shotgun',
		Shotgun: 'Lmg'
	};

	return nextWeapon[weaponType];
}

view.weapons.setPrimaryWeapon(model.settings.primary);
view.weapons.setSecondaryWeapon(model.settings.secondary);

view.weapons.bindClickPrimaryWeapon(weapon => {
	let nextWeapon = getNextWeapon(weapon);
	console.log(weapon, nextWeapon);
	view.weapons.setPrimaryWeapon(nextWeapon);
	model.settings.primary = nextWeapon;
	if (typeof wsClt.currentConnection !== 'undefined') wsClt.currentConnection.setPreferences();
});

view.weapons.bindClickSecondaryWeapon(weapon => {
	let nextWeapon = getNextWeapon(weapon);
	view.weapons.setSecondaryWeapon(nextWeapon);
	model.settings.secondary = nextWeapon;
	if (typeof wsClt.currentConnection !== 'undefined') wsClt.currentConnection.setPreferences();
});
