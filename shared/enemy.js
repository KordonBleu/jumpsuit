export default function Enemy(x, y, appearance) {
	this.appearance = appearance || 'enemy' + this.resources[Math.floor(Math.random() * this.resources.length)];
	this.box = new vinage.Rectangle(new vinage.Point(x, y), resources[this.appearance].width, resources[this.appearance].height);
	this.aggroBox = new vinage.Circle(new vinage.Point(x, y), 350);
	this.fireRate = 0;
}
Enemy.prototype.resources = ['Black1', 'Black2', 'Black3', 'Black4', 'Black5', 'Blue1', 'Blue2', 'Blue3', 'Green1', 'Green2', 'Red1', 'Red2', 'Red3'];
