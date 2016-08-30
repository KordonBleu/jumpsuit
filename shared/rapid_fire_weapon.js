import Weapon from '<@Weapon@>';

export default class extends Weapon {
	constructor(owner) {
		super(owner);
		this.cycle = 0;
	}
	canRapidFire() {
		this.cycle = ++this.cycle % this.cycleLength;
		return this.cycle === 0;
	}
}
