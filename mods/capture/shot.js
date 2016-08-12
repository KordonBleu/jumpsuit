"use strict";

if (vinage === undefined) var vinage = require("vinage");
if (resources === undefined) var resources = require("../../static/resource_loader.js");

function Shot(x, y, angle, origin, type) {
	this.box = new vinage.Rectangle(new vinage.Point(x, y), resources["laserBeam"].width, resources["laserBeam"].height, angle);
	this.lifeTime = 100;
	this.origin = origin;
	this.type = type || 0;
}
Shot.prototype.TYPES = {
	LASER: 0,
	BULLET: 1,
	KNIFE: 2, //a knife is no shot but can be handled the same way
	BALL: 3
};
Shot.prototype.speed = [30, 25, 13, 22];

if (typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = Shot;
