import vinage from 'vinage';
import modulo from '../../shared/modulo.js';
import * as model from '../model/index.js';

let canvas = document.getElementById('canvas'),
	windowBox = new vinage.Rectangle(new vinage.Point(null, null), canvas.clientWidth, canvas.clientHeight);
windowBox.wrapX = function(entityX) {//get the position where the entity can be drawn on the screen
	return (modulo(entityX + model.entities.universe.width/2 - this.center.x, model.entities.universe.width) -model.entities.universe.width/2 + canvas.width/2 - (this.width*model.controls.zoomFactor - this.width)/2) * model.controls.zoomFactor;
};
windowBox.wrapY = function(entityY) {//get the position where the entity can be drawn on the screen
	return (modulo(entityY + model.entities.universe.height/2 - this.center.y, model.entities.universe.height) -model.entities.universe.height/2 + canvas.height/2 - (this.height*model.controls.zoomFactor - this.height)/2) * model.controls.zoomFactor;
};
windowBox.strokeAtmos = function(context, cx, cy, r, sw) {
	context.beginPath();
	context.arc(cx, cy, r*model.controls.zoomFactor, 0, 2 * Math.PI, false);
	context.globalAlpha = 0.1;
	context.fill();
	context.globalAlpha = 1;
	context.lineWidth = sw*model.controls.zoomFactor;
	context.stroke();
	context.closePath();
};
windowBox.drawRotatedImage = function(context, image, x, y, angle, sizeX, sizeY, mirrorX, mirrorY) {
	sizeX *= model.controls.zoomFactor;
	sizeY *= model.controls.zoomFactor;

	context.translate(x, y);
	context.rotate(angle);
	context.scale(mirrorX === true ? -1 : 1, mirrorY === true ? -1 : 1);
	let wdt = sizeX || image.width*model.controls.zoomFactor,
		hgt = sizeY || image.height*model.controls.zoomFactor;
	context.drawImage(image, -(wdt / 2), -(hgt / 2), wdt, hgt);
	context.resetTransform();
};

export default windowBox;
