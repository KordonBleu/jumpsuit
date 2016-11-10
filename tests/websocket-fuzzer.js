if (process.argv[2] === undefined) {
	console.log("Please specify the location");
	process.exit(1);
}

let WebSocket = require('ws');
let ws = new WebSocket('ws://' + process.argv[2]);

ws.on('open', function open() {
	setInterval(function() {
		let array = new Uint8Array(1 + Math.round(Math.random()*99));

		for (let i = 0; i !== array.byteLength; ++i) {
			array[i] = Math.round(Math.random()*255);
		}
		console.log(array);

		ws.send(array.buffer);
	}, 0);
});
