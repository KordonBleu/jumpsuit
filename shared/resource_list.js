// the following functions assume the original image is beige
function turnToBlue(svgElem) {
	svgElem.innerHTML = svgElem.innerHTML.replace(/#e0d1af/g, '#8db5e7');
	return svgElem;
}
function turnToGreen(svgElem) {
	svgElem.innerHTML = svgElem.innerHTML.replace(/#e0d1af/g, '#6fc4a9');
	return svgElem;
}
function turnToPink(svgElem) {
	svgElem.innerHTML = svgElem.innerHTML.replace(/#e0d1af/g, '#f19cb7');
	return svgElem;
}
function turnToYellow(svgElem) {
	svgElem.innerHTML = svgElem.innerHTML.replace(/#e0d1af/g, '#fc0');
	return svgElem;
}

const resList = {
	'meteorBig1': {},
	'meteorBig2': {},
	'meteorBig3': {},
	'meteorBig4': {},
	'meteorMed1': {},
	'meteorMed2': {},
	'meteorSmall1': {},
	'meteorSmall2': {},
	'meteorTiny1': {},
	'meteorTiny2': {},

	'laserBeam': {},
	'laserBeamDead': {},
	'jetpack': {},
	'jetpackFire': {},
	'jetpackParticle': {},
	'planet': {},

	'heartFilled': {},
	'heartHalfFilled': {},
	'heartNotFilled': {},

	/*'goldCoin': {},
	'silverCoin': {},
	'bronzeCoin': {},*/
	//'alien(Blue)_hurt': {},

	'alien(Beige)_duck': {
		'Blue': turnToBlue,
		'Green': turnToGreen,
		'Pink': turnToPink,
		'Yellow': turnToYellow
	},
	'alien(Beige)_jump': {
		'Blue': turnToBlue,
		'Green': turnToGreen,
		'Pink': turnToPink,
		'Yellow': turnToYellow
	},
	'alien(Beige)_stand': {
		'Blue': turnToBlue,
		'Green': turnToGreen,
		'Pink': turnToPink,
		'Yellow': turnToYellow
	},
	'alien(Beige)_walk1': {
		'Blue': turnToBlue,
		'Green': turnToGreen,
		'Pink': turnToPink,
		'Yellow': turnToYellow
	},
	'alien(Beige)_walk2': {
		'Blue': turnToBlue,
		'Green': turnToGreen,
		'Pink': turnToPink,
		'Yellow': turnToYellow
	},

	'alienBeige_mouth_happy': {},
	'alienBeige_mouth_unhappy': {},
	'alienBeige_mouth_surprise': {},

	'alienBlue_mouth_happy': {},
	'alienBlue_mouth_unhappy': {},
	'alienBlue_mouth_surprise': {},

	'alienGreen_mouth_happy': {},
	'alienGreen_mouth_unhappy': {},
	'alienGreen_mouth_surprise': {},

	'alienPink_mouth_happy': {},
	'alienPink_mouth_unhappy': {},
	'alienPink_mouth_surprise': {},

	'alienYellow_mouth_happy': {},
	'alienYellow_mouth_unhappy': {},
	'alienYellow_mouth_surprise': {},

	'astronaut_helmet': {},

	'enemyBlack1': {},
	'enemyBlack2': {},
	'enemyBlack3': {},
	'enemyBlack4': {},
	'enemyBlack5': {},

	'enemyBlue1': {},
	'enemyBlue2': {},
	'enemyBlue3': {},
	'enemyBlue4': {},
	'enemyBlue5': {},

	'enemyGreen1': {},
	'enemyGreen2': {},
	'enemyGreen3': {},
	'enemyGreen4': {},
	'enemyGreen5': {},

	'enemyRed1': {},
	'enemyRed2': {},
	'enemyRed3': {},
	'enemyRed4': {},
	'enemyRed5': {},

	'rifleShot': {},
	'lmg': {},
	'smg': {},
	'shotgun': {},
	'knife': {},
	'shotgunBall': {},
	'muzzle': {},
	'muzzle2': {}
};

export function getFinalResNames(cbk) {
	for (let resName in resList) {
		let baseName = resName.replace(/\((.+)\)/, '$1'); // get rid of the parens

		let variants = {};

		for (let variant in resList[resName]) {
			let variantName = resName.replace(/\((.+)\)/, variant); // get rid of the parens
			variants[variantName] = resList[resName][variant];
		}

		cbk(baseName, variants);
	}
}

export let resourceAmount = Object.keys(resList).length;
