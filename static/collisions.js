"use strict";
function GeometricObject() {
	//To inherit from `GeometricObject`:
	// * call `return GeometricObject.call(this);` at the end of any constructor
	// * create a new prototype for your object, whose prototype is `GeometricObject.prototype`. Example: `YourConstructor.prototype = Object.create(GeometricObject.prototype);`.
	// * add a `_proxyMap` property to your object (directly or to its prototype).
	this._cache = {};
	this._upToDate = {};
	this._parents = [];
	if(typeof Proxy !== "undefined") return new Proxy(this, GeometricObject.proxyHandler);
}
GeometricObject.proxyHandler = {
	set: function(target, name, value) {
		if(name === "_proxyMap") {
			target[name] = value;
			return true;
		}
		if(target.hasOwnProperty(name)) {
			target[name] = value;
			for(var key in target._proxyMap) {
				if(key === name) {
					target._proxyMap[key].forEach(function(key) {
						if(target._parents.length === 0) target._upToDate[key] = false;
						else target._parents.forEach(function(parent) {
							parent._upToDate[key] = false;
						});
					});
					return true;
				}
			}
			return true;
		}
		return false;
	}
}
GeometricObject.prototype.circleObb = function(circle, rect) {
	var rot = rect.angle > 0 ? -rect.angle : -rect.angle + Math.PI,
		deltaX = circle.center.x - rect.center.x,
		deltaY = circle.center.y - rect.center.y,
		tCircleX = Math.cos(rot) * deltaX - Math.sin(rot) * deltaY + rect.center.x,//rotate the circle around the center of the OOB
		tCircleY = Math.sin(rot) * deltaX + Math.cos(rot) * deltaY + rect.center.y;//so that the OBB can be treated as an AABB
	deltaX = Math.abs(tCircleX - rect.center.x);
	deltaY = Math.abs(tCircleY - rect.center.y);

	if(deltaX > rect.width / 2 + circle.radius || deltaY > rect.height / 2 + circle.radius) return false;

	if(deltaX <= rect.width / 2 || deltaY <= rect.height / 2) return true;

	return Math.pow(deltaX - rect.height/2, 2) + Math.pow(deltaY - rect.width/2, 2) <= Math.pow(circle.radius, 2);
}
GeometricObject.prototype.obbObb = function(rectOne, rectTwo) {
	//rotate the first OOB to transform it in AABB to simplify calculations
	var rectTwoRot = rectTwo.angle - rectOne.angle,
		rectOne = new Rectangle(rectOne.center, rectOne.width, rectOne.height),
		rectTwo = new Rectangle(rectTwo.center, rectTwo.width, rectTwo.height, rectTwoRot);

	rectOne.center._parents.pop();//rectOne and RectTwo should be garbage collected at the end of the scope
	rectTwo.center._parents.pop();//so references to them must be made unreachable

	//we can't check against the diagonal because it is too CPU intensive
	var sideSum = rectTwo.width + rectTwo.height;//so we check against the sum of the sides which is > than the diagonal (not to much hopefully)
	if (!this.aabbAabb(rectOne, new Rectangle(new Point(rectTwo.center.x, rectTwo.center.y), sideSum, sideSum))) return false;//eliminates most non-collisions

	var axesVectOne = [new Vector(1, 0), new Vector(0, 1)],//rectOne is an AABB
		axesVectTwo = [];
	rectTwo.vertices.forEach(function(vertex, index, array) {
		var prevVertex = index === 0 ? array[array.length - 1] : array[index - 1],
		vector = new Vector(vertex, prevVertex).orthogonalVector;//this is stupid for a rectangle, not for a polygon

		//vector.normalize();
		axesVectTwo.push(vector);
	});
	var axesVect = axesVectOne.concat(axesVectTwo);

	return !axesVect.some(function(axis) {
		var projOne = rectOne.project(axis),
			projTwo = rectTwo.project(axis);

		return projOne.max < projTwo.min || projTwo.max < projOne.min;//overlapp or not
	});
}
GeometricObject.prototype.aabbAabb = function(rectOne, rectTwo) {
	if(rectOne.center.x - rectTwo.width/2 >= rectOne.center.x + rectOne.width/2
	|| rectTwo.center.x + rectTwo.width/2 <= rectOne.center.x - rectOne.width/2
	|| rectTwo.y - rectTwo.height/2 >= rectOne.center.y + rectOne.height/2
	|| rectTwo.y + rectTwo.height/2 <= rectOne.center.y - rectOne.height/2)
		return false;
	else
		return true;
}


function Point(x, y) {
	this.x = x;
	this.y = y;
	return GeometricObject.call(this);
}

function Vector(argOne, argTwo) {
	if(typeof argOne === "number" && typeof argTwo === "number") {//they are coordinates
		this.x = argOne;
		this.y = argTwo;
	} else if(argOne instanceof Point && argTwo instanceof Point) {
		this.x = argTwo.x - argOne.x;
		this.y = argTwo.y - argOne.y;
	}
	return GeometricObject.call(this);
}
Vector.prototype._proxyMap = {
	x: ["orthogonalVector", "length"],
	y: ["orthogonalVector", "length"]
};
Object.defineProperties(Vector.prototype, {
	"orthogonalVector": {
		get: function() {
			if(!this._upToDate.orthogonalVector) {
				this._upToDate.orthogonalVector = true;
				this._cache.orthogonalVector = new Vector(-this.y, this.x);
			}
			return this._cache.orthogonalVector;
		}
	},
	"length": {
		get: function() {
			if(!this._upToDate.length) {
				this._upToDate.length = true;
				this._cache.length = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
			}
			return this._cache.length;
		}
	}
});
Vector.prototype.dotProduct = function(vector) {
	return this.x*vector.x + this.y*vector.y;
}

Vector.prototype.normalize = function() {
	this.x /= this.length;
	this.y /= this.length;
}
Vector.prototype.apply = function(point) {
	point.x += this.x;
	point.y += this.y;
}

function Rectangle(centerPoint, width, height, angle) {
	this.center = centerPoint;
	this.center._proxyMap = Rectangle.centerProxyMap;//TODO: alow differents parents
	this.center._parents.push(this);//to have differents maps applied to them

	this.width = width;
	this.height = height;

	this.angle = angle === undefined ? 0 : angle;

	return GeometricObject.call(this);
}
Rectangle.prototype = Object.create(GeometricObject.prototype);
Rectangle.prototype._proxyMap = {
	width: ["vertices", "AAVertices"],
	height: ["vertices", "AAVertices"],
	angle: ["vertices"]
};
Rectangle.centerProxyMap = {
	x: ["vertices", "AAVertices"],
	y: ["vertices", "AAVertices"]
};
Object.defineProperties(Rectangle.prototype, {
	"vertices": {
		get: function() {
			if(!this._upToDate.vertices) {
				this._upToDate.vertices = true;

				this._cache.vertices = [];
				this.AAVertices.forEach(function(vertex) {
					var x = vertex.x - this.center.x,
						y = vertex.y - this.center.y,
						newVertex = new Point(
							x*Math.cos(this.angle) - y*Math.sin(this.angle) + this.center.x,
							x*Math.sin(this.angle) + y*Math.cos(this.angle) + this.center.y
					);
					this._cache.vertices.push(newVertex);
				}, this);
			}
			return this._cache.vertices;
		},
		enumerable: true
	},
	"AAVertices": {
		get: function() {
			if(!this._upToDate.AAVertices) {
				this._upToDate.AAVertices = true;
				this._cache.AAVertices = [new Point(this.center.x - this.width/2, this.center.y - this.height/2), new Point(this.center.x + this.width/2, this.center.y - this.height/2), new Point(this.center.x + this.width/2, this.center.y + this.height/2), new Point(this.center.x - this.width/2, this.center.y + this.height/2)];
			}
			return this._cache.AAVertices;
		}
	}
});
Rectangle.prototype.collision = function(geomObj) {
	if(geomObj instanceof Rectangle) {
		if(this.angle === geomObj.angle) {
			return this.aabbAabb(this, geomObj);
		} else {
			return this.obbObb(this, geomObj);
		}
	} else if(geomObj instanceof Circle) {
		return this.circleObb(geomObj, this);
	} else {
		throw new TypeError("Not a valid geometric object");
	}
}
Rectangle.prototype.project = function(axis) {
	var min = axis.dotProduct(this.vertices[0]),
		max = min;
	for(var i = 1; i !== this.vertices.length - 1; i++) {
		var proj = axis.dotProduct(this.vertices[i]);
		if(proj < min) min = proj;
		else if(proj > max) max = proj;
	}
	return {min: min, max: max};
}

function Circle(centerPoint, radius) {
	this.center = centerPoint;
	this.radius = radius;
}
Circle.prototype = Object.create(GeometricObject.prototype);
Object.defineProperty(Circle.prototype, "collision", {
	value: function(geomObj) {
		if(geomObj instanceof Rectangle) {
			return this.circleObb(this, geomObj);
		} else {
			throw new TypeError("Not a valid geometric object");
		}
	}
});

if(typeof module !== "undefined" && typeof module.exports !== "undefined") module.exports = {
	Point: Point,
	Vector: Vector,
	Rectangle: Rectangle,
	Circle: Circle
};
