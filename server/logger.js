/* Once `require`d, the logger can be used like this `logger(logger.INFO, 'This is a message printed to the console');`.
However, as user input should never be trusted, logger provide a facility to escape it in case it contains characters that could be interpreted by the terminal in a way that is unwanted.
Every argument coming after the message will be escaped and inserted into the message, replacing `{argumentPositionNumber}`.
Example: `logger(logger.INFO, '"{0}" won the the match! "{1}" comes second and "{2}" third.', playerName1, playerName2, playerName3);` */

require('colors');

export default function logger(type, content, ...toBeEscaped) {
	function enumToString(e) {
		switch (e) {
			case 0: return '[DEV]'.cyan.bold;
			case 1: return '[INFO]'.yellow.bold;
			case 2: return '[ERR]'.red.bold;
			case 3: return '[REGISTER]'.bold;
			case 4: return '[REGISTER]'.green.bold;
		}
		return '';
	}

	if (type === 0 && process.env.NODE_ENV !== 'development') return;

	let timestamp = ('[' + Math.round(Date.now() / 1000).toString(16) + ']').grey;
	console.log(timestamp + enumToString(type) + ' ' + content.replace(/\{(\d+)\}/g, (match, n) => {
		//sanitize string for console output
		return toBeEscaped[n].replace(/[\u0000-\u001F\u007F-\u009F]/g, '\ufffd');
	}));
}
logger.DEV = 0;
logger.INFO = 1;
logger.ERROR = 2;
logger.REGISTER = 3;
logger.S_REGISTER = 4;
