var Collib = new function(){
	this.circleAabb = function(circleX, circleY, circleRadius, boxX, boxY, boxWidth, boxHeight, boxAng) {
		var rot = boxAng > 0 ? -boxAng : -boxAng + Math.PI,
			tCircleX = Math.cos(rot) * (circleX - boxX) - Math.sin(rot) * (circleY - boxY) + boxX,//rotate the circle around the center of the OOB
			tCircleY = Math.sin(rot) * (circleX - boxX) + Math.cos(rot) * (circleY - boxY) + boxY,//so that the OBB can be treated as an AABB
			deltaX = Math.abs(tCircleX - boxX),
			deltaY = Math.abs(tCircleY - boxY);

		if(deltaX > boxWidth / 2 + circleRadius || deltaY > boxHeight / 2 + circleRadius) return false;

		if(deltaX <= boxWidth / 2 || deltaY <= boxHeight / 2) return true;

		return Math.pow(deltaX - boxHeight/2, 2) + Math.pow(deltaY - boxWidth/2, 2) <= Math.pow(circleRadius, 2);
	}

	this.obbObbCollision = function(rect1X, rect1Y, rect1Width, rect1Height, rect1Ang, rect2X, rect2Y, rect2Width, rect2Height, rect2Ang) {
		//rotate the first OOB to transform it in AABB to simplify calculations
		var rect2Rot = rect2Ang - rect1Ang;

		//we can't check against the diagonal because it is too CPU intensive
		var sideSum = rect2Width + rect2Height;//so we check against the sum of the sides which is > than the diagonal (not to much hopefully)
		if (!aabbAabbCollision(rect1X, rect1Y, rect1Width, rect1Height, rect2X, rect2Y, sideSum, sideSum)) return false;//eliminates most non-collisions

		var axes1 =  [{x: 1, y: 0}, {x:0, y:1}],
			axes2 = [],//these are vectors
			vertices = [{x: rect2X - Rect2Width, y: rect2Y - rect2Height}, {x: rect2X + Rect2Width, y: rect1Y + rect2Height}, {x: rect2X - Rect2Width, y: rect2Y + rect2Height}, {x: rect2X + Rect2Width, y: rect2Y - rect2Height}];
		vertices.forEach(function(vertex, index, array){
			var newVertex = {
				x: vertex.x*Math.cos(rect2Rot) - vertex.y*Math.sin(rect2Rot),
				y: vertex.x*Math.sin(rect2Rot) - vertex.y*cos(rect2Rot)
			}

			array[index] = newVertex;
		});
		vertices.forEach(function(vertex, index, array) {
			var prevVertex = index === 0 ? array[array.length - 1] : array[index - 1],
			vector = {
				y: -(vertex.x - prevVertex.x),//y = -x and x = y
				x: vertex.y - prevVertex.y//to get the normal vector
			}
			axes2.push(vector);
		});
	}

	this.aabbAabbCollision = function(rect1X, rect1Y, rect1Width, rect1Height, rect2X, rect2Y, rect2Width, rect2Height) {
		if(rect2X - rect2Width/2 >= rect1X + rect1Width/2
		|| rect2X + rect2Width/2 <= rect1X - rect1Width/2
		|| rect2Y - rect2Height/2 >= rect1Y + rect1Height/2
		|| rect2Y + rect2Height/2 <= rect1Y - rect1Height/2)
			return false;
		else
			return true;
	}
}
console.log(Collib);
