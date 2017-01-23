import settings from '../model/settings.js';
import * as wsClt from '../websockets.js';

const primaryWeaponElement = document.getElementById('primary-weapon'),
	secondaryWeaponElement = document.getElementById('secondary-weapon');

let weaponryCycle = ['Lmg', 'Smg', 'Knife', 'Shotgun'],
	weaponNames = {
		Lmg: 'Borpov',
		Smg: 'Pezcak',
		Knife: 'throwable Knife',
		Shotgun: 'Azard'
	};

function setGun(element, type) {
	element.dataset.currentWeapon = type;
	element.childNodes[0].src = '/assets/images/' + type.toLowerCase() + '.svg';
	element.childNodes[1].textContent = weaponNames[type];
	if (typeof wsClt.currentConnection !== 'undefined') wsClt.currentConnection.setPreferences();
}
for (let element of document.querySelectorAll('.weapon-select')) {
	element.addEventListener('click', function() {
		let currentIndex = weaponryCycle.findIndex(function(x) { return x === element.dataset.currentWeapon; }),
			nextIndex;
		for (let offset = 1; offset !== weaponryCycle.length; offset++) {
			nextIndex = (currentIndex + offset) % weaponryCycle.length;
			let x = weaponryCycle[nextIndex];
			if (primaryWeaponElement.dataset.currentWeapon !== x && secondaryWeaponElement.dataset.currentWeapon !== x) break;
		}
		setGun(this, weaponryCycle[nextIndex]);
	});
}
setGun(primaryWeaponElement, settings.primary);
setGun(secondaryWeaponElement, settings.secondary);

