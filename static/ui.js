"use strict";

var chatElement = document.getElementById("gui-chat"),
	chatFirstElement = document.getElementById("gui-chat-first"),
	chatInputContainer = document.getElementById("chat-input-container"),
	chatInput = document.getElementById("chat-input"),
	playerListElement = document.getElementById("player-list"),

	healthElement = document.getElementById("gui-health"),
	fuelElement = document.getElementById("gui-fuel"),
	pointsElement = document.getElementById("gui-points"),
	achievementBox = document.getElementById("gui-achievement"),
	/* boxed windows */
	menuBox = document.getElementById("menu-box"),
	infoBox = document.getElementById("info-box"),
	settingsBox = document.getElementById("settings-box"),

	/* inside menu-box */
	statusElement = document.getElementById("status"),
	lobbyTableElement = document.getElementById("lobby-table"),
	lobbyTableHeaderRowElement = lobbyTableElement.firstElementChild.firstElementChild,
	lobbyListElement = document.getElementById("lobby-list"),
	teamListElement = document.getElementById("team-list"),
	menuBoxSettingsButton = document.getElementById("menu-box-settings-button"),
	menuBoxInfoButton = document.getElementById("menu-box-info-button"),
	/* search options */
	searchInput = document.getElementById("search-input"),
	emptyLobbyInput = document.getElementById("empty-lobby"),
	/* inside settings-box */
	closeSettingsButton = document.getElementById("close-settings-box"),
	nameElement = document.getElementById("name"),
	musicVolumeElement = document.getElementById("music-volume"),
	effectsVolumeElement = document.getElementById("effects-volume"),
	keySettingsElement = document.getElementById("key-settings"),
	keyResetElement = document.getElementById("key-reset"),
	/* inside info-box */
	closeInfoButton = document.getElementById("close-info-box"),
	/* in-game buttons */
	guiOptionElement = document.getElementById("gui-options"),//contains the following buttons
	settingsButton = document.getElementById("settings-button"),
	infoButton = document.getElementById("info-button"),
	/* new lobby dialog */
	dialogElement = document.getElementById("dialog"),
	/* canvases */
	canvas = document.getElementById("canvas"),
	minimapCanvas = document.getElementById("minimap-canvas"),

	settings = {
		name: localStorage.getItem("settings.name") || "Unnamed Player",
		volMusic: localStorage.getItem("settings.volume.music") || 50,
		volEffects: localStorage.getItem("settings.volume.effects") || 50
	};


/* Buttons */
function addToggleListener(button, element) {
	button.addEventListener("click", function() {
		element.classList.toggle("hidden");
		document.getElementById("shade-box").classList.toggle("hidden");
	});
}
addToggleListener(closeSettingsButton, settingsBox);
addToggleListener(settingsButton, settingsBox);
addToggleListener(menuBoxSettingsButton, settingsBox);
addToggleListener(closeInfoButton, infoBox);
addToggleListener(infoButton, infoBox);
addToggleListener(menuBoxInfoButton, infoBox);

/* Graphic settings */
/*document.getElementById("option-fullscreen").addEventListener("change", function() {
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

musicVolumeElement.value = settings.volMusic;
effectsVolumeElement.value = settings.volEffects;
musicGain.gain.value = settings.volMusic / 100;
soundEffectGain.gain.value = settings.volEffects / 100;

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
		if (selectedRow === -1) return;
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
	handleInput.initKeymap(false);
});

/* Name */
nameElement.value = settings.name;
nameElement.addEventListener("keydown", function(e) {
	if (e.key === "Enter" || convertToKey(e.keyCode) === "Enter") {
		e.target.blur();//this triggers the "blur" event!
	}
});
nameElement.addEventListener("blur", function(e) {
	localStorage.setItem("settings.name", e.target.value);
	settings.name = e.target.value;
	currentConnection.setName();
});

/* Buttons */
document.getElementById("leave-button").addEventListener("click", function() {
	currentConnection.close();
	game.stop();
});
function isDocumentInFullScreenMode() {
	// Note that the browser fullscreen (triggered by short keys) might
	// be considered different from content fullscreen when expecting a boolean
	return ((document.fullscreenElement && document.fullscreenElement !== null) ||// alternative standard methods
		document.mozFullScreen || document.webkitIsFullScreen);// current working methods
}

/* Chat */
chatInput.addEventListener("keydown", function(e) {
	if (e.key === "Enter" || convertToKey(e.keyCode) === "Enter") {
		if (!currentConnection.alive()) return;
		currentConnection.sendChat(this.value);
		this.value = "";
		this.blur();
	} else if (e.key === "Tab" || convertToKey(e.keyCode) === "Tab") {
		e.preventDefault();
		if (!this.playerSelection) {
			this.playerSelection = true;
			var text = (this.selectionStart === 0) ? "" : this.value.substr(0, this.selectionStart);
			this.search = text.substr((text.lastIndexOf(" ") === -1) ? 0 : text.lastIndexOf(" ") + 1);

			this.searchIndex = 0;
			this.textParts = [this.value.substr(0, this.selectionStart - this.search.length), this.value.substr(this.selectionEnd)];
		}

		printPlayerList(this.search);

		var filteredPlayerList = [];
		for (var pid in players) {
			if (players[pid].name.indexOf(this.search) !== -1) filteredPlayerList.push(players[pid].name);
		}
		if (filteredPlayerList.length !== 0) {
			var cursorPos = this.textParts[0].length + filteredPlayerList[this.searchIndex].length;
			this.value = this.textParts[0] + filteredPlayerList[this.searchIndex] + this.textParts[1];
			chatInput.setSelectionRange(cursorPos, cursorPos);
			this.searchIndex++;
			if (this.searchIndex === filteredPlayerList.length) this.searchIndex = 0;
		}
	} else {
		this.playerSelection = false;
		printPlayerList("");
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
	Array.prototype.forEach.call(chatElement.querySelectorAll("p:not(#gui-chat-first)"), function(element){
		messageHeight += element.clientHeight + 2;
	});
	chatFirstElement.style.marginTop = Math.min(0, chatElement.clientHeight - 2 - messageHeight) + "px";
}

/* Player list */
chatInputContainer.addEventListener("focus", function() {
	playerListElement.classList.remove("hidden");
	printPlayerList("");
}, true);
chatInputContainer.addEventListener("blur", function() {
	playerListElement.classList.add("hidden");
}, true);
playerListElement.addEventListener("click", function(e) {
	if (e.target.tagName === "LI") {
		chatInput.focus();
		var cursorPos = chatInput.selectionStart + e.target.textContent.length;
		chatInput.value = chatInput.value.substring(0, chatInput.selectionStart) + e.target.textContent + chatInput.value.substring(chatInput.selectionEnd, chatInput.value.length);
		chatInput.setSelectionRange(cursorPos, cursorPos);
	}
});
function printPlayerList(filter) {
	while (playerListElement.firstChild) playerListElement.removeChild(playerListElement.firstChild);
	players.forEach(function(player, index) {
		if (filter !== "" && player.name.indexOf(filter) === -1) return;
		var li = document.createElement("li");
		li.textContent = player.name;
		li.style.color = Planet.prototype.teamColors[player.appearance];
		if (index === ownIdx) li.style.fontWeight = "bold";
		playerListElement.appendChild(li);
	});
}

/* Lobby list */
function addServerRow(server) {
	var row = document.createElement("tr"),
		serverNameTd = document.createElement("td"),
		modNameTd = document.createElement("td"),
		buttonTd = document.createElement("td"),
		button = document.createElement("button");

		serverNameTd.textContent = server.name;
		modNameTd.textContent = server.mod;

		button.textContent = "Play!";
		button.dataset.href = server.url;
		row.setAttribute("title", server.url);

		buttonTd.appendChild(button);
		row.appendChild(serverNameTd);
		row.appendChild(modNameTd);
		row.appendChild(buttonTd);

		lobbyListElement.insertBefore(row, lobbyListElement.firstChild);
		server.tr = row;
}
function removeServer(id) {
	serverList[id].tr.remove();
	serverList.splice(id, 1);
}
lobbyListElement.addEventListener("click", function(e) {
	if (e.target.tagName === "BUTTON") {
		if (e.target !== lobbyListElement.lastElementChild.lastElementChild.firstElementChild) {// Play!
			console.log(e.target);
			currentConnection = new Connection(e.target.dataset.href);
			/*var lobbyUid = e.target.dataset.href.replace(/^\/lobbies\/([0-9a-f]+)\/$/, "$1");
			if (currentConnection.lobbyUid !== null) currentConnection.leaveLobby();
			currentConnection.connectLobby(lobbyUid);
			history.pushState(null, "Lobby" + lobbyUid, "/lobbies/" + lobbyUid + "/");*/
		} else {// Create!
			var nameInput = lobbyListElement.lastElementChild.firstElementChild.firstElementChild,
				playerAmountInput = lobbyListElement.lastElementChild.children[1].firstElementChild;
			if (nameInput.value !== "" && playerAmountInput.value !== "") {
				currentConnection.createLobby(nameInput.value, playerAmountInput.valueAsNumber);
				nameInput.value = "";
			}
		}
	}
});

/* Sorting */
lobbyTableHeaderRowElement.addEventListener("click", function(e) {
	if (e.target.tagName === "IMG") {
		switch (e.target.getAttribute("src")) {
			case "/assets/images/sort_arrow_double.svg":
				e.target.setAttribute("src", "/assets/images/sort_arrow_down.svg");
				Array.prototype.forEach.call(lobbyTableHeaderRowElement.children, function(elem) {
					var arrowImg = elem.lastElementChild;
					if (elem.lastElementChild !== null && e.target !== arrowImg) {
						arrowImg.setAttribute("src", "/assets/images/sort_arrow_double.svg");
					}
				});

				switch (e.target.previousSibling.data.trim()) {
					case "Lobby name":
						serverList.sort(function(a, b) {
							return b.name.trim().localeCompare(a.name.trim());
						});
						break;
					case "Players":
						serverList.sort(function(a, b) {
							if (a.players < b.players || a.players > b.players) return a.players < b.players ? -1 : 1;
							else return a.maxPlayers < b.maxPlayers ? -1 : a.maxPlayers > b.maxPlayers ? 1 : 0;
						});
				}
				break;
			case "/assets/images/sort_arrow_down.svg":
				e.target.setAttribute("src", "/assets/images/sort_arrow_up.svg");
				serverList.reverse();
				break;
			case "/assets/images/sort_arrow_up.svg":
				e.target.setAttribute("src", "/assets/images/sort_arrow_down.svg");
				serverList.reverse();
				break;
		}
		addServerRow();
	}
});
/* Search filters */
function applyLobbySearch() {
	serverList.forEach(function(lobby, index) {
		//lobbyListElement.children are reversed compared to serverList
		var currentElem = lobbyListElement.children[serverList.length - index -1];
		if (new RegExp(searchInput.value, "gi").test(lobby.name)) currentElem.classList.remove("search-hidden");
		else currentElem.classList.add("search-hidden");
	});
}
function applyEmptinessCheck() {
	serverList.forEach(function(lobby, index) {
		//lobbyListElement.children are reversed compared to serverList
		var currentElem = lobbyListElement.children[serverList.length - index -1];
		if (emptyLobbyInput.checked && lobby.players === 0) currentElem.classList.add("empty-lobby-hidden");
		else currentElem.classList.remove("empty-lobby-hidden");
	});
}
searchInput.addEventListener("input", applyLobbySearch);
emptyLobbyInput.addEventListener("change", applyEmptinessCheck);

function showAchievement(title, reward) {
	if (!title && !reward) return;
	achievementBox.setAttribute("data-title", title);
	achievementBox.setAttribute("data-reward", reward);
	achievementBox.classList.remove("hidden");
	setTimeout(function() { this.classList.add("hidden");  }.bind(achievementBox), 4000);
}

window.onbeforeunload = function() {
	localStorage.setItem("settings.name", settings.name);
	localStorage.setItem("settings.keys", JSON.stringify(handleInput.reverseKeyMap));
	localStorage.setItem("settings.volume.music", musicVolumeElement.value);
	localStorage.setItem("settings.volume.effects", effectsVolumeElement.value);
};

