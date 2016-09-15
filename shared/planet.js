import vinage from 'vinage';

export default class Planet {
	constructor(x, y, radius, type) {
		this.box = new vinage.Circle(new vinage.Point(x, y), radius);
		this.atmosBox = new vinage.Circle(this.box.center, Math.floor(radius * (1.5 + Math.random()/2)));
		this.progress = {team: 'neutral', value: 0, color: 'rgb(80,80,80)'};
		this.type = type || Math.round(Math.random());
	}
}
Planet.prototype.typeEnum = {
	CONCRETE: 0,
	GRASS: 1
};
