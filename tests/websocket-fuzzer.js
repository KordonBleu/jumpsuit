var WebSocket = require("ws");
var ws = new WebSocket("ws://localhost:7483/");

ws.on("open", function open() {
	setInterval(function() {
		var array = new Uint8Array(1 + Math.round(Math.random()*99));

		for (var i = 0; i !== array.byteLength; ++i) {
			array[i] = Math.round(Math.random()*255);
		}
		console.log(array);

		ws.send(array.buffer, { binary: true, mask: true });
	}, 0);
});
