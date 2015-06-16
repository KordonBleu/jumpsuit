console.log("ws://" + window.location.host);
var socket = new WebSocket("ws://localhost:8080");
socket.onopen = function(e){
	console.log(e);
	socket.send("Hey server! I'm right here! :D");
	document.getElementById("new-lobby").addEventListener("click", function(){
		socket.send(JSON.stringify({
			msgType: "create lobby",//TODO: replace string value with some kind of enum
			lobbyName: prompt("What's the name of your lobby"),//TODO: make better pop-up
			characterName: document.getElementById("name").value,
			privateLobby: false//TODO: allow lobbies to be private
		}));
	});
};
socket.onmessage = function(message){
	console.log(message);
	try{
		msg = JSON.parse(message.data);
		switch(msg.msgType){
			case "error":
				alert(msg.error);
				//if(msg.error = "The lobby already exists") offerToJoinIt();
		}
	} catch(err) {
		console.log("Badly formated JSON message received:", err);
	}
}
