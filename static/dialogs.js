var dialogs = document.getElementsByTagName("dialog");
for (dialog of dialogs) dialogPolyfill.registerDialog(dialog);

function cancelHandler(e) {
	console.log("cancel", e);
	e.target.parentElement.close();
}

var cancelButtons = document.getElementsByClassName("cancel-button");
for (button of cancelButtons) {
	button.addEventListener("click", cancelHandler);
}

var lobbyOkay = document.getElementById("lobby-okay");
lobbyOkay.addEventListener("click", function() {
	var input = document.getElementById("lobby-input");
		if (input.value !== "") currentConnection.createLobby(input.value);
		//else show error dialog
});

