'use strict';

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
let resources = {};



function getFinalResNames(cbk) {
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

const sizeOf = require('image-size');

getFinalResNames((baseName, variants) => {
	resources[baseName] = sizeOf(__dirname + '/assets/images/' + baseName + '.svg');

	for (let variant in variants) resources[variant] = resources[baseName];
});

export {resources as SrvResources};



function exportSvg(svgName, variants) {

	return new Promise((resolve, reject) => {
		// get svg as a svg element from xhr
		let xhr = new XMLHttpRequest();
		xhr.responseType = 'document';
		xhr.open('GET', 'https://jumpsuit.space/assets/images/' + svgName + '.svg', true);

		let promiseList = [];
		xhr.addEventListener('load', ev => {
			function svgToImg(name, svg) {
				promiseList.push(new Promise((resolve, reject) => {
					let blob = new Blob([svg.outerHTML], {type: 'image/svg+xml;charset=utf-8'}); // convert DOMString to Blob

					let img = new Image();
					img.addEventListener('load', function(ev) {
						resources[name] = ev.target;
						resolve(ev.target);
					}.bind(this));
					img.addEventListener('error', err => {
						reject(err);
					});
					img.src = URL.createObjectURL(blob); // use blob://whatever to create image
				}));
			}
			svgToImg(svgName, ev.target.response.documentElement);
			for (let variant in variants) svgToImg(variant, variants[variant](ev.target.response.documentElement.cloneNode(true)));

			Promise.all(promiseList).then(() => {
				resolve();
			}).catch(err => {
				reject(err);
			});
		});
		xhr.addEventListener('error', err => {
			reject(err);
		});

		xhr.send();
	});
}


let imgPromises = [];
getFinalResNames((baseName, variants) => {
	imgPromises.push(exportSvg(baseName, variants));
});

export let cltResPromise = new Promise((resolve, reject) => {
	Promise.all(imgPromises).then(() => {
		setMouth(resources['alienBeige_duck'], 24.443, 24.781, 15);
		setMouth(resources['alienBeige_jump'], 22.05, 26.45);
		setMouth(resources['alienBeige_stand'], 22.05, 26.5);
		setMouth(resources['alienBeige_walk1'], 25.8, 28.8);
		setMouth(resources['alienBeige_walk2'], 25.8, 28.8);

		setMouth(resources['alienBlue_duck'], 26.577, 38.755, 15);
		setMouth(resources['alienBlue_jump'], 27.75, 35.7);
		setMouth(resources['alienBlue_stand'], 27.75, 35.7);
		setMouth(resources['alienBlue_walk1'], 27.75, 37.55);
		setMouth(resources['alienBlue_walk2'], 27.75, 37.05);

		setMouth(resources['alienGreen_duck'], 25.443, 35.761, 15);
		setMouth(resources['alienGreen_jump'], 23.8, 36.1);
		setMouth(resources['alienGreen_stand'], 23.8, 36.1);
		setMouth(resources['alienGreen_walk1'], 25.556, 36.1);
		setMouth(resources['alienGreen_walk2'], 27.656, 36.1);

		setMouth(resources['alienPink_duck'], 32.05, 31, 14);
		setMouth(resources['alienPink_jump'], 30.2, 28.55);
		setMouth(resources['alienPink_stand'], 30.2, 28.4);
		setMouth(resources['alienPink_walk1'], 31.456, 30.25);
		setMouth(resources['alienPink_walk2'], 33.206, 30.25);

		setMouth(resources['alienYellow_duck'], 24.446, 37.35, 9.5);
		setMouth(resources['alienYellow_jump'], 21.8, 40.65);
		setMouth(resources['alienYellow_stand'], 21.8, 40.65);
		setMouth(resources['alienYellow_walk1'], 25.056, 40);
		setMouth(resources['alienYellow_walk2'], 26.806, 40);

		resolve(resources);
	}).catch((err) => {
		reject(err);
	});
});
function setMouth(body, mouthPosX, mouthPosY, mouthAngle) {
	body.mouthPosX = mouthPosX;
	body.mouthPosY = mouthPosY;
	if (mouthAngle !== undefined) body.mouthAngle = mouthAngle * Math.PI/180;//deg to rad
}
