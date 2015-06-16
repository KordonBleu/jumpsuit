var fs = require("fs"),
	http = require("http"),
	WebSocketServer = require("ws").Server;

//send static files
var server = http.createServer(function (req, res){
if(req.url === "/") req.url = "/index.html";
	fs.readFile(__dirname + "/static" + req.url, function (err, data){
		if (err) {
			if(err.code === "ENOENT"){
				res.writeHead(404);
				res.end("Error 404:\n" + JSON.stringify(err));
			} else {
				res.writeHead(500);
				res.end("Error 500:\n" + JSON.stringify(err));
			}
			return;
		}
		res.writeHead(200);
		res.end(data);
	});
});
server.listen(8080);
console.log("The server is up!");

var lobbies = {};
var wss = new WebSocketServer({server: server});
wss.on("connection", function(ws){
	console.log("There's someone");

	ws.on("message", function(message){
		try{
			var msg = JSON.parse(message);
			console.log("received: ", msg);
			switch(msg.msgType){
				case "create lobby":
					console.log("Yay");
					if(!(msg.lobbyName in lobbies)){
						lobbies[msg.lobbyName] = [ws];
						console.log(lobbies);
					} else {
						var error = JSON.stringify({
							msgType: "error",
							error: "The lobby already exists"
						});
						console.log(error);
						ws.send(error);
					}
			}
		} catch(e) {
			console.log("Badly formated JSON message received:", e, message);
		}
	});
	ws.on("close", function(){
		//TODO: remove client from lobby array
		console.log("I'm so sad :'(");
	});

	ws.send('Message that should fail to be parsed');
});
