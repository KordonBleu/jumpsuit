// an immutable bidirectional Map of string <-> number

export default class BiMap {
	constructor(isMask, ...fields) {
		this.isMask = isMask;

		this._strNbr = {};
		this._nbrStr = [];

		if (!isMask) {
			let val = 0;
			for (let field of fields) {
				this._strNbr[field] = val;
				this._nbrStr.push(field);
				++val;
			}
		} else {
			let val = 1;
			for (let field of fields) {
				this._strNbr[field] = val;
				this._nbrStr.push(field);
				val <<= 1;
			}
		}
	}
	getNbr(str) {
		return this._strNbr[str];
	}
	getStr(nbr) {
		return this._nbrStr[this.isMask ? Math.log2(nbr) : nbr];
	}
	*[Symbol.iterator]() {
		for (let key in this._strNbr) {
			yield {
				str: key,
				nbr: this._strNbr[key]
			};
		}
	}
}
