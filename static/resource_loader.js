"use strict";

function turnToBeige(svgElem) {
	//console.log("turning to beige");
	return svgElem; // should return a clone
}
function turnToGreen(svgElem) {
	//console.log("turning to green");
	return svgElem; // should return a clone
}
function turnToPink(svgElem) {
	//console.log("turning to pink");
	return svgElem; // should return a clone
}
function turnToYellow(svgElem) {
	//console.log("turning to yellow");
	return svgElem; // should return a clone
}

const resList = {
	"meteorBig1": {},
	"meteorBig2": {},
	"meteorBig3": {},
	"meteorBig4": {},
	"meteorMed1": {},
	"meteorMed2": {},
	"meteorSmall1": {},
	"meteorSmall2": {},
	"meteorTiny1": {},
	"meteorTiny2": {},

	"laserBeam": {},
	"laserBeamDead": {},
	"jetpack": {},
	"jetpackFire": {},
	"jetpackParticle": {},
	"planet": {},

	"heartFilled": {},
	"heartHalfFilled": {},
	"heartNotFilled": {},

	/*"goldCoin": {},
	"silverCoin": {},
	"bronzeCoin": {},*/

	"alien(Blue)_duck": {
		"Beige": turnToBeige,
		"Green": turnToGreen,
		"Pink": turnToPink,
		"Yellow": turnToYellow,
	},
	//"alien(Blue)_hurt": {},

	"alienBlue_jump": {},
	"alienBlue_stand": {},
	"alienBlue_walk1": {},
	"alienBlue_walk2": {},

	"alienBeige_jump": {},
	"alienBeige_stand": {},
	"alienBeige_walk1": {},
	"alienBeige_walk2": {},

	"alienGreen_jump": {},
	"alienGreen_stand": {},
	"alienGreen_walk1": {},
	"alienGreen_walk2": {},

	"alienPink_jump": {},
	"alienPink_stand": {},
	"alienPink_walk1": {},
	"alienPink_walk2": {},

	"alienYellow_jump": {},
	"alienYellow_stand": {},
	"alienYellow_walk1": {},
	"alienYellow_walk2": {},


	"alienBlue_mouth_happy": {},
	"alienBlue_mouth_unhappy": {},
	"alienBlue_mouth_surprise": {},

	"alienBeige_mouth_happy": {},
	"alienBeige_mouth_unhappy": {},
	"alienBeige_mouth_surprise": {},

	"alienGreen_mouth_happy": {},
	"alienGreen_mouth_unhappy": {},
	"alienGreen_mouth_surprise": {},

	"alienPink_mouth_happy": {},
	"alienPink_mouth_unhappy": {},
	"alienPink_mouth_surprise": {},

	"alienYellow_mouth_happy": {},
	"alienYellow_mouth_unhappy": {},
	"alienYellow_mouth_surprise": {},

	"astronaut_helmet": {},

	"enemyBlack1": {},
	"enemyBlack2": {},
	"enemyBlack3": {},
	"enemyBlack4": {},
	"enemyBlack5": {},

	"enemyBlue1": {},
	"enemyBlue2": {},
	"enemyBlue3": {},
	"enemyBlue4": {},
	"enemyBlue5": {},

	"enemyGreen1": {},
	"enemyGreen2": {},
	"enemyGreen3": {},
	"enemyGreen4": {},
	"enemyGreen5": {},

	"enemyRed1": {},
	"enemyRed2": {},
	"enemyRed3": {},
	"enemyRed4": {},
	"enemyRed5": {},

	"rifleShot": {},
	"lmg": {},
	"smg": {},
	"shotgun": {},
	"knife": {},
	"shotgunBall": {},
	"muzzle": {},
	"muzzle2": {}
};

function getFinalResNames(cbk) {
	for (let resName in resList) {
		let baseName = resName.replace(/\((.+)\)/, "$1"); // get rid of the parens

		let variants = {};

		for (let variant in resList[resName]) {
			let variantName = resName.replace(/\((.+)\)/, variant); // get rid of the parens
			variants[variantName] = resList[resName][variant];
		}

		cbk(baseName, variants);
	}
}

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	const sizeOf = require("image-size");
	let resources = {};

	getFinalResNames((baseName, variants) => {
		resources[baseName] = sizeOf("./static/assets/images/" + baseName + ".svg");

		for (let variant in variants) resources[variant] = resources[baseName];
	});

	module.exports = resources;
} else {
	function exportSvg(svgName, variants) {

		return new Promise((resolve, reject) => {
			// get svg as a svg element from xhr
			let xhr = new XMLHttpRequest();
			xhr.responseType = "document";
			xhr.open("GET", "https://jumpsuit.space/assets/images/" + svgName + ".svg", true);

			let promiseList = [];
			xhr.addEventListener("load", ev => {
				function svgToImg(name, svg) {
					promiseList.push(new Promise((resolve, reject) => {
						let blob = new Blob([svg.outerHTML], {type: "image/svg+xml;charset=utf-8"}); // convert DOMString to Blob

						let img = new Image();
						img.addEventListener("load", function(ev) {
							resources[name] = ev.target;
							resolve(ev.target);
						}.bind(this));
						img.addEventListener("error", err => {
							reject(err);
						});
						img.src = URL.createObjectURL(blob); // use blob://whatever to create image
					}));
				}
				//console.log(ev.target);
				svgToImg(svgName, ev.target.response.documentElement);
				for (let variant in variants) svgToImg(variant, variants[variant](ev.target.response.documentElement));

				Promise.all(promiseList).then(() => {
					resolve();
				}).catch(err => {
					reject(err);
				});
			});
			xhr.addEventListener("error", err => {
				reject(err);
			});

			xhr.send();
		});
	}


	var imgPromises = [],
		resources = {},
		loadProgress;
	getFinalResNames((baseName, variants) => {
		imgPromises.push(exportSvg(baseName, variants));
	});
}
