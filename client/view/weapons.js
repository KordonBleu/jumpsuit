const primaryWeaponElement = document.getElementById('primary-weapon'),
	secondaryWeaponElement = document.getElementById('secondary-weapon');

const weaponNames = {
	Lmg: 'Borpov',
	Smg: 'Pezcak',
	Knife: 'Throwing knife',
	Shotgun: 'Azard'
};

function setGun(element, type) {
	console.log(element.dataset.currentWeapon);
	element.dataset.currentWeapon = type;
	element.childNodes[0].src = '/assets/images/' + type.toLowerCase() + '.svg';
	element.childNodes[1].textContent = weaponNames[type];
}

export function setPrimaryWeapon(weaponType) {
	setGun(primaryWeaponElement, weaponType);
}
export function setSecondaryWeapon(weaponType) {
	setGun(secondaryWeaponElement, weaponType);
}
export function bindClickPrimaryWeapon(handler) {
	primaryWeaponElement.addEventListener('click', e => {
		handler(e.currentTarget.dataset.currentWeapon);
	});
}
export function bindClickSecondaryWeapon(handler) {
	secondaryWeaponElement.addEventListener('click', e => {
		handler(e.currentTarget.dataset.currentWeapon);
	});
}
