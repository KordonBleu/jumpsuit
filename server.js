var fs = require("fs"),
	readline = require("readline"),
	http = require("http"),
	WebSocketServer = require("ws").Server;

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on("line", function (cmd) {
	//allowing to output variables on purpose
	console.log(eval(cmd));
});

//send static files
var server = http.createServer(function (req, res){
	if(req.url === "/") req.url = "/index.html";
	fs.readFile(__dirname + "/static" + req.url, function (err, data){
		if (err) {
			if(err.code === "ENOENT"){
				res.writeHead(404);
				res.end("Error 404:\n" + JSON.stringify(err) + __dirname);
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


var lobbies = [
		{uid: "A3fe1", lobbyName: "Lobby No. 1 Join & Have Fun", players: Array.apply(null, Array(8)).map(Number.prototype.valueOf, 0), playerAmount: 0}
	],
	wss = new WebSocketServer({server: server});

lobbies.findLobbyUid = function (uid){
	for (var i = 0; i != lobbies.length; i++){
		lobbies[i].uid === uid;
		return i;
	}
	return -1;
}

function generateUid(){
	//hexadecimal form 1048576 to 16777215
	return Math.floor(Math.random() * 16 * 1048576).toString(16);
}
var MESSAGE_ERROR = 0,
	MESSAGE_CONNECT = 1,
	MESSAGE_GET_LOBBIES = 2,
	MESSAGE_SENT_LOBBIES = 3,
	MESSAGE_SETTINGS_CHANGED = 4,
	MESSAGE_CREATE_LOBBY = 5,
	MESSAGE_CONNECT_ERR_FULL = 6,
	MESSAGE_CONNECT_SUCCESSFUL = 7,
	MESSSAGE_PLAYER_DATA = 8,
	MESSAGE_PLAYER_POSITIONS = 9,
	MESSAGE_CHUNKS = 10,
	MESSAGE_CHECK_ALIVE = 11,
	MESSAGE_DISCONNECT = 12,
	MESSAGE_LEAVE_LOBBY = 13;

wss.on("connection", function(ws){
	console.log("Player connected to server");
	ws.on("message", function(message){
		try{
			var msg = JSON.parse(message);
			console.log("received: ", msg);
			switch(msg.msgType){
				case MESSAGE_CONNECT:
					var id = lobbies.findLobbyUid(msg.data.uid);
					if (id >= 0){
						if (lobbies[id].players.length === lobbies[id].maxplayers){
							ws.send(JSON.stringify({msgType: MESSAGE_CONNECT_ERR_FULL }));
						} else {
							var pid = lobbies[id].players.indexOf(0);
							lobbies[id].players.splice(pid, 1, ({name: "", appearance: ""}));
							lobbies[id].playerAmount++;
							ws.send(JSON.stringify({msgType: MESSAGE_CONNECT_SUCCESSFUL, data: {pid: pid}}));
						}						
					}
					break;
				case MESSAGE_GET_LOBBIES:
					var i, j = [];
					for (i = 0; i != lobbies.length; i++){
						j[i] = {uid: lobbies[i].uid, name: lobbies[i].lobbyName, players: lobbies[i].playerAmount, maxplayers: lobbies[i].players.length};
					}
					ws.send(JSON.stringify({msgType: MESSAGE_SENT_LOBBIES, data: j}));
					break;
				case MESSSAGE_PLAYER_DATA:
					var id = lobbies.findLobbyUid(msg.data.uid);
					if (id >= 0){
						lobbies[id].players[msg.data.pid] = {name: msg.data.name, appearance: msg.data.appearance};
						console.log(lobbies[id].players);
					} else {
						ws.send(JSON.stringify({msgType: MESSAGE_ERROR, data: {content: "Lobby doesnt exist (anymore)"}}));
					}
					break;
				case MESSAGE_DISCONNECT:
				case MESSAGE_LEAVE_LOBBY:
					var id = lobbies.findLobbyUid(msg.data.uid);
					if (id >= 0){
						lobbies[id].players[msg.data.pid] = 0;
					}
					break;
			}
		} catch(e) {
			console.log("Badly formated JSON message received:", e, message);
		}
	});
	ws.on("close", function(e){
		console.log(e);
	});

	ws.send('Message that should fail to be parsed');
});
