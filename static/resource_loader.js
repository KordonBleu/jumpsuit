"use strict";

function turnToBeige() {
}
function turnToGreen() {
}
function turnToPink() {
}
function turnToYellow() {
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

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
	const sizeOf = require("image-size");
	let resources = {};

	for (let path in resList) {
		let actualPath = path.replace(/\((.+)\)/, "$1");
		resources[actualPath] = sizeOf("./static/assets/images/" + actualPath + ".svg"); // get rid of the parens
		for (let variant in resList[path]) {
			let actualPath = path.replace(/\((.+)\)/, variant);
			resources[actualPath] = sizeOf("./static/assets/images/" + actualPath + ".svg"); // get rid of the parens
		}
	}

	module.exports = resources;
} else {
	function exportSvg(svgUrl, ...cbkSvgMods) {

		return new Promise(function(resolve, reject) {
			// get svg as a svg element from xhr
			let xhr = new XMLHttpRequest();
			xhr.responseType = "document";
			xhr.open("GET", svgUrl, true);

			let modifiedSvgList = [],
				promiseList = [];
			xhr.addEventListener("load", function(ev) {
				cbkSvgMods.forEach(function(cbk) { // modify svg element
					modifiedSvgList = modifiedSvgList.concat(cbk(ev.target.response.documentElement));
				});

				modifiedSvgList.forEach(function(svgElem) {
					promiseList.push(new Promise(function(resolve, reject) {
						let blob = new Blob([svgElem.outerHTML], {type: "image/svg+xml;charset=utf-8"}); // convert DOMString to Blob

						let img = new Image();
						img.addEventListener("load", function(ev) {
							resolve(ev.target);
						});
						img.addEventListener("error", function(err) {
							reject(err);
						});
						img.src = URL.createObjectURL(blob); // use blob://whatever to create image
					}));
				});

				Promise.all(promiseList).then(function(imgList) {
					resolve(imgList);
				}).catch(function(err) {
					reject(err);
				});
			});
			xhr.addEventListener("error", function(err) {
				reject(err);
			});

			xhr.send();


		});
	}

	exportSvg("https://jumpsuit.space/assets/images/alienBeige_badge.svg", function(svgElement) {
		svgElement.firstChild.firstChild.setAttribute("fill", "blue");

		return svgElement;
	}).then(function(imgList) {
		console.log(imgList);
	});


	var imgPromises = [],
		resources = {},
		loadProgress = 0;

	resPaths.forEach(function(path) {//init resources
		var promise = new Promise(function(resolve, reject) {
			var img = new Image();
			img.addEventListener("load", function(e) {
				resources[path.substring(0, path.lastIndexOf("."))] = e.target;
				resolve();
			});
			img.addEventListener("error", function(e) {
				reject(e);
			});
			img.src = "https://jumpsuit.space/assets/images/" + path;
		});
		promise.then(function() {
			++loadProgress;
		})
		.catch(function(err) {
			alert("Something went wrong. Try reloading this page.\n" +
				"If it still doesn't work, please open an issue on GitHub with a copy of the text in this message.\n" +
				"Error type: " + err.type + "\n" +
				"Failed to load " + err.target.src);
		});
		imgPromises.push(promise);
	});
}
