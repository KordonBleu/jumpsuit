"use strict";
function GeometricObject() {
	//to inherit from `GeometricObject`:
	//call `return GeometricObject.call(this);` at the end of any constructor
	//create a new prototype for your object, whose prototype is `GeometricObject.prototype`. Example: `YourConstructor.prototype = Object.create(GeometricObject.prototype);`.
	var handler = {
		set: function(target, name, value) {
			if(target.hasOwnProperty(name)) {
				target._cache.needsUpdate = true;
				target[name] = value;
				return true;
			} else {
				throw new ReferenceError("This object doesn't allow properties to be added");
			}
		}
	}
	this._cache = {
		needsUpdate: true
	};
	if(typeof Proxy !== "undefined"){
		var proxy = new Proxy(this, handler);
		return proxy;
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

	//we can't check against the diagonal because it is too CPU intensive
	var sideSum = rectTwo.width + rectTwo.height;//so we check against the sum of the sides which is > than the diagonal (not to much hopefully)
	if (!this.aabbAabb(rectOne, new Rectangle(new Point(rectTwo.center.x, rectTwo.center.y), sideSum, sideSum))) return false;//eliminates most non-collisions

	var axesVectOne =  [new Vector(1, 0), new Vector(0, 1)],//rectOne is an AABB
		axesVectTwo = [];
	rectTwo.vertices.forEach(function(vertex, index, array) {
		var prevVertex = index === 0 ? array[array.length - 1] : array[index - 1],
		vector = new Vector(vertex, prevVertex).orthogonalVector;//this is stupid for a rectangle, not for a polygon

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


/* Do NOT inherit from the following classes!
   Why? Because the cache will be set to be refreshed if you modify
   any property of the instance of the inheriting class. */
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
Object.defineProperty(Vector.prototype, "orthogonalVector", {
	get: function() {
		if(this._cache.needsUpdate) {
			this._cache.needsUpdate = false;
			this._cache.orthogonalVector = new Vector(-this.y, this.x);
		}
		return this._cache.orthogonalVector;
	}
});
Vector.prototype.dotProduct = function(vector) {
	return this.x*vector.x + this.y*vector.y;
}

function Rectangle(centerPoint, width, height, angle) {
	this.center = centerPoint;
	this.width = width;
	this.height = height;

	this.angle = angle === undefined ? 0 : angle;

	return GeometricObject.call(this);
}
Rectangle.prototype = Object.create(GeometricObject.prototype);
Object.defineProperties(Rectangle.prototype, {
	"vertices": {
		get: function() {
			if(this._cache.needsUpdate || this.center._cache.needsUpdate) {
				this._cache.needsUpdate = false;
				this.center._cache.needsUpdate = false;

				this._cache.vertices = [];
				this.unrotatedVertices.forEach(function(vertex) {
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
		}
	},
	"unrotatedVertices": {
		get: function() {
			return [new Point(this.center.x - this.width/2, this.center.y - this.height/2), new Point(this.center.x + this.width/2, this.center.y + this.height/2), new Point(this.center.x - this.width/2, this.center.y + this.height/2), new Point(this.center.x + this.width/2, this.center.y - this.height/2)];
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
