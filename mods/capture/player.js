"use strict";

if (vinage === undefined) var vinage = require("vinage");
if (resources === undefined) var resources = require("../../static/resource_loader.js");

function Player(name, appearance, walkFrame, attachedPlanet, jetpack, health, fuel, armedWeapon, carriedWeapon, aimAngle) {
	this._walkCounter = 0;
	this.name = name;
	this.box = new vinage.Rectangle(new vinage.Point(0, 0), 0, 0);
	this.predictionTarget = {};
	this.predictionBase = {};
	this.controls = {jump: 0, crouch: 0, jetpack: 0, moveLeft: 0, moveRight: 0, run: 0, changeWeapon: 0, shoot: 0};
	this.velocity = new vinage.Vector(0, 0);
	this._appearance = appearance;
	this._walkFrame = "_stand";
	Object.defineProperties(this, {
		appearance: {
			get: function() {
				return this._appearance;
			},
			set: function(newAppearance) {
				this._appearance = newAppearance;
				this.setBoxSize();
			}
		},
		walkFrame: {
			get: function() {
				return this._walkFrame;
			},
			set: function(newWalkFrame) {
				this._walkFrame = newWalkFrame;
				this.setBoxSize();
			}
		}
	});
	this.jetpack = jetpack || false;
	if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
		this._lastHurt = 0;
		Object.defineProperty(this, "hurt", {
			get: function() {
				return Date.now() - this._lastHurt < 600;
			},
			set: function(hurt) {
				this._lastHurt = hurt ? Date.now() : 0;
			}
		});
	} else this.hurt = false;
	this.health = health || 8;
	this.fuel = fuel || 300;
	this.attachedPlanet = attachedPlanet || -1;
	this.lastlyAimedAt = Date.now();
	this.weaponry = {armed: armedWeapon || "lmg", carrying: carriedWeapon || "smg", cycle: 0, recoil: 0};
	this.aimAngle = aimAngle || 0;
	this.lastSound = 0;
	if (typeof module === "undefined" || typeof module.exports === "undefined") {
		this.panner = makePanner(0, 0);//note: won't be used if this is not another player
	}
}
Player.prototype.setWalkFrame = function() {
	if (this.box === undefined) return;
	if (this.attachedPlanet === -1){
		this.walkFrame = "_jump";
	} else {
		var leftOrRight = (this.controls["moveLeft"] || this.controls["moveRight"]);
		if (!leftOrRight) this.walkFrame = (this.controls["crouch"]) ? "_duck" : "_stand";
		else if (this._walkCounter++ >= (this.controls["run"] > 0 ? 6 : 10)){
			this._walkCounter = 0;
			this.walkFrame = (this.walkFrame === "_walk1") ? "_walk2" : "_walk1";
		}
		this.setBoxSize();
	}
};
Player.prototype.setBoxSize = function() {
	//if (this.walkFrame === undefined) console.log("WARNING: walkframe is undefined");
	this.box.width = resources[this.appearance + this.walkFrame].width;
	this.box.height = resources[this.appearance + this.walkFrame].height;
};
Player.prototype.getFinalName = function() {
	return this.name + (typeof this.homographId === "number" && this.homographId !== 0 ? " (" + this.homographId + ")" : "");
};

if (typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = Player;
