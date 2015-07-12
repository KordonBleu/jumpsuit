[].forEach.call(document.getElementsByTagName("dialog"), dialogPolyfill.registerDialog);

function cancelHandler(e) {
	e.target.parentElement.close();
}
[].forEach.call(document.getElementsByClassName("cancel-button"), function (button) { button.addEventListener("click", cancelHandler) });

var lobbyOkay = document.getElementById("lobby-okay");
lobbyOkay.addEventListener("click", function (e){
	var input = document.getElementById("lobby-input");
	if (input.value !== "") {
		currentConnection.createLobby(input.value);
		cancelHandler(e);
	}		
});


