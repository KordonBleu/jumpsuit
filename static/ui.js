"use strict";

var chatElement = document.getElementById("gui-chat"),
	chatFirstElement = document.getElementById("gui-chat-first"),
	chatInput = document.getElementById("chat-input"),

	healthElement = document.getElementById("gui-health"),
	fuelElement = document.getElementById("gui-fuel"),
	pointsElement = document.getElementById("gui-points"),

	menuBox = document.getElementById("menu-box"),
	infoBox = document.getElementById("info-box"),
	settingsBox = document.getElementById("settings-box"),

	closeSettingsElement = document.getElementById("close-settings-box"),
	closeInfoElement = document.getElementById("close-info-box"),

	/* inside menu-box */
	statusElement = document.getElementById("status"),
	playerListElement = document.getElementById("player-list"),
	teamListElement = document.getElementById("team-list"),
	newLobbyElement = document.getElementById("new-lobby"),//button
	disconnectElement = document.getElementById("disconnect"),//button
	/* inside settings-box */
	nameElement = document.getElementById("name"),
	musicVolumeElement = document.getElementById("music-volume"),
	effectsVolumeElement = document.getElementById("effects-volume"),
	keySettingsElement = document.getElementById("key-settings"),
	keyResetElement = document.getElementById("key-reset"),

	dialogElement = document.getElementById("dialog"),//prompts for new lobby


	settings = {
		name: localStorage.getItem("settings.name"),
		appearance: "alien" + (["Blue", "Beige", "Green", "Yellow", "Pink"])[Math.floor(Math.random() * 5)]
	};

var dialog = new function() {
	var textElement = document.getElementById("dialog-text"),
		buttonConfirm = document.getElementById("dialog-confirm"),
		buttonAbort = document.getElementById("dialog-abort"),
		_callback;

	textElement.addEventListener("input", function(){
		buttonConfirm.disabled = (textElement.value === "");
	});

	textElement.addEventListener("keydown", function(e){
		textElement.maxLength = 40;
		if (e.key === "Enter" || convertToKey(e.keyCode) === "Enter"){
			dialog.close(textElement.value);
		}
	});
	buttonConfirm.addEventListener("click", function(){
		dialog.close(textElement.value);
	});
	buttonAbort.addEventListener("click", function(){
		dialog.close();
	});
	this.show = function(callback){
		_callback = callback;//works fine with one or less dialog open at a time
		textElement.value = "";
		dialogElement.className = "";
	};
	this.close = function(result){
		dialogElement.className = "hidden";
		if (typeof result !== "undefined" && result !== "") _callback(result);
	};
}();

function addToogleListener(button, element) {
	button.addEventListener("click", function() {
		element.classList.toggle("hidden");
	});
}
addToogleListener(closeSettingsElement, settingsBox);
addToogleListener(document.getElementById("settings-button"), settingsBox);
addToogleListener(document.getElementById("menu-box-settings-button"), settingsBox);
addToogleListener(closeInfoElement, infoBox);
addToogleListener(document.getElementById("infos-button"), infoBox);
addToogleListener(document.getElementById("menu-box-infos-button"), infoBox);

/* Graphic settings */
document.getElementById("option-fullscreen").addEventListener("change", function() {
	if (!this.checked){
		if (document.exitFullscreen) {
			document.exitFullscreen();
		} else if(document.mozCancelFullScreen) {
			document.mozCancelFullScreen();
		} else if(document.webkitExitFullscreen) {
			document.webkitExitFullscreen();
		}
	} else {
		if (document.documentElement.requestFullscreen) {
			document.documentElement.requestFullscreen();
		} else if (document.documentElement.mozRequestFullScreen) {
			document.documentElement.mozRequestFullScreen();
		} else if (document.documentElement.webkitRequestFullscreen) {
			document.documentElement.webkitRequestFullscreen();
		}
	}
});
document.getElementById("option-moblur").addEventListener("change", function(){
	graphicFilters.motionBlur.enabled = this.checked;
	if (this.checked) canvas.classList.add("motionBlur");
	else canvas.classList.remove("motionBlur");
});
document.getElementById("option-performance").addEventListener("change", function(){
	if (this.checked) canvas.classList.add("boosted");
	else canvas.classList.remove("boosted");
	resizeCanvas();
});

/* Audio settings */
var volMusic = localStorage.getItem("settings.volume.music"),
	volEffects = localStorage.getItem("settings.volume.effects");
if (volMusic !== null && volEffects !== null) {
	musicVolumeElement.value = volMusic;
	effectsVolumeElement.value = volEffects;
	musicGain.gain.value = volMusic/100;
	soundEffectGain.gain.value = volEffects/100;
}
musicVolumeElement.addEventListener("input", function(ev) {
	musicGain.gain.value = ev.target.value/100;
});
effectsVolumeElement.addEventListener("input", function(ev) {
	soundEffectGain.gain.value = ev.target.value/100;
});

/* Key settings */
var changingKeys = false,
	selectedRow = -1;

keySettingsElement.addEventListener("click", function(e) {
	function reselect(obj){
		document.removeEventListener("keydown", wrap);
		Array.prototype.forEach.call(keySettingsElement.childNodes, function (row){ row.classList.remove("selected"); });
		if (typeof obj !== "undefined") {
			obj.classList.add("selected");
			var nsr = [].slice.call(obj.parentNode.childNodes, 0).indexOf(obj);
			if (nsr === selectedRow) reselect();
			else selectedRow = nsr;
		} else {
			selectedRow = -1;
			document.removeEventListener("keyup", wrap);
			changingKeys = false;
		}
	}
	function handleChangeKey(e) {
		console.log(selectedRow);
		var keyName = e.key || convertToKey(e.keyCode),
			action = keySettingsElement.childNodes[selectedRow].firstChild.textContent,
			alreadyTaken = false;

		for (var key in handleInput.keyMap) {
			if (key !== keyName) continue;
			alreadyTaken = true;
			break;
		}
		if (handleInput.reverseKeyMap[action][0] === keyName) handleInput.reverseKeyMap[action].length = 1;
		else handleInput.reverseKeyMap[action][1] = handleInput.reverseKeyMap[action][0];
		handleInput.reverseKeyMap[action][0] = keyName;
		handleInput.initKeymap(true);
	}
	function wrap(nE) {
		nE.preventDefault();
		switch(nE.type) {
			case "keydown":
				changingKeys = true;
				document.removeEventListener("keydown", wrap);
				document.addEventListener("keyup", wrap);
				break;
			case "keyup":
				handleChangeKey(nE);
				reselect();
				break;
		}
	}
	if (e.target.nodeName === "TD") {
		reselect(e.target.parentNode);
		document.addEventListener("keydown", wrap);
	}
});

keyResetElement.addEventListener("click", function() {
	handleInput.keyMap = defaultKeymap;
	handleInput.updateReverseKeyMap();
	handleInput.initKeymap();
});

/* Appearance & name */
[].forEach.call(document.getElementsByName("playerSelect"), function(element) {
	element.addEventListener("change", function() {
		settings.appearance = this.value;
		settingsChanged();
	});
	if (element.value === settings.appearance) {
		element.checked = true;
	}
});
nameElement.value = settings.name;
nameElement.addEventListener("keydown", function(e) {
	if (e.key === "Enter" || convertToKey(e.keyCode) === "Enter") {
		e.target.blur();//this triggers the "blur" event!
	}
});
nameElement.addEventListener("blur", function(e) {
	console.log(e.target.value);
	localStorage.setItem("settings.name", e.target.value);
	settings.name = e.target.value;
	settingsChanged();
});

/* Buttons */
disconnectElement.addEventListener("click", function(){
	if (this.textContent == "Disconnect"){
		this.textContent = "Connect";
		closeSocket();
	} else {
		this.textContent = "Disconnect";
		openSocket();
	}
});
document.getElementById("refresh").addEventListener("click", function() {//not called directly because
	refreshLobbies();
});
document.getElementById("leave-button").addEventListener("click", function() {//refreshLobbies and leaveLobby are not yet loaded
	leaveLobby();
});
newLobbyElement.addEventListener("click", function() {
	dialog.show(newLobby);
});

/* Chat */
chatInput.addEventListener("keydown", function(e) {
	if (e.key === "Enter" || convertToKey(e.keyCode) === "Enter") {
		if (!currentConnection.alive()) return;
		currentConnection.sendChat(this.value);
		this.value = "";
	} else if (e.key === "Tab" || convertToKey(e.keyCode) === "Tab") {
		e.preventDefault();

		if (!this.playerSelection) {
			this.playerSelection = true;
			this.cursor = this.selectionStart;
			var text = (this.cursor === 0) ? "" : this.value.substr(0, this.cursor);
			this.search = text.substr((text.lastIndexOf(" ") === -1) ? 0 : text.lastIndexOf(" ") + 1);

			this.searchIndex = 0;
			this.textParts = [this.value.substr(0, this.cursor - this.search.length), this.value.substr(this.cursor)];
		}

		var filteredPlayerList = (players[ownIdx].name.indexOf(this.search) === 0) ? [players[ownIdx].name] : [];
		for (var pid in players){
			if (players[pid].name.indexOf(this.search) === 0) filteredPlayerList.push(players[pid].name);
		}

		if (filteredPlayerList.length !== 0){
			this.value = this.textParts[0] + filteredPlayerList[this.searchIndex] + this.textParts[1];
			this.searchIndex++;
			if (this.searchIndex === filteredPlayerList.length) this.searchIndex = 0;
		}
	} else {
		this.playerSelection = false;
	}
});
function printChatMessage(name, appearance, content) {
	var element = document.createElement("p"),
		nameElement = document.createElement("b"),
		textElement = document.createTextNode(content);

		if (name === undefined) element.className = "server";
		else {
			nameElement.textContent = name + ": ";
			nameElement.className = appearance;
		}
		element.appendChild(nameElement);
		element.appendChild(textElement);
		chatElement.appendChild(element);
		while (chatElement.childNodes.length > 40) chatElement.removeChild(chatElement.childNodes[1]);
		var messageHeight = 0;
		[].forEach.call(chatElement.querySelectorAll("p:not(#gui-chat-first)"), function(element){
			messageHeight += element.clientHeight + 2;
		});
		chatFirstElement.style.marginTop = Math.min(0, chatElement.clientHeight - 2 - messageHeight) + "px";

}

/* Lobby list */
function printLobbies(lobbies) {
	console.log(lobbies);
	newLobbyElement.disabled = false;
	statusElement.textContent = "Choose a lobby";
	while (playerListElement.firstChild) playerListElement.removeChild(playerListElement.firstChild);
	lobbies.forEach(function(lobby) {
		var li = document.createElement("li"),
			el = document.createElement("a");
		el.href = "/lobbies/" + lobby.uid + "/";
		el.textContent = lobby.name + " | (" + lobby.players + " of " + lobby.maxPlayers + ")";
		li.appendChild(el);
		playerListElement.appendChild(li);//TODO: make a separate lobby and player list
	});
}

/* Player list */
function printPlayerList() {//TODO: a new playerlist design
	while (playerListElement.firstChild) playerListElement.removeChild(playerListElement.firstChild);
	msg.data.forEach(function(player, index) {
		li = document.createElement("li");
		li.textContent = player.name;
		if (index === ownIdx) li.style.color = "#f33";
		playerListElement.appendChild(li);
	});
}


window.onbeforeunload = function() {
	localStorage.setItem("settings.name", player.name);
	localStorage.setItem("settings.keys", JSON.stringify(handleInput.reverseKeyMap));
	localStorage.setItem("settings.volume.music", musicVolumeElement.value);
	localStorage.setItem("settings.volume.effects", effectsVolumeElement.value);
};
