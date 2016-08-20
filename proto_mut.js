//TODO: this better, if possible
Array.prototype.actualLength = function() {
	let value = 0;
	for (let entry of this) if (entry !== undefined) value++;
	return value;
};
Array.prototype.append = function(item) {
	for (let i = 0; i !== this.length; i++) {
		if (this[i] === null || this[i] === undefined) {
			this[i] = item;
			return i;
		}
	}
	return this.push(item) - 1;
};
