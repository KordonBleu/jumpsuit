"use strict";

var rl;

function open() {
	rl = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.setPrompt("[INPUT] ".blue.bold, "[INPUT] ".length);
	rl.on("line", function (cmd) {
		//allowing to output variables on purpose
		try {
			var result = eval(cmd);
			if (result !== undefined) printEntry.print(printEntry.RESULT, result);
		} catch (ex) {
			printEntry.print(printEntry.ERROR, ex);
		}
	});
}
function close() {
	rl.close();
}

module.exports = {
	open,
	close
};
