const defaultKeymap = {Escape: "menu", Shift: "run", " ": "jump", ArrowLeft: "moveLeft", ArrowUp: "jetpack", ArrowRight: "moveRight", ArrowDown: "crouch", a: "moveLeft", w: "jetpack", d: "moveRight", s: "crouch"};
function sameObjects(a, b) {
	var aProps = Object.getOwnPropertyNames(a);
	var bProps = Object.getOwnPropertyNames(b);
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
}
function objInvisible(obj){
	if (typeof(obj.length) === "undefined") return (obj.className.indexOf("hidden") !== -1);
	for (var i = 0; i < obj.length; i++){
		if (obj[i].className.indexOf("hidden") === -1) return false;
	}
	return true;
}
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
};
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
};
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
		if (touch.target.id === "canvas"){
			dragging(e.type, touch.pageX, touch.pageY);
		} else {
			var s = (e.type.indexOf("start") !== -1 && e.type.indexOf("end") === -1);
			if (players[ownIdx].controls[touch.target.id] !== undefined) {
				e.preventDefault();
				if (touch.target.id === "moveLeft" || touch.target.id === "moveRight"){
					var value = handleInputMobile.transform(touch, e.type);
					players[ownIdx].controls["run"] = (-value >= 38) * 1;
				}
				if (e.type.indexOf("move") === -1) players[ownIdx].controls[touch.target.id] = s * 1;
				currentConnection.refreshControls(players[ownIdx].controls);
			}
		}
	}
}
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
};

function handleInput(e) {
	var s = (e.type === "keydown") * 1,
		triggered,
		chatInUse = chatInput === document.activeElement;

	if (e.target.id === "canvas") {
		dragging(e.type, e.pageX, e.pageY);
	} else if (!changingKeys) {
		if(e.type.substring(0, 3) === "key"){
			triggered = handleInput.keyMap[e.key || convertToKey(e.keyCode)];
			if (e.key === "Tab" || convertToKey(e.keyCode) === "Tab") e.preventDefault();
		} else if (players[ownIdx].controls[e.target.id] !== undefined) {
			e.preventDefault();
			triggered = e.target.id;
		}
		if (triggered === "menu" && !chatInUse && objInvisible(dialogElement)) {
			if (s == 1) menuBox.classList.toggle("hidden");
		} else if (typeof triggered !== "undefined" && e.type.indexOf("mouse") !== 0 && !chatInUse && objInvisible([menuBox, dialogElement])) {
			e.preventDefault();
			players[ownIdx].controls[triggered] = s;
			currentConnection.refreshControls(players[ownIdx].controls);
		}
	}
}
handleInput.keyMap = defaultKeymap;
handleInput.reverseKeyMap = {};
handleInput.updateReverseKeyMap = function(){
	handleInput.reverseKeyMap = {};
	for (var key in handleInput.keyMap) {
		var action = handleInput.keyMap[key], index;
		if (handleInput.reverseKeyMap[action] === undefined) handleInput.reverseKeyMap[action] = [];
		if (handleInput.reverseKeyMap[action][0] !== undefined) index = 1;
		else index = 0;
		handleInput.reverseKeyMap[action][index] = key;
	}
};
handleInput.updateKeyMap = function(){
	handleInput.keyMap = {};
	for (var action in handleInput.reverseKeyMap){
		var keys = handleInput.reverseKeyMap[action];
		for (var key in keys) {
			if (keys[key] !== undefined || keys[key] !== null) handleInput.keyMap[keys[key]] = action;
		}
	}
};
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
	for (var action in handleInput.reverseKeyMap) {
		var rowEl = document.createElement("tr"),
			actionEl = document.createElement("td"),
			keyEl;

		actionEl.textContent = action;
		rowEl.appendChild(actionEl);

		var slice = handleInput.reverseKeyMap[action];
		for (var i = 0; i != 2; i++){
			keyEl = document.createElement("td");
			if (typeof slice[i] === "undefined" || slice[i] === "") keyEl.textContent = " - ";
			else keyEl.textContent = slice[i].toString().replace(" ", "Space").ucFirst(); //fixes a bug: if slice[i] is a numeric input it has no replace function -> always convert it to string
			rowEl.appendChild(keyEl);
		}
		settingsEl.appendChild(rowEl);
	}
	document.getElementById("key-reset").disabled = sameObjects(defaultKeymap, handleInput.keyMap);
};
handleInput.loadKeySettings = function(){
	var presets = localStorage.getItem("settings.keys");
	try{
		handleInput.reverseKeyMap = JSON.parse(presets);
		handleInput.initKeymap(true);
	} catch (e) {
		handleInput.initKeymap(false);
	}
};

function dragging(ev, x, y){
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

document.getElementById("music-volume").addEventListener("input", function(ev) {
	musicGain.gain.value = ev.target.value/100;
});
document.getElementById("effects-volume").addEventListener("input", function(ev) {
	soundEffectGain.gain.value = ev.target.value/100;
});
var volMusic = localStorage.getItem("settings.volume.music"),
	volEffects = localStorage.getItem("settings.volume.effects");
if (volMusic !== null && volEffects !== null) {
	document.getElementById("music-volume").value = volMusic;
	document.getElementById("effects-volume").value = volEffects;
	musicGain.gain.value = volMusic/100;
	soundEffectGain.gain.value = volEffects/100;
}

function handleGamepad(){
	if (isMobile) return;
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
			players[ownIdx].controls["jump"] = g.buttons[0].value;
			players[ownIdx].controls["run"] = g.buttons[1].value;
			players[ownIdx].controls["crouch"] = g.buttons[4].value;
			players[ownIdx].controls["jetpack"] = g.buttons[7].value;

			players[ownIdx].controls["moveLeft"] = 0;
			players[ownIdx].controls["moveRight"] = 0;
			if (g.axes[0] < -0.2 || g.axes[0] > 0.2) players[ownIdx].controls["move" + ((g.axes[0] < 0) ? "Left" : "Right")] = Math.abs(g.axes[0]);
			if (g.axes[2] < -0.2 || g.axes[2] > 0.2) game.drag.x = -canvas.width / 2 * g.axes[2];
			else game.drag.x = 0;
			if ((g.axes[3] < -0.2 || g.axes[3] > 0.2)) game.drag.y = -canvas.height / 2 * g.axes[3];
			else game.drag.y = 0;
			currentConnection.refreshControls(players[ownIdx].controls);
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
		Array.prototype.forEach.call(settingsEl.childNodes, function (row){ row.classList.remove("selected"); });
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

		for (var key in handleInput.keyMap){
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

document.getElementById("key-reset").addEventListener("click", function(){
	handleInput.keyMap = defaultKeymap;
	handleInput.updateReverseKeyMap();
	handleInput.initKeymap();
});

if (matchMedia("(pointer: coarse)").matches) {//returns false if has a mouse AND a touchscreen
	//only supported by webkit as of today, returns false in other browsers
	document.getElementById("mobile-info").style["display"] = "initial";
	document.getElementById("key-info").style["display"] = "none";
	document.getElementById("key-settings").style["display"] = "none";
	document.getElementById("key-reset").style["display"] = "none";
} else handleInput.loadKeySettings();

window.addEventListener("touchstart", handleInputMobile);
window.addEventListener("touchmove", handleInputMobile);
window.addEventListener("touchend", handleInputMobile);
window.addEventListener("mousedown", handleInput);
window.addEventListener("mousemove", handleInput);
window.addEventListener("mouseup", handleInput);
window.addEventListener("keydown", handleInput);
window.addEventListener("keyup", handleInput);

chatInput.addEventListener("keydown", function(e){
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

[].forEach.call(document.querySelectorAll(".playerSelect"), function (element){
	element.addEventListener("mousedown", function(){
		players[ownIdx].appearance = this.id.replace("player", "alien");
		appearanceBox.classList.add("hidden");
		settingsChanged();
	});
});
[].forEach.call(document.querySelectorAll(".menu-tabs"), function (element){
	element.addEventListener("click", function(){
		[].forEach.call(document.querySelectorAll(".menu-tabs"), function (obj){ obj.disabled = false; });
		this.disabled = true;
		var tabs = {"Information": "tabInfo", "Connection": "tabServer", "Settings": "tabSettings"};
		for (var i in tabs){
			if (this.textContent === i) document.getElementById(tabs[i]).classList.remove("hidden");
			else document.getElementById(tabs[i]).classList.add("hidden");
		}
	});
});
disconnectElement.addEventListener("click", function(){
	if (this.textContent == "Disconnect"){
		this.textContent = "Connect";
		closeSocket();
	} else {
		this.textContent = "Disconnect";
		openSocket();
	}
});
refreshOrLeaveElement.addEventListener("click", function(){
	if (this.textContent === "Leave Lobby") {
		leaveLobby();
		history.pushState(null, "Main menu", "/");
	}
	else refreshLobbies();
});
newLobbyElement.addEventListener("click", function(){
	dialog.show(newLobby);
});
nameElement.addEventListener("keydown", function(e) {
	if (e.key === "Enter" || convertToKey(e.keyCode) === "Enter") {
		localStorage.setItem("settings.name", this.value);
		e.target.blur();
		settingsChanged();
	}
});
menuCloseElement.addEventListener("click", function(){
	menuBox.classList.add("hidden");
});
document.getElementById("option-fullscreen").addEventListener("change", function(){
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
window.onbeforeunload = function() {
	//localStorage.setItem("settings.name", players[ownIdx].name);
	localStorage.setItem("settings.keys", JSON.stringify(handleInput.reverseKeyMap));
	localStorage.setItem("settings.volume.music", document.getElementById("music-volume").value);
	localStorage.setItem("settings.volume.effects", document.getElementById("effects-volume").value);
};

