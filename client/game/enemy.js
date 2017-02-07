import Enemy from '../../shared/enemy.js';

export default class extends Enemy {
	constructor(x, y, appearance) {
		super(x, y, appearance);
	}
	draw(context, windowBox) {
		windowBox.drawRotatedImage(context,
			window.resources[this.appearance],
			windowBox.wrapX(this.box.center.x),
			windowBox.wrapY(this.box.center.y),
			this.box.angle
		);
	}
	drawAtmos(context, windowBox) {
		context.fillStyle = '#aaa';
		context.strokeStyle = context.fillStyle;

		windowBox.strokeAtmos(
			context,
			windowBox.wrapX(this.box.center.x),
			windowBox.wrapY(this.box.center.y),
			350, 4
		);
	}
}
