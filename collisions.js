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
/*GeometricObject.prototype.obbObb = function(rectOne, rectTwo) {
	//rotate the first OOB to transform it in AABB to simplify calculations
	var rectTwoRot = rectTwo.angle - rectOne.angle;

	//we can't check against the diagonal because it is too CPU intensive
	var sideSum = rectTwo.width + rectTwo.height;//so we check against the sum of the sides which is > than the diagonal (not to much hopefully)
	if (!this.aabbAabb(rectOne, new Rectangle(new Point(rectTwo.center.x, rectTwo.center.y), sideSum, sideSum))) return false;//eliminates most non-collisions

	var axesVectOne =  [{x: 1, y: 0}, {x:0, y:1}],//rectOne is an AABB
		axesVectTwo = [];
		rectTwo.vertices.forEach(function(vertex, index, array) {
			var prevVertex = index === 0 ? array[array.length - 1] : array[index - 1],
			vector = new Vector(vertex - prevVertex).orthogonalVector;

		axesVectTwo.push(vector);
	});

	return true;//TODO: complete this function!
}*/
GeometricObject.prototype.obbObb = function(rectOne, rectTwo) {
	var radiusRectOne = Math.sqrt(Math.pow(rectOne.width, 2) + Math.pow(rectOne.height, 2)) / 2,
		radiusRectTwo = Math.sqrt(Math.pow(rectTwo.width, 2) + Math.pow(rectTwo.height, 2)) / 2; 

	//test if circumcirle (circle that goes through all points of the rectangle) touch / overlap each other
	//this avoids unnecessary calculations *yay*
	if (Math.pow(rectOne.center.x - rectOne.center.x, 2) + Math.pow(rectTwo.center.y - rectTwo.center.y) >= Math.pow(radiusRectOne + radiusRectTwo, 2)){
		//I dont quite know how to call the variables  ._.
		var _a = rectOne.angle % (Math.PI * 0.5) + Math.sin(rectOne.height / rectOne.width),
			_b = rectTwo.angle % (Math.PI * 0.5) + Math.sin(rectTwo.height / rectTwo.width),
			_c = new Point(Math.sin(_a) * radiusRectOne, -Math.cos(_a) * radiusRectOne),
			_d = new Point(Math.sin(_b) * radiusRectTwo, -Math.cos(_b) * radiusRectTwo),
			_e = new Point((rectOne.center.x - rectTwo.center.x < 0) ? -1 : 1, (rectOne.center.y - rectTwo.center.y < 0) ? -1 : 1);
			
		if (rectOne.center.x + _e.x * _c.x > rectTwo.center.x + -_e.x * _d.x && rectOne.center.y + _e.y * _c.y > rectTwo.center.y + -_e.y * _d.x) return true;
	}
	return false;
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
	if(typeof argOne === "number" && typeof argTwo === "number", typeof x) {//they are coordinates
		this.x = argOne;
		this.y = argTwo;
	} else if(argOne instanceof Point && argoTwo instanceof Point) {
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

function Rectangle(centerPoint, width, height, angle) {
	this.center = centerPoint;
	this.width = width;
	this.height = height;

	this.angle = angle === undefined ? 0 : angle;

	this._unrotatedVertices = [new Point(this.center.x - this.width/2, this.center.y - this.height/2), new Point(this.center.x + this.width/2, this.center.y + this.height/2), new Point(this.center.x - this.width/2, this.center.y + this.height/2), new Point(this.center.x + this.width/2, this.center.y - this.height/2)];
	return GeometricObject.call(this);
}
Rectangle.prototype = Object.create(GeometricObject.prototype);
Object.defineProperty(Rectangle.prototype, "vertices", {
	get: function() {
		if(this._cache.needsUpdate || this.center._cache.needsUpdate) {
			this._cache.needsUpdate = false;
			this.center._cache.needsUpdate = false;

			this._cache.vertices = [];
			this._unrotatedVertices.forEach(function(vertex, index) {
				var newVertex = new Point(
					vertex.x*Math.cos(this.angle) - vertex.y*Math.sin(this.angle),
					vertex.x*Math.sin(this.angle) - vertex.y*Math.cos(this.angle)
				);
				this._cache.vertices[index] = newVertex;
			}, this);
		}
		return this._cache.vertices;
	}
});
Rectangle.prototype.collision = function(geomObj) {
	if(geomObj instanceof Rectangle) {
		if(this.angle === 0 && geomObj.angle === 0) {
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
