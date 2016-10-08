import Planet from '../shared/planet.js';

export default class CltPlanet extends Planet {
	constructor(x, y, radius, type) {
		super(x, y, radius, type);
	}
	updateColor() {
		if (this.progress.team === 'neutral') this.progress.color = 'rgb(80,80,80)';
		else {
			let fadeRGB = [];
			for (let j = 0; j <= 2; j++) fadeRGB[j] = Math.round(this.progress.value / 100 * (parseInt(this.teamColors[this.progress.team].substr(1 + j * 2, 2), 16) - 80) + 80);

			this.progress.color = 'rgb(' + fadeRGB[0] + ',' + fadeRGB[1] + ',' + fadeRGB[2] + ')';
		}
	}
	draw(context, windowBox) {
		let cx = windowBox.wrapX(this.box.center.x),
			cy = windowBox.wrapY(this.box.center.y);

		//draw planet
		context.beginPath();
		context.arc(cx, cy, this.box.radius*windowBox.zoomFactor, 0, 2 * Math.PI, false);
		context.closePath();
		context.fill();

		//apply texture
		windowBox.drawRotatedImage(context, window.resources['planet'], cx, cy, this.box.radius*windowBox.zoomFactor / 200 * Math.PI, 2*this.box.radius, 2*this.box.radius);

		//draw progress indicator
		context.beginPath();
		context.arc(cx, cy, 50*windowBox.zoomFactor, -Math.PI * 0.5, (this.progress.value / 100) * Math.PI * 2 - Math.PI * 0.5, false);
		context.lineWidth = 10*windowBox.zoomFactor;
		context.strokeStyle = 'rgba(0, 0, 0, 0.2)';
		context.stroke();
		context.closePath();
	}
	drawAtmos(context, windowBox) {
		context.fillStyle = this.progress.color;
		context.strokeStyle = context.fillStyle;

		windowBox.strokeAtmos(
			context,
			windowBox.wrapX(this.box.center.x),
			windowBox.wrapY(this.box.center.y),
			this.box.radius*1.75, 2
		);
	}
}
CltPlanet.prototype.teamColors = {'alienBeige': '#e5d9be', 'alienBlue': '#a2c2ea', 'alienGreen': '#8aceb9', 'alienPink': '#f19cb7', 'alienYellow': '#fed532' };
