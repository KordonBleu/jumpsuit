const defaultKeymap = {Tab: "lobby", Escape: "menu", Shift: "run", " ": "jump", ArrowLeft: "moveLeft", ArrowUp: "jetpack", ArrowRight: "moveRight", ArrowDown: "crouch", a: "moveLeft", w: "jetpack", d: "moveRight", s: "crouch"};
function sameObjects(a, b) {
	var aProps = Object.getOwnPropertyNames(a);
	var bProps = Object.getOwnPropertyNames(b);
	console.log(aProps);
	console.log(bProps);
	if (aProps.length != bProps.length) {
		return false;
	}
	for (var i = 0; i < aProps.length; i++) {
		var propName = aProps[i];
		if (a[propName] !== b[propName]) {
			return false;
		}
	}
	return true;
};
var isMobile = (navigator.userAgent.match(/Android/i)
	|| navigator.userAgent.match(/webOS/i)
	|| navigator.userAgent.match(/iPhone/i)
	|| navigator.userAgent.match(/iPad/i)
	|| navigator.userAgent.match(/iPod/i)
	|| navigator.userAgent.match(/BlackBerry/i)
	|| navigator.userAgent.match(/Windows Phone/i));


String.prototype.ucFirst = function (){
	//uppercasing the first letter
	return this.charAt(0).toUpperCase() + this.slice(1);
}
function changeTab (obj){
	var tab = obj.textContent;
	document.getElementById("donate").setAttribute("style", "display: " + ((tab == "Donate") ? "block" : "none"));
	document.getElementById("share").setAttribute("style", "display: " + ((tab == "Donate") ? "none" : "block"));	
}
function convertToKey(keyCode) {
	if (keyCode > 47 && keyCode < 58) return keyCode - 48;//numbers
	else if (keyCode > 95 && keyCode < 106) return keyCode - 96;//numpad
	else if (keyCode > 64 && keyCode < 91) return convertToKey.keyMapChar.charAt(keyCode - 65);//characters
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
	32: " ",
	37: "ArrowLeft",
	38: "ArrowUp",
	39: "ArrowRight",
	40: "ArrowDown"
}
function transformStyle(element, val){
	var vendors = ["WebkitTransform", "MozTransform", "OTransform", "transform"],
		correctVendor, obj;
	for (var i = 0; i < vendors.length; i++){
		if (vendors[i] in element.style){
			correctVendor = vendors[i];
			break;
		}
	}
	element.style["transform"] = val;
	console.log(correctVendor, val);
}

function handleInputMobile(e){
	for (var t = 0; t < e.changedTouches.length; t++){
		var touch = e.changedTouches[t];
		handleInputMobile.gesture(touch, e.type);
		if (touch.target.id === "canvas"){
			dragging(e.type, touch.pageX, touch.pageY);
		} else {		
			var s = (e.type.indexOf("start") !== -1 && e.type.indexOf("end") === -1);
			if (player.controls[touch.target.id] !== undefined) {
				e.preventDefault();
				if (touch.target.id === "moveLeft" || touch.target.id === "moveRight"){
					var value = handleInputMobile.transform(touch, e.type);
					player.controls["run"] = (-value >= 38) * 1;
				}
				if (e.type.indexOf("move") === -1) player.controls[touch.target.id] = s * 1;
				currentConnection.refreshControls(player.controls);
			}
		}
	}
}
handleInputMobile.gesture = function (touch, type){	
	var element = touch.target, range = new Vector(120, 60);
	if (type.indexOf("start") !== -1){
		var targetId = (element === document.body) ? "canvas" : element.id;
		if (element.parentNode.id === "multiplayer-box" || element.parentNode.parentNode.id === "multiplayer-box") targetId = "multiplayer-box";
		else if (element.parentNode.id === "info-box" || element.parentNode.parentNode.id === "info-box") targetId = "info-box";
		if (!(targetId === "multiplayer-box" || targetId === "info-box" || targetId === "canvas")) return false;
		this.currentGestures.target = targetId;
		this.currentGestures.start = new Point(touch.pageX, touch.pageY);		
	} else if (type.indexOf("end") !== -1){
		if (this.currentGestures.target === "info-box"){
			if (this.currentGestures.start.x - range.x > touch.pageX && this.currentGestures.start.y + range.y > touch.pageY && this.currentGestures.start.y - range.y < touch.pageY) {
				document.getElementById(this.currentGestures.target).classList.add("hidden");
			}
		} else if (this.currentGestures.target === "multiplayer-box"){
			if (this.currentGestures.start.x + range.x < touch.pageX && this.currentGestures.start.y + range.y > touch.pageY && this.currentGestures.start.y - range.y < touch.pageY) {
				document.getElementById(this.currentGestures.target).classList.add("hidden");
			}
		} else if (this.currentGestures.target === "canvas"){
			if (this.currentGestures.start.x <= range.x && this.currentGestures.start.x + range.x < touch.pageX && this.currentGestures.start.y + range.y > touch.pageY && this.currentGestures.start.y - range.y < touch.pageY) {
				document.getElementById("info-box").classList.remove("hidden");
			} else if (this.currentGestures.start.x >= window.innerWidth - range.x && this.currentGestures.start.x - range.x > touch.pageX && this.currentGestures.start.y + range.y > touch.pageY && this.currentGestures.start.y - range.y < touch.pageY) {
				document.getElementById("multiplayer-box").classList.remove("hidden");
			}
		}
	}
	return true;
}
handleInputMobile.currentGestures = {target: "", start: new Point(0, 0)};
handleInputMobile.transform = function (touch, type){
	var element = touch.target, ytransform;
	if (type.indexOf("start") !== -1){
		element.setAttribute("touchstart", touch.pageY);
		element.setAttribute("touchmove", touch.pageY);
	} else if (type.indexOf("move") !== -1){
		element.setAttribute("touchmove", touch.pageY);
	} else {
		element.setAttribute("touchstart", 0);
		element.setAttribute("touchmove", 0);
	}
	ytransform = -Math.max(0, Math.min(50, Math.floor(element.getAttribute("touchstart") - element.getAttribute("touchmove"))));
	transformStyle(element, "translateY(" + ytransform + "px)");
	return ytransform;
}

function handleInput(e){
	if (document.getElementById("dialog").className !== "hidden") return;
	var s = (e.type === "keydown") * 1,
		triggered,
		framesClosed = (document.getElementById("info-box").className.indexOf("hidden") !== -1 && document.getElementById("multiplayer-box").className.indexOf("hidden") !== -1),
		chatInUse = document.getElementById("chat-input") === document.activeElement;

	if (e.target.id === "canvas"){
		dragging(e.type, e.pageX, e.pageY);
	} else if (!changingKeys) {
		if(e.type.substring(0, 3) === "key"){
			triggered = handleInput.keyMap[e.key || convertToKey(e.keyCode)];
		} else if (player.controls[e.target.id] !== undefined){
			e.preventDefault();
			triggered = e.target.id;
		}
		if (triggered == "menu" || triggered == "lobby" && !chatInUse){
			e.preventDefault();
			if (s == 1){
				var box = document.getElementById((triggered == "menu") ? "info-box" : "multiplayer-box");
				if (box.className.indexOf("hidden") !== -1) box.classList.remove("hidden");
				else box.classList.add("hidden");
			}
		} else if (triggered == "chat"){
			e.preventDefault();
			if (s == 1) chatInUse = !chatInUse;
		} else if (typeof triggered !== "undefined" && e.type.indexOf("mouse") !== 0 && !chatInUse && framesClosed && document.activeElement !== document.getElementById("name")) {
			e.preventDefault();
			player.controls[triggered] = s;
			currentConnection.refreshControls(player.controls);
		}
	}
}
handleInput.keyMap = defaultKeymap;
handleInput.reverseKeyMap = {};
handleInput.updateReverseKeyMap = function(){
	handleInput.reverseKeyMap = {};
	for (key in handleInput.keyMap) {
		var action = handleInput.keyMap[key], index;
		if (handleInput.reverseKeyMap[action] === undefined) handleInput.reverseKeyMap[action] = [];
		if (handleInput.reverseKeyMap[action][0] !== undefined) index = 1;
		else index = 0;
		handleInput.reverseKeyMap[action][index] = key;
	}
}
handleInput.updateKeyMap = function(){
	handleInput.keyMap = {};
	for (action in handleInput.reverseKeyMap){
		var keys = handleInput.reverseKeyMap[action];
		for (key in keys) {
			if (keys[key] !== undefined || keys[key] !== null) handleInput.keyMap[keys[key]] = action;
		}
	}
}
handleInput.initKeymap = function(fromReversed){
	if (fromReversed) handleInput.updateKeyMap();
	else handleInput.updateReverseKeyMap();
	
	while (settingsEl.firstChild) {
		settingsEl.removeChild(settingsEl.firstChild);
	}
	var tableTitles = ["Actions", "Primary Keys", "Alternate Keys"], firstRow = document.createElement("tr");
	for (var i = 0; i < tableTitles; i++){
		var tableHead = document.createElement("th");
		tableHead.textContent = tableTitles[i];
		firstRow.appendChild(tableHead);
	}
	settingsEl.appendChild(firstRow);
	for (action in handleInput.reverseKeyMap) {
		var rowEl = document.createElement("tr"),
			actionEl = document.createElement("td"),
			keyEl;

		actionEl.textContent = action;
		rowEl.appendChild(actionEl);

		var slice = handleInput.reverseKeyMap[action];
		for (var i = 0; i != 2; i++){
			keyEl = document.createElement("td");
			if (typeof slice[i] === "undefined" || slice[i] == "") keyEl.textContent = " - ";
			else keyEl.textContent = slice[i].replace(" ", "Space").ucFirst();
			rowEl.appendChild(keyEl);
		}
		settingsEl.appendChild(rowEl);
	}
	document.getElementById("key-reset").disabled = sameObjects(defaultKeymap, handleInput.keyMap);
}
handleInput.loadKeySettings = function(){
	var presets = localStorage.getItem("settings.jumpsuit.keys");
	if (presets != null){
		try{
			handleInput.reverseKeyMap = JSON.parse(presets);
			handleInput.initKeymap(true);
		} catch (e) {
			handleInput.initKeymap(false);
		}
	}
}

function dragging (ev, x, y){
	if (ev.indexOf("start") !== -1 || ev.indexOf("down") !== -1){
		game.drag.x = x;
		game.drag.y = y;
		game.dragStart.x = x;
		game.dragStart.y = y;
	} else if (ev.indexOf("end") !== -1 || ev.indexOf("up") !== -1){
		game.drag.x = 0;
		game.drag.y = 0;
		game.dragStart.x = 0;
		game.dragStart.y = 0;
	} else if (ev.indexOf("move") !== -1){
		game.drag.x = game.dragStart.x !== 0 ? x : 0;
		game.drag.y = game.dragStart.y !== 0 ? y : 0;
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
if (localStorage.getItem("settings.jumpsuit.mute") === "true"){
	document.getElementById("audio-icon").setAttribute("src", "assets/images/controls/mute.svg");
	gain.gain.value = 0;
}


function handleGamepad(){
	var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
	if (this.usingGamepad == -1){
		for (var i = 0; i < gamepads.length; i++) {
			var gp = gamepads[i];
			if (gp) {
				onScreenMessage.show("Gamepad " + (gp.index + 1).toString() + " connected");
				this.usingGamepad = gp.index;
			}
		}
	} else {
		var g = gamepads[this.usingGamepad];
		if (typeof(g) !== "undefined"){
			player.controls["jump"] = g.buttons[0].value;
			player.controls["run"] = g.buttons[1].value;
			player.controls["crouch"] = g.buttons[4].value;
			player.controls["jetpack"] = g.buttons[7].value;

			player.controls["moveLeft"] = 0;
			player.controls["moveRight"] = 0;
			if (g.axes[0] < -0.2 || g.axes[0] > 0.2) player.controls["move" + ((g.axes[0] < 0) ? "Left" : "Right")] = Math.abs(g.axes[0]);
			if (g.axes[2] < -0.2 || g.axes[2] > 0.2) game.drag.x = -canvas.width / 2 * g.axes[2];
			else game.drag.x = 0;
			if ((g.axes[3] < -0.2 || g.axes[3] > 0.2)) game.drag.y = -canvas.height / 2 * g.axes[3];
			else game.drag.y = 0;
			currentConnection.refreshControls(player.controls);
		} else {		
			if (typeof this.usingGamepad !== "undefined") onScreenMessage.show("Gamepad " + (this.usingGamepad + 1).toString() + " disconnected");
			this.usingGamepad = -1;
		}
	}
}
var changingKeys = false,
	settingsEl = document.getElementById("key-settings"),	
	selectedRow = -1;

settingsEl.addEventListener("click", function(e) {
	function reselect(obj){
		document.removeEventListener("keydown", wrap);
		Array.prototype.forEach.call(settingsEl.childNodes, function (row){ row.classList.remove("selected") });		
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
			action = settingsEl.childNodes[selectedRow].firstChild.textContent,
			alreadyTaken = false;

		for (key in handleInput.keyMap){
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
	if (e.target.previousElementSibling !== null && e.target.nodeName === "TD") {//not action collumn, not th
		reselect(e.target.parentNode);
		document.addEventListener("keydown", wrap);
	}
});

document.getElementById("key-reset").addEventListener("click", function(){
	handleInput.keyMap = defaultKeymap;
	handleInput.updateReverseKeyMap();
	handleInput.initKeymap();
});

if (isMobile){
	document.getElementById("mobile-info").style["display"] = "initial";
	document.getElementById("key-info").style["display"] = "none";
	document.getElementById("key-settings").style["display"] = "none";
	document.getElementById("key-reset").style["display"] = "none";
} else handleInput.loadKeySettings()

window.addEventListener("touchstart", handleInputMobile);
window.addEventListener("touchmove", handleInputMobile);
window.addEventListener("touchend", handleInputMobile);
window.addEventListener("mousedown", handleInput);
window.addEventListener("mousemove", handleInput);
window.addEventListener("mouseup", handleInput);
window.addEventListener("keydown", handleInput);
window.addEventListener("keyup", handleInput);

document.getElementById("chat-input").addEventListener("focus", function(){
	document.getElementById("info-box").classList.add("hidden");
	document.getElementById("multiplayer-box").classList.add("hidden");
});
document.getElementById("chat-input").addEventListener("keydown", function(e){
	if (e.keyCode == 13){
		if (!currentConnection.alive()) return;
		currentConnection.sendChat(this.value);
		this.value = "";
	} else if (e.keyCode == 9){
		e.preventDefault();
		
		if (!this.playerSelection){
			this.playerSelection = true;
			this.cursor = this.selectionStart;
			var text = (this.cursor === 0) ? "" : this.value.substr(0, this.cursor);
			this.search = text.substr((text.lastIndexOf(" ") === -1) ? 0 : text.lastIndexOf(" ") + 1);

			this.searchIndex = 0;		
			this.textParts = [this.value.substr(0, this.cursor - this.search.length), this.value.substr(this.cursor)];
		}
		
		var filteredPlayerList = (player.name.indexOf(this.search) === 0) ? [player.name] : [];
		for (_pid in otherPlayers){
			if (otherPlayers[_pid].name.indexOf(this.search) === 0) filteredPlayerList.push(otherPlayers[_pid].name);
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

var chosenAppearance = "alienBlue";
[].forEach.call(document.querySelectorAll(".playerSelect"), function (element){
	element.addEventListener("mousedown", function(){
		player.appearance = this.id.replace("player", "alien");
		document.getElementById("badge").setAttribute("src", "assets/images/" + player.appearance + "_badge.svg");
		document.getElementById("appearance-box").classList.add("hidden");
		settingsChanged();
	});
});
document.getElementById("disconnect").addEventListener("click", function(){
	if (this.textContent == "Disconnect"){
		this.textContent = "Connect";
		closeSocket();
	} else {
		this.textContent = "Disconnect";
		openSocket();		
	}
});
document.getElementById("refresh-or-leave").addEventListener("click", function(){
	if (this.textContent === "Leave Lobby")	leaveLobby();
	else refreshLobbies();
});
document.getElementById("new-lobby").addEventListener("click", function(){
	dialog.show(newLobby);
});
document.getElementById("name").addEventListener("keydown", function(e) {
	if (e.key === "Enter" || convertToKey(e.keyCode) === "Enter") {
		player.name = this.value;
		e.target.blur();
		settingsChanged();
	}
});
document.getElementById("badge").addEventListener("click", function() {
	var apEl = document.getElementById("appearance-box");
	if (apEl.className === "hidden") apEl.removeAttribute("class");
	else apEl.className = "hidden";
});
window.onbeforeunload = function(){	
	localStorage.setItem("settings.jumpsuit.name", player.name);
	localStorage.setItem("settings.jumpsuit.keys", JSON.stringify(handleInput.reverseKeyMap));
	localStorage.setItem("settings.jumpsuit.mute", document.getElementById("audio-icon").getAttribute("src") === "assets/images/controls/mute.svg")
}