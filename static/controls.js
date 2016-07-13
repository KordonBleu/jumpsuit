"use strict";

const defaultKeymap = {ShiftLeft: "run", Space: "jump", ArrowLeft: "moveLeft", ArrowUp: "jetpack", ArrowRight: "moveRight", ArrowDown: "crouch", KeyA: "moveLeft", KeyW: "jetpack", KeyD: "moveRight", KeyS: "crouch", KeyT: "chat", Digit1: "changeWeapon", Digit2: "changeWeapon"};
function sameObjects(a, b) {
	if (Object.getOwnPropertyNames(a).length !== Object.getOwnPropertyNames(b).length) {
		return false;
	}
	for (var propName in a) {
		//hasOwnProperty is here in case `a[propName]`'s value is `undefined`
		if (!b.hasOwnProperty(propName) || a[propName] !== b[propName]) return false;
	}
	return true;
}
String.prototype.ucFirst = function () {
	//uppercasing the first letter
	return this.charAt(0).toUpperCase() + this.slice(1);
};
function objsInvisible(elArr) {
	return elArr.every(function(element) {
		return element.classList.contains("hidden");
	});
}

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
		console.log(e);
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
	if (e.code === "Tab") e.preventDefault();

	var s = (e.type === "keydown") * 1,
		chatInUse = chatInput === document.activeElement;
	if (!chatInUse && objsInvisible([infoBox, settingsBox]) && players[ownIdx] !== undefined) {
		var triggered = handleInput.keyMap[e.code];
		if (players[ownIdx].controls[triggered] !== undefined) {
			e.preventDefault();
			players[ownIdx].controls[triggered] = s;
			currentConnection.refreshControls(players[ownIdx].controls);
		} else if (triggered === "chat" && s === 1) window.setTimeout(function() {//prevent the letter corresponding to
			chatInput.focus();//the "chat" control (most likelly "t")
		}, 0);//from being written in the chat
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
			else keyEl.textContent = slice[i]; //fixes a bug: if slice[i] is a numeric input it has no replace function -> always convert it to string
			rowEl.appendChild(keyEl);
		}
		keySettingsElement.appendChild(rowEl);
	}

	document.getElementById("key-reset").disabled = sameObjects(defaultKeymap, handleInput.keyMap);
	settings.keymap = JSON.stringify(handleInput.reverseKeyMap);
};
handleInput.loadKeySettings = function() {
	if (settings.keymap !== "") handleInput.reverseKeyMap = JSON.parse(settings.keymap);
	else handleInput.keyMap = defaultKeymap;
	handleInput.initKeymap(settings.keymap !== "");
};

/* Drag & Mouse */
function dragStart(e) {
	game.drag.x = e.pageX;
	game.drag.y = e.pageY;
	game.dragStart.x = e.pageX;
	game.dragStart.y = e.pageY;
}
function dragEnd() {
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
	if (e.button === 0) {
		if (ownIdx in players && currentConnection.alive()) {
			players[ownIdx].controls["shoot"] = 1;
			currentConnection.refreshControls(players[ownIdx].controls);
		}
	} else if (e.button === 1) {
		dragStart(e);
		canvas.addEventListener("mousemove", dragHandler);
	}
});
canvas.addEventListener("mouseup", function(e) {
	if (e.button === 1) {
		dragEnd(e);
		canvas.removeEventListener("mousemove", dragHandler);
	} else if (e.button === 0) {
		if (ownIdx in players) {
			players[ownIdx].controls["shoot"] = 0;
			currentConnection.refreshControls(players[ownIdx].controls);
		}
	}
});
canvas.addEventListener("touchstart", dragStart);//TODO: action 1 on simple tap on mobile
//canvas.addEventListener("touchmove", dragMove);
canvas.addEventListener("touchend", dragEnd);
document.getElementById("controls").addEventListener("dragstart", function(e) {
	e.preventDefault();//prevent unhandled dragging
});
document.addEventListener("contextmenu", function(e) {
	//e.preventDefault();//prevent right-click context menu
	//unfortunately it also disables the context menu key
});
var mousePosX = 0, mousePosY = 0;
document.addEventListener("mousemove", function(e) {
	game.mousePos.x = e.clientX;
	game.mousePos.y = e.clientY;
	game.mousePos.angle = (2.5*Math.PI + Math.atan2(game.mousePos.y - canvas.height*0.5, game.mousePos.x - canvas.width*0.5)) % (2*Math.PI);
});
setInterval(function() {
	if (currentConnection !== undefined) currentConnection.sendMousePos(game.mousePos.angle);
}, 80);


/* Gamepads */
var usingGamepad = -1;
if ("ongamepadconnected" in window || "ongamepaddisconnected" in window) {
	//no timed query
	window.addEventListener("gamepadconnected", function(e) {
		usingGamepad = e.gamepad.index;
		message.showMessage("Gamepad connected", "Gamepad #" + usingGamepad + " is set as controlling device");
	});
	window.addEventListener("gamepaddisconnected", function(e) {
		message.showMessage("Gamepad disconnected", "Gamepad #" + usingGamepad + " was disconnected");
		usingGamepad = -1
	});
} else {
	setInterval(function() {
		var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
		if (typeof gamepads[usingGamepad] === "undefined") {
			if (usingGamepad !== -1) message.showMessage("Gamepad disconnected", "Gamepad #" + usingGamepad + " was disconnected");
			usingGamepad = -1;
		}
		if (usingGamepad == -1) {
			for (var i = 0; i < gamepads.length; i++) {
				var gp = gamepads[i];
				if (gp) {
					usingGamepad = gp.index;
					message.showMessage("Gamepad connected", "Gamepad #" + usingGamepad + " is set as controlling device");
				}
			}
		}
	}, 500);
}
setInterval(function() {
	if (usingGamepad === -1) return;
	var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
	var g = gamepads[usingGamepad];
	if (typeof(g) !== "undefined" && players.length !== 0 && ownIdx in players){
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
	}
}, 50);

/* Zoom */
document.addEventListener("wheel", function(e) {
	var chatInUse = chatInput === document.activeElement;
	if (!chatInUse && objsInvisible([infoBox, settingsBox])) {
		var z = Math.abs(e.deltaY) === e.deltaY ? 0.5 : 2; // 1/2 or 2/1
		windowBox.zoomFactor = Math.max(0.25, Math.min(4, windowBox.zoomFactor * z));
		resizeCanvas();
	}
});

if (!isMobile) handleInput.loadKeySettings();
