let WebSocket = require('ws');
let ws = new WebSocket('ws://localhost:7483/');

ws.on('open', function open() {
	setInterval(function() {
		let array = new Uint8Array(1 + Math.round(Math.random()*99));

		for (let i = 0; i !== array.byteLength; ++i) {
			array[i] = Math.round(Math.random()*255);
		}
		console.log(array);

		ws.send(array.buffer, { binary: true, mask: true });
	}, 0);
});
