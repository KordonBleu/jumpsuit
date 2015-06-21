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


var lobbies = [],
	wss = new WebSocketServer({server: server});

lobbies.createLobby = function(_name, _maxPlayers){
	var n = (typeof(_name) === "undefined") ? "Unnamed Lobby" : _name,
		m = (typeof(_maxPlayers) === "undefined") ? 8 : _maxPlayers,
		f = function(){
			var o = [];
			this.players.forEach(function(p, i){
				o[i] = (p === 0) ? 0 : {name: p.name, appearance: p.appearance};
			});
			return o;
		}
	this.push({uid: generateUid(), lobbyName: n, players: Array.apply(null, Array(m)).map(Number.prototype.valueOf, 0), playersAmount: 0, getPlayerData: f});
}
lobbies.findLobbyUid = function (uid){
	for (var i = 0; i != lobbies.length; i++){
		lobbies[i].uid === uid;
		return i;
	}
	return -1;
}

function generateUid(){
	//hexadecimal form 1048576 to 16777215
	//TODO: make it not repeatable ! (important :D)
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
	MESSAGE_PLAYER_DATA = 8,
	MESSAGE_PLAYER_POSITIONS = 9,
	MESSAGE_CHUNKS = 10,
	MESSAGE_CHECK_ALIVE = 11,
	MESSAGE_DISCONNECT = 12,
	MESSAGE_LEAVE_LOBBY = 13,
	MESSAGE_PLAYER_CONTROLS = 14;

wss.on("connection", function(ws){	
	ws.on("message", function(message){
		try{
			var msg = JSON.parse(message);
			console.log("received: ", msg);
			switch(msg.msgType){
				case MESSAGE_CONNECT:
					var id = lobbies.findLobbyUid(msg.data.uid);
					if (id >= 0){
						if (lobbies[id].players.length === lobbies[id].maxplayers){
							ws.send(JSON.stringify({msgType: MESSAGE_CONNECT_ERR_FULL}));
						} else {
							var pid = lobbies[id].players.indexOf(0), data;
							lobbies[id].players.splice(pid, 1, ({name: msg.data.name, appearance: msg.data.appearance, ws: this}));
							lobbies[id].playersAmount++;
							ws.send(JSON.stringify({msgType: MESSAGE_CONNECT_SUCCESSFUL, data: {pid: pid}}));							
							ws.send(JSON.stringify({msgType: MESSAGE_PLAYER_DATA, data: lobbies[id].getPlayerData()}));
						}
					}
					break;
				case MESSAGE_GET_LOBBIES:
					var i, j = [];
					for (i = 0; i != lobbies.length; i++){
						j[i] = {uid: lobbies[i].uid, name: lobbies[i].lobbyName, players: lobbies[i].playersAmount, maxplayers: lobbies[i].players.length};
					}
					ws.send(JSON.stringify({msgType: MESSAGE_SENT_LOBBIES, data: j}));
					break;
				case MESSAGE_CREATE_LOBBY:
					lobbies.createLobby(msg.data.name, 8);
					break;
				case MESSSAGE_PLAYER_DATA:
					var id = lobbies.findLobbyUid(msg.data.uid);
					if (id >= 0){
						lobbies[id].players[msg.data.pid] = {name: msg.data.name, appearance: msg.data.appearance, ws: this};
						ws.send(JSON.stringify({msgType: MESSSAGE_PLAYER_DATA, data: lobbies[id].getPlayerData()}));
					} else {
						ws.send(JSON.stringify({msgType: MESSAGE_ERROR, data: {content: "Lobby doesnt exist (anymore)"}}));
					}
					break;
				case MESSAGE_DISCONNECT:
				case MESSAGE_LEAVE_LOBBY:
					var id = lobbies.findLobbyUid(msg.data.uid);
					if (id >= 0){
						lobbies[id].players[msg.data.pid] = 0;
						lobbies[id].playersAmount--;
					}
					break;
			}
		} catch(e) {
			console.log(e, message);
		}
	});
	ws.on("close", function(e){
		var found = false;
		console.log("testing....");
		lobbies.forEach(function (lobby){			
			lobby.players.forEach(function (player, i){
				if (player.ws == ws){
					console.log("player found in " + lobby.lobbyName + " : " + i);
					lobby.players[i] = 0;
					lobby.playersAmount--;
					found = true;
					return;	
				}
			});
			if (found) return;
		});
		if (!found) console.log("No player found / wasnt connected to a lobby");
	});
});

lobbies.createLobby("Lobby No. 1", 7);