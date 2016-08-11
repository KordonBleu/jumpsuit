"use strict";

if (shot === undefined) var vinage = require("./shot.js");

function Weapon() {
	this.cycle = 0;
	this.recoil = 0;
	this.angle = 0;
}

function Lmg() {
	Weapon.call(this);
}
Lmg.prototype = Object.create(Weapon.prototype);
Lmg.prototype.constructor = Weapon;
Lmg.prototype.offsetX = 13;
Lmg.prototype.offsetY = -15;
Lmg.prototype.cycleLength = 9;
Lmg.prototype.muzzleX = 81;
Lmg.prototype.muzzleY = 6;
Lmg.prototype.spray = 0.025;
Lmg.prototype.fire = function() {
	//returns new shot set at correct position and angle
};

function Smg() {
	Weapon.call(this);
}
Smg.prototype = Object.create(Weapon.prototype);
Smg.prototype.constructor = Weapon;
Smg.prototype.offsetX = 13;
Smg.prototype.offsetY = -3;
Smg.prototype.cycleLength = 5;
Smg.prototype.muzzleX = 58;
Smg.prototype.muzzleY = -2;
Smg.prototype.spray = 0.04;
Smg.prototype.fire = function() {
	//returns new shot set at correct position and angle
};

function Shotgun() {
	Weapon.call(this);
}
Shotgun.prototype = Object.create(Weapon.prototype);
Shotgun.prototype.constructor = Weapon;
Shotgun.prototype.offsetX = 13;
Shotgun.prototype.offsetY = -5;
Shotgun.prototype.cycleLength = -1;
Shotgun.prototype.muzzleX = 84;
Shotgun.prototype.muzzleY = 2;
Shotgun.prototype.spray = 0.05;
Shotgun.prototype.fire = function() {
	//returns new shot set at correct position and angle
};

function Knife() {
	Weapon.call(this);
}
Knife.prototype = Object.create(Weapon.prototype);
Knife.prototype.constructor = Weapon;
Knife.prototype.offsetX = 23;
Knife.prototype.offsetY = -20;
Knife.prototype.cycleLength = -1;
Knife.prototype.muzzleX = 23;
Knife.prototype.muzzleY = 0;
Knife.prototype.spray = 0.005;
Knife.prototype.fire = function() {
	//returns new shot set at correct position and angle
};
