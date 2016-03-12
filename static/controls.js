"use strict";

const defaultKeymap = {Shift: "run", " ": "jump", ArrowLeft: "moveLeft", ArrowUp: "jetpack", ArrowRight: "moveRight", ArrowDown: "crouch", a: "moveLeft", w: "jetpack", d: "moveRight", s: "crouch", t: "chat"};
function sameObjects(a, b) {
	if (Object.getOwnPropertyNames(a).length !== Object.getOwnPropertyNames(b).length) {
		return false;
	}
	for (let propName in a) {
		//hasOwnProperty is here in case `a[propName]`'s value is `undefined`
		if (!b.hasOwnProperty(propName) || a[propName] !== b[propName]) return false;
	}
	return true;
}
String.prototype.ucFirst = function () {
	//uppercasing the first letter
	return this.charAt(0).toUpperCase() + this.slice(1);
};
function convertToKey(keyCode) {//polyfill for Chrome
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

function handleInputMobile(e) {
	function transform(touch, type) {
		var element = touch.target;
		if (type === "touchstart") {
			element.dataset.touchstart = touch.pageY;
			element.dataset.touchmove = touch.pageY;
		} else if (type === "touchmove") {
			element.dataset.touchmove = touch.pageY;
		} else {//touchend
			element.dataset.touchstart = 0;
			element.dataset.touchmove = 0;
		}
		var yTransform = -Math.max(0, Math.min(50, Math.floor(element.dataset.touchstart - element.dataset.touchmove)));
		element.style.transform = "translateY(" + yTransform + "px)";
		return yTransform;
	};

	Array.prototype.forEach.call(e.changedTouches, function(touch) {
		var s = e.type !== "touchstart" && e.type === "touchend";
		if (players[ownIdx].controls[touch.target.id] !== undefined) {
			e.preventDefault();
			if (touch.target.id === "moveLeft" || touch.target.id === "moveRight") {
				var value = transform(touch, e.type);
				players[ownIdx].controls["run"] = (-value >= 38) * 1;
			}
			if (e.type !== "touchmove") players[ownIdx].controls[touch.target.id] = s * 1;
			currentConnection.refreshControls(players[ownIdx].controls);
		}
	});
}

/* Keyboard */
function handleInput(e) {
	function objsInvisible(elArr) {
		return elArr.every(function(element) {
			return element.classList.contains("hidden");
		});
	}

	if (e.key === "Tab" || convertToKey(e.keyCode) === "Tab") e.preventDefault();

	var s = (e.type === "keydown") * 1,
		chatInUse = chatInput === document.activeElement;

	if (!changingKeys && !chatInUse && objsInvisible([infoBox, settingsBox]) && players[ownIdx] !== undefined) {
		let triggered = handleInput.keyMap[e.key || convertToKey(e.keyCode)];
		if (players[ownIdx].controls[triggered] !== undefined) {
			e.preventDefault();
			players[ownIdx].controls[triggered] = s;
			currentConnection.refreshControls(players[ownIdx].controls);
		} else if (triggered === "chat" && s === 1) chatInput.focus();
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
window.addEventListener("keydown", handleInput);
window.addEventListener("keyup", handleInput);

/* Drag */
function dragStart(e) {
	game.drag.x = e.pageX;
	game.drag.y = e.pageY;
	game.dragStart.x = e.pageX;
	game.dragStart.y = e.pageY;
}
function dragEnd() {
	//if (Math.min(Math.abs(game.dragStart.x - game.drag.x), Math.abs(game.drag.x - game.dragStart.x)) < 20 && Math.min(Math.abs(game.dragStart.y - game.drag.y), Math.abs(game.drag.y - game.dragStart.y)) < 20) console.log("FIYYA!");
	game.drag.x = 0;
	game.drag.y = 0;
	game.dragStart.x = 0;
	game.dragStart.y = 0;
}
function dragMove(e) {
	game.drag.x = game.dragStart.x !== 0 ? e.pageX : 0;
	game.drag.y = game.dragStart.y !== 0 ? e.pageY : 0;
}
function dragHandler(e) {
	if (e.buttons & 4) {//middle-click enabled (and possibly other clicks too)
		dragMove(e);
	}
}
canvas.addEventListener("mousedown", function(e) {
	switch (e.button) {
		case 0://left-click
			currentConnection.sendActionOne(Math.atan2(e.clientX - canvas.clientWidth/2, canvas.clientHeight/2 - e.clientY));
			break;
		case 1://middle-click
			dragStart(e);
			canvas.addEventListener("mousemove", dragHandler);
			break;
		case 2://right-click
			currentConnection.sendActionTwo(Math.atan2(e.clientX - canvas.clientWidth/2, canvas.clientHeight/2 - e.clientY));
	}
});
canvas.addEventListener("mouseup", function(e) {
	if (e.button === 1) {
		dragEnd(e);
		canvas.removeEventListener("mousemove", dragHandler);
	}
});

canvas.addEventListener("touchstart", dragStart);//TODO: action 1 on simple tap on mobile
canvas.addEventListener("touchmove", dragMove);
canvas.addEventListener("touchend", dragEnd);

document.getElementById("controls").addEventListener("dragstart", function(e) {
	e.preventDefault();//prevent unhandled dragging
});
document.addEventListener("contextmenu", function(e) {
	e.preventDefault();//prevent right-click context menu
	//unfortunately it also disables the context menu key
});


/* Gamepads */
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

/* Zoom */
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
