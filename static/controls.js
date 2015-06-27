var gameBlurred = "";

function convertToKey(keyCode) {
	if (keyCode > 47 && keyCode < 58) return keyCode - 48;//numbers
	else if (keyCode > 95 && keyCode < 106) return keyCode - 96;//numpad
	else if (keyCode > 64 && keyCode < 91) return convertToKey.keyMap.charAt(keyCode - 65);//charcters
	else if (keyCode > 111 && keyCode < 124) return "F" + (keyCode - 111);//F-keys
	else return convertToKey.keyMapMisc[keyCode];//misc
}
convertToKey.keyMapChar = "abcdefghijklmnopqrstuvwxyz";
convertToKey.keyMapMisc = {//there are more but those are the most common
	8: "Backspace",
	9: "Tab",
	13: "Enter",
	16: "Shift",
	17: "Control",
	18: "Alt",
	19: "Pause",
	20: "CapsLock",
	27: "Escape",
	37: "ArrowLeft",
	38: "ArrowUp",
	39: "ArrowRight",
	40: "ArrowDown"
}

function handleInputMobile(e){
	for (var t = 0; t < e.changedTouches.length; t++){
		var touch = e.changedTouches.item(t);
		if (touch.target.id == "canvas"){
			dragging(e.type, touch.pageX, touch.pageY);
		} else {
			e.preventDefault();
			if (e.type.indexOf("move") !== -1) return;
			var s = (e.type.indexOf("start") > -1 && e.type.indexOf("end") == -1);
			if (controls[touch.target.id] !== undefined) controls[touch.target.id] = s;
		}
	}
}

function handleInput(e){
	var s = e.type === "keydown";

	if (e.target.id === "canvas"){
		dragging(e.type, e.pageX, e.pageY);
	} else if (!changingKeys) {
		if(e.type.substring(0, 3) === "key"){
			var triggered = handleInput.keyMap[e.key || convertToKey(e.keyCode)];
		} else if (controls[e.target.id] !== undefined){
			e.preventDefault();
			var triggered = e.target.id;
		}
		if (triggered == "menu" && gameBlurred !== "m"){
			if (e.type === "keydown"){
				var box = document.getElementById("info-box");
				box.className = (box.className == "info-box hidden") ?  "info-box" : "info-box hidden";
			}
		} else if (triggered == "lobby" && gameBlurred !== "i"){
			if (e.type === "keydown"){
				var box = document.getElementById("multiplayer-box");
				box.className = (box.className == "multiplayer-box hidden") ?  "multiplayer-box" : "multiplayer-box hidden";
			}
		} else if (triggered != null && e.type.indexOf("mouse") !== 0 && gameBlurred === "") controls[triggered] = e.type === "keydown";
	}
	gameBlurred = document.getElementById("info-box").className === "info-box" ? "i" : document.getElementById("multiplayer-box").className === "multiplayer-box" ? "m" : "";	
	canvas.className = (gameBlurred === "") ? "" : "blurred";
}
handleInput.keyMap = {Tab: "lobby", Escape: "menu", Shift: "run", " ": "jump", ArrowLeft: "moveLeft", ArrowUp: "jetpack", ArrowRight: "moveRight", ArrowDown: "crouch", a: "moveLeft", w: "jetpack", d: "moveRight", s: "crouch"};


function dragging(ev, x, y){
	if (ev.indexOf("start") !== -1 || ev.indexOf("down") !== -1){
		game.dragX = x;
		game.dragY = y;
		game.dragStartX = x;
		game.dragStartY = y;
	} else if (ev.indexOf("end") !== -1 || ev.indexOf("up") !== -1){
		game.dragX = 0;
		game.dragY = 0;
		game.dragStartX = 0;
		game.dragStartY = 0;
	} else if (ev.indexOf("move") !== -1){
		game.dragX = game.dragStartX !== 0 ? x : 0;
		game.dragY = game.dragStartY !== 0 ? y : 0;
	}
}

document.getElementById("audio-icon").addEventListener("click", function(ev){
	if (ev.target.getAttribute("src") === "assets/images/controls/mute.svg") {
		ev.target.setAttribute("src", "assets/images/controls/unmute.svg");
		gain.gain.value = 0.5;
	} else {
		ev.target.setAttribute("src", "assets/images/controls/mute.svg");
		gain.gain.value = 0;
	}
});

function handleGamepad(){
	var gamepads = navigator.getGamepads(), g = gamepads[0];
	if (typeof(g) !== "undefined"){
		controls["jump"] = g.buttons[0].value;
		controls["run"] = g.buttons[1].value;
		controls["crouch"] = g.buttons[4].value;
		controls["jetpack"] = g.buttons[7].value;

		controls["moveLeft"] = 0;		
		controls["moveRight"] = 0;

		
		if (g.axes[0] < -0.2 || g.axes[0] > 0.2) controls["move" + ((g.axes[0] < 0) ? "Left" : "Right")] = Math.abs(g.axes[0]);


		if (g.axes[2] < -0.2 || g.axes[2] > 0.2) game.dragX = -canvas.width / 2 * g.axes[2];
		else game.dragX = 0;
		if ((g.axes[3] < -0.2 || g.axes[3] > 0.2)) game.dragY = -canvas.height / 2 * g.axes[3];
		else game.dragY = 0;
	}
}

var reverseKeyMap = {};
for (key in handleInput.keyMap) {
	var action = handleInput.keyMap[key];
	if(reverseKeyMap[action] === undefined) reverseKeyMap[action] = [];
	reverseKeyMap[action].push(key);
}

var settingsEl = document.getElementById("key-settings");
for (action in reverseKeyMap) {
var rowSize = 1;
	var rowEl = document.createElement("tr"),
		actionEl = document.createElement("td"),
		actionTxtEl = document.createTextNode(action),
		keyEl = document.createElement("td"),
		keyTxtEl = document.createTextNode(reverseKeyMap[action]);

	actionEl.appendChild(actionTxtEl);
	rowEl.appendChild(actionEl);

	var slice = reverseKeyMap[action];
	for (key in slice) {
		if (slice.length > rowSize) rowSize = slice.length;
		var keyEl = document.createElement("td"),
			keyTxtEl = document.createTextNode(slice[key]);
		keyEl.appendChild(keyTxtEl);
		rowEl.appendChild(keyEl);
	}

	settingsEl.appendChild(rowEl);
}
var keyCol = document.getElementById("key-col"),
	changingKeys = false;
keyCol.colSpan = rowSize;

settingsEl.addEventListener("click", function(e) {
	function handleChangeKey(e, target) {
		delete handleInput.keyMap[target.firstChild.data];
		var keyName = e.key || convertToKey(e.keyCode);
		handleInput.keyMap[keyName] = target.parentElement.firstElementChild.firstChild.data;
		target.firstChild.data = keyName;
	}
	if(e.target.previousElementSibling !== null && e.target.nodeName === "TD") {//not action collumn, not th
		var box = document.getElementById("info-box");
		document.addEventListener("keydown", function wrap(nE) {
			switch(nE.type) {
				case "keydown":
					changingKeys = true;
					document.removeEventListener("keydown", wrap);
					document.addEventListener("keyup", wrap);
					break;

				case "keyup":
					handleChangeKey(nE, e.target);
					document.removeEventListener("keyup", wrap);
					changingKeys = false;
			}
		});
	}
});

window.addEventListener("keydown", handleInput);
window.addEventListener("keyup", handleInput);
window.addEventListener("touchstart", handleInputMobile);
window.addEventListener("touchmove", handleInputMobile);
window.addEventListener("touchend", handleInputMobile);
window.addEventListener("mousedown", handleInput);
window.addEventListener("mousemove", handleInput);
window.addEventListener("mouseup", handleInput);

function switchInformation(obj){
	document.getElementById("donate").setAttribute("style", "display: " + ((obj.textContent === "Donate") ? "block" : "none"));
	document.getElementById("share").setAttribute("style", "display: " + ((obj.textContent === "Donate") ? "none" : "block"));
}

var chosenAppearance = "alienBlue";
[].forEach.call(document.querySelectorAll(".playerSelect"), function (element){
	element.addEventListener("mousedown", function(){
		chosenAppearance = this.id.replace("player", "alien");
	});
});

document.getElementById("button-1").addEventListener("click", function(){
	if (this.textContent == "Disconnect"){
		this.textContent = "Connect";
		closeSocket();
	} else {
		this.textContent = "Disconnect";
		openSocket();		
	}
});
document.getElementById("button-2").addEventListener("click", function(){
	if (this.textContent === "Leave Lobby")	leaveLobby();
	else refreshLobbies();
});
document.getElementById("button-3").addEventListener("click", newLobby);
document.getElementById("button-4").addEventListener("click", function(){
	player.name = chosenAppearance;
	player.playerName = document.getElementById("name").value;
	settingsChanged();
});
