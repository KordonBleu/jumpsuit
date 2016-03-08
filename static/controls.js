"use strict";

const defaultKeymap = {Shift: "run", " ": "jump", ArrowLeft: "moveLeft", ArrowUp: "jetpack", ArrowRight: "moveRight", ArrowDown: "crouch", a: "moveLeft", w: "jetpack", d: "moveRight", s: "crouch", t: "chat"};
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
function objInvisible(obj) {
	if (typeof(obj.length) === "undefined") return (obj.className.indexOf("hidden") !== -1);
	for (var i = 0; i < obj.length; i++){
		if (obj[i].className.indexOf("hidden") === -1) return false;
	}
	return true;
}

String.prototype.ucFirst = function () {
	//uppercasing the first letter
	return this.charAt(0).toUpperCase() + this.slice(1);
};
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
function transformStyle(element, val) {
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

function handleInputMobile(e) {
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
handleInputMobile.transform = function (touch, type) {
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
		} else if (players[ownIdx] !== undefined && players[ownIdx].controls[e.target.id] !== undefined) {
			e.preventDefault();
			triggered = e.target.id;
		}
		if (typeof triggered !== "undefined" && e.type.indexOf("mouse") !== 0 && !chatInUse && objInvisible([infoBox, settingsBox]) && players[ownIdx] !== undefined) {
			//oh boy, this statement is fucked up :D
			e.preventDefault();
			if (players[ownIdx].controls[triggered] !== undefined){
				players[ownIdx].controls[triggered] = s;
				currentConnection.refreshControls(players[ownIdx].controls);
			} else if (triggered === "chat" && s === 1) chatInput.focus();
		}
	}
}
handleInput.keyMap = defaultKeymap;
handleInput.reverseKeyMap = {};
handleInput.updateReverseKeyMap = function() {
	handleInput.reverseKeyMap = {};
	for (var key in handleInput.keyMap) {
		var action = handleInput.keyMap[key], index;
		if (handleInput.reverseKeyMap[action] === undefined) handleInput.reverseKeyMap[action] = [];
		if (handleInput.reverseKeyMap[action][0] !== undefined) index = 1;
		else index = 0;
		handleInput.reverseKeyMap[action][index] = key;
	}
};
handleInput.updateKeyMap = function() {
	handleInput.keyMap = {};
	for (var action in handleInput.reverseKeyMap){
		var keys = handleInput.reverseKeyMap[action];
		for (var key in keys) {
			if (keys[key] !== undefined || keys[key] !== null) handleInput.keyMap[keys[key]] = action;
		}
	}
};
handleInput.initKeymap = function(fromReversed) {
	if (fromReversed) handleInput.updateKeyMap();
	else handleInput.updateReverseKeyMap();

	while (keySettingsElement.firstChild) {
		keySettingsElement.removeChild(keySettingsElement.firstChild);
	}
	var tableTitles = ["Actions", "Primary Keys", "Alternate Keys"], firstRow = document.createElement("tr");
	for (var i = 0; i < tableTitles; i++){
		var tableHead = document.createElement("th");
		tableHead.textContent = tableTitles[i];
		firstRow.appendChild(tableHead);
	}
	keySettingsElement.appendChild(firstRow);
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
		keySettingsElement.appendChild(rowEl);
	}
	document.getElementById("key-reset").disabled = sameObjects(defaultKeymap, handleInput.keyMap);
};
handleInput.loadKeySettings = function() {
	var presets = localStorage.getItem("settings.keys");
	if (presets !== null) handleInput.reverseKeyMap = JSON.parse(presets);
	else handleInput.keyMap = defaultKeymap;
	handleInput.initKeymap(presets !== null);
};

function dragging(ev, x, y) {
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

var usingGamepad;
function handleGamepad() {
	var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
	if (usingGamepad == -1){
		for (var i = 0; i < gamepads.length; i++) {
			var gp = gamepads[i];
			if (gp) {
				//onScreenMessage.show("Gamepad " + (gp.index + 1).toString() + " connected");
				usingGamepad = gp.index;
			}
		}
	} else {
		var g = gamepads[usingGamepad];
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
			//if (typeof usingGamepad !== "undefined") onScreenMessage.show("Gamepad " + (usingGamepad + 1).toString() + " disconnected");
			usingGamepad = -1;
		}
	}
}

document.addEventListener("wheel", function(e) {
	windowBox.zoomFactor *= 1 - e.deltaY/10;
	resizeCanvas();
});

if (!matchMedia("(pointer: coarse)").matches) {//returns false if has a mouse AND a touchscreen
	//only supported by webkit as of today, the whole statement returns true in other browsers
	handleInput.loadKeySettings();
}
window.addEventListener("touchstart", handleInputMobile);
window.addEventListener("touchmove", handleInputMobile);
window.addEventListener("touchend", handleInputMobile);
window.addEventListener("mousedown", handleInput);
window.addEventListener("mousemove", handleInput);
window.addEventListener("mouseup", handleInput);
window.addEventListener("keydown", handleInput);
window.addEventListener("keyup", handleInput);
