'use strict';

module.exports = (config, lobbies) => {
	let monitorTimerID,
		traffic = {
			previous: {in: 0, out: 0, http: 0},
			beingConstructed: {in: 0, out: 0, http: 0},
			timer: 0
		};

	function monitoring() {
		function genSpaces(amount) {
			for(let spaces = ''; spaces.length !== amount; spaces += ' ');
			return spaces;
		}
		function printProperty(caption, content) {
			console.log(caption.bold + ':' + genSpaces(20 - caption.length) + content);
		}

		if (++traffic.timer === 2) {
			traffic.previous = traffic.beingConstructed;
			traffic.beingConstructed = {in: 0, out: 0};
			traffic.timer = 0;
		}

		process.stdout.write('\u001B[2J\u001B[0;0f');
		console.log('Jumpsuit Server version 0.0.0'.bold.yellow);
		printProperty('Traffic', (traffic.previous.in / 1024).toFixed(2) + ' kByte/s (in) | ' + (traffic.previous.out / 1024).toFixed(2) + ' kByte/s (out)');
		printProperty('Port', config.port);
		printProperty('Development Mode', (config.dev) ? 'Enabled' : 'Disabled');
		printProperty('Interactive Mode', (config.interactive) ? 'Enabled' : 'Disabled');

		if (lobbies !== undefined) {
			let headerSizes = [35, 10, 15],
				headerNames = ['lobby name', 'players', 'process time'],
				header = '';
			headerSizes.forEach((hSize, i) => {
				header += (i !== 0 ? ' | ' : '') + headerNames[i].toUpperCase().bold + genSpaces(hSize - headerNames[i].length);
			});
			console.log('\n' + header);

			let lobbyAmount = 0, maxLobbies = 8; //should be different according to terminal height and width
			lobbies.some((lobby, index, array) => {
				if (lobbyAmount >= 8) {
					console.log('... ('  + (array.length - maxLobbies) + ' lobbies not listed)');
					return true; //'some' function can be exited with return, but it needs to return something so just return; wouldn't work
				}
				let indexAsString = index.toString(),
					info = indexAsString + genSpaces(headerSizes[0] - indexAsString.length),
					amount = lobby.players.length.toString(),
					processTime = lobby.processTime.toString();
				info += '   ' + amount + genSpaces(headerSizes[1] - amount.length);
				info += '   ' + processTime;
				console.log(info);
				lobbyAmount++;
			});
		}
	}

	function cleanup() {
		process.stdout.write('\u001b[?1049l');
		process.exit();
	}
	function setMonitorMode() {
		process.stdout.write('\u001b[?1049h\u001b[H');//save terminal
		monitorTimerID = setInterval(monitoring, 500);

		process.on('SIGINT', cleanup);
		process.on('SIGTERM', cleanup);
	}
	function unsetMonitorMode() {
		clearInterval(monitorTimerID);
		process.stdout.write('\u001b[?1049l');

		process.removeListener('SIGINT', cleanup);
		process.removeListener('SIGTERM', cleanup);
	}


	return {
		setMonitorMode,
		unsetMonitorMode,
		getTraffic: () => {
			return traffic;
		}
	};
};
