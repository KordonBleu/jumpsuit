/*function Test(lel){
	var handler = {
		set: function(a, b, c){
			console.log(this, a, b, c);
		}
	}
	this.lel = lel;
	//this.proxy = new Proxy(this, handler);
	console.log(Proxy, typeof Proxy);
	Proxy.create.call(this, handler);
	//return "hi";
}
var a = new Test(12);
//a.proxy.lel = 25;
console.log(a, Proxy);
*/
function Point(x, y){
	this.x = x;
	this.y = y;
}

function Vector(argOne, argTwo){
	if(typeof argOne === "number" && typeof argTwo === "number", typeof x){//they are coordinates
		this.x = x;
		this.y = y;
	} else if(argOne instanceof Point && argoTwo instanceof Point){
		this.x = argTwo.x - argOne.x;
		this.y = argTwo.y - argOne.y;
	}
}
Vector.prototype = {
	get orthogonalVector(){//TODO: cache stuff
		return new Vector(-this.y, this.x);
	}
};

function Rectangle(centerPoint, width, height, angle){
	this.center = centerPoint;
	this.width = width;
	this.height = height;

	this.angle = angle === undefined ? 0 : angle;

	this._unrotatedVertices = [new Point(this.center.x - this.width/2, this.center.y - this.height/2), new Point(this.center.x + this.width/2, this.center.y + this.height/2), new Point(this.center.x - this.width/2, this.center.y + this.height/2), new Point(this.center.x + this.width/2, this.center.y - this.height/2)];
}
Rectangle.prototype = {
	get vertices(){
		if(this.angle !== this._angleCache){//TODO: also update when other parameters are modified
			this._angleCache = this.angle;

			this._verticesCache = [];
			this._unrotatedVertices.forEach(function(vertex, index){
				var newVertex = new Point(
					vertex.x*Math.cos(this.angle) - vertex.y*Math.sin(this.angle),
					vertex.x*Math.sin(this.angle) - vertex.y*Math.cos(this.angle)
				);
				this._verticesCache[index] = newVertex;
			}, this);
		}
		return this._verticesCache;
	}
};


var Collib = new function(){
	this.circleObb = function(circleX, circleY, circleRadius, rect) {
		var rot = rect.angle > 0 ? -rect.angle : -rect.angle + Math.PI,
			deltaX = circleX - rect.center.x,
			deltaY = circleY - rect.center.y,
			tCircleX = Math.cos(rot) * deltaX - Math.sin(rot) * deltaY + rect.center.x,//rotate the circle around the center of the OOB
			tCircleY = Math.sin(rot) * deltaX + Math.cos(rot) * deltaY + rect.center.y;//so that the OBB can be treated as an AABB
		deltaX = Math.abs(tCircleX - rect.center.x);
		deltaY = Math.abs(tCircleY - rect.center.y);

		if(deltaX > rect.width / 2 + circleRadius || deltaY > rect.height / 2 + circleRadius) return false;

		if(deltaX <= rect.width / 2 || deltaY <= rect.height / 2) return true;

		return Math.pow(deltaX - rect.height/2, 2) + Math.pow(deltaY - rect.width/2, 2) <= Math.pow(circleRadius, 2);
	}

	this.obbObb = function(rectOne, rectTwo) {
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
	}

	this.aabbAabb = function(rectOne, rectTwo){
		//if(rectOne.angle !== 0 || rectTwo.angle !== 0) throw new TypeError("At least one of the submitted rectangle is not an AABB");
		if(rectOne.center.x - rectTwo.width/2 >= rectOne.center.x + rectOne.width/2
		|| rectTwo.center.x + rectTwo.width/2 <= rectOne.center.x - rectOne.width/2
		|| rectTwo.y - rectTwo.height/2 >= rectOne.center.y + rectOne.height/2
		|| rectTwo.y + rectTwo.height/2 <= rectOne.center.y - rectOne.height/2)
			return false;
		else
			return true;
	}
}
