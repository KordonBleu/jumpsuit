"use strict";

module.exports = function(type, content) {
	function enumToString(e) {
		switch (e) {
			case 0: return "[DEV]".cyan.bold;
			case 1: return "[INFO]".yellow.bold;
			case 2: return "[ERR]".red.bold;
			case 3: return "[REGISTER]".grey.bold;
			case 4: return "[REGISTER]".green.bold;
		}
		return "";
	}

	if (type === 0 && process.env.NODE_ENV !== "development") return;

	let timestamp = ("[" + Math.round(Date.now() / 1000).toString(16) + "]").grey;
	console.log(timestamp + enumToString(type) + " " + content);//sanitize string for console output
};
module.exports.DEV = 0;
module.exports.INFO = 1;
module.exports.ERROR = 2;
module.exports.REGISTER = 3;
module.exports.S_REGISTER = 4;
