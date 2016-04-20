"use strict";

module.exports = function(type, content) {
	function enumToString(e) {
		switch (e) {
			case 0: return "[DEV]".cyan.bold;
			case 1: return "[INFO]".yellow.bold;
			case 2: return "[ERR]".red.bold;
			case 3: return "[RESULT]".magenta.bold;
		}
		return "";
	}

	if (type === 0 && process.env.NODE_ENV !== "development") return;

	let timestamp = (process.env.NODE_ENV === "development") ? ("[" + Math.round(Date.now() / 1000).toString(16) + "] ").grey : "";
	console.log(timestamp + enumToString(type) + " " + (content || ""));
};
module.exports.DEV = 0;
module.exports.INFO = 1;
module.exports.ERROR = 2;
module.exports.RESULT = 3;