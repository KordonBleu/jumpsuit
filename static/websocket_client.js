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

function connection(){
	var socket = new WebSocket("ws://localhost:8080"),
		pid = -1;
	this.alive = function (){ return socket.readyState === 1; }
	

	socket.onopen = function(e){
		// this.socket.send(JSON.stringify({ msgType: MESSAGE_CONNECT, data: {name: player.playerName, appearance: player.name, lobby: 0}})); use if lobby is selected
		this.send(JSON.stringify({ msgType: MESSAGE_GET_LOBBIES }));
		document.getElementById("new-lobby").disabled = false;
		document.getElementById("refresh-or-leave").disabled = false;
		document.getElementById("disconnect").disabled = false;
	};
	socket.onerror = function(e){
		document.getElementById("new-lobby").disabled = true;
		document.getElementById("refresh-or-leave").disabled = true;
		this.close();		
	};
	socket.onmessage = function(message){	
		try{
			msg = JSON.parse(message.data);
			switch(msg.msgType){
				case MESSAGE_SENT_LOBBIES:
					var i, list = document.getElementById("player-list"), el, li;
					while (list.firstChild) {
   						list.removeChild(list.firstChild);
					}
					for (i = 0; i != msg.data.length; i++){
						li = document.createElement("li");
						el = document.createElement("a");
						el.href = "#c:" + msg.data[i].uid;
						el.textContent = msg.data[i].name + " | (" + msg.data[i].players + " of " + msg.data[i].maxplayers + ")";
						li.appendChild(el);
						list.appendChild(li);
					}
					break;
				case MESSAGE_CONNECT_SUCCESSFUL:					
					pid = msg.data.pid;
					document.getElementById("refresh-or-leave").textContent = "Leave Lobby";
					break;
				case MESSAGE_PLAYER_DATA:
					var i, list = document.getElementById("player-list"), li;
					while (list.firstChild) {
						list.removeChild(list.firstChild);
					}
					for (i = 0; i != msg.data.length; i++){
						li = document.createElement("li");
						li.textContent = msg.data[i].name;
						if (i === pid) li.style.color = "#f33";
						list.appendChild(li);
					}
					break;				
				case MESSAGE_PLAYER_POSITIONS:
					break;
				case MESSAGE_ERROR:
					alert("Error: ", msg.data.content);
					break;
			}
		} catch(err) {
			console.log("Badly formated JSON message received:", err);
		}
	};
	this.close = function(){
		socket.send(JSON.stringify({
			msgType: MESSAGE_DISCONNECT,
			data: {uid: location.hash.substr(3), pid: pid}
		}));
		location.hash = "";
		socket.close();		
	};
	this.connectLobby = function (){
		socket.send(JSON.stringify({
			msgType: MESSAGE_CONNECT,
			data: {uid: location.hash.substr(3), name: player.playerName, appearance: player.name}
		}));
	};
	this.createLobby = function (n){
		socket.send(JSON.stringify({
			msgType: MESSAGE_CREATE_LOBBY,
			data: {name: n, privateLobby: false}
		}));
		this.refreshLobbies();
	};
	this.refreshLobbies = function(){
		socket.send(JSON.stringify({ msgType: MESSAGE_GET_LOBBIES }));
	};
	this.leaveLobby = function(){
		socket.send(JSON.stringify({
			msgType: MESSAGE_LEAVE_LOBBY,
			data: {pid: pid, uid: location.hash.substr(3)}
		}));
		location.hash = "";
	};
	this.sendSettings = function (){
		socket.send(JSON.stringify({
			msgType: MESSAGE_PLAYER_DATA,
			data: {pid: pid, uid: location.hash.substr(3), name: player.playerName, appearance: player.name}
		}));
	};
}

var currentConnection = new connection();

function closeSocket(){
	document.getElementById("new-lobby").disabled = true;
	document.getElementById("refresh-or-leave").textContent = "Refresh";
	document.getElementById("refresh-or-leave").disabled = true;
	currentConnection.close();
}
function openSocket(){
	currentConnection = new connection();
}
function newLobby(){
	if (!currentConnection.alive()) return;
	var dialog = document.getElementById("lobby-name-dialog");
	dialog.showModal();
}

function refreshLobbies(){
	if (!currentConnection.alive()) return;
	currentConnection.refreshLobbies();
}
function leaveLobby(){
	if (!currentConnection.alive()) return;
	currentConnection.leaveLobby();
	currentConnection.refreshLobbies();
	document.getElementById("button-2").textContent = "Refresh";
}

function hashChange() {
	if (!currentConnection.alive()) return;
	if (location.hash.indexOf("c:") === 1){
		currentConnection.connectLobby();
	}
}
window.addEventListener("hashchange", hashChange);

function settingsChanged(){
	if (!currentConnection.alive() || location.hash.indexOf("c:") !== 1) return; 
	currentConnection.sendSettings();
}
