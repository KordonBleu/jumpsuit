import settings from './settings.js';
import * as ui from './ui.js';
import * as wsClt from './websocket_client.js';
import * as draw from './draw.js';

export const isMobile = (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)
	|| navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i));

export const defaultKeymap = {ShiftLeft: 'run', Space: 'jump', ArrowLeft: 'moveLeft', ArrowUp: 'jetpack', ArrowRight: 'moveRight', ArrowDown: 'crouch', KeyA: 'moveLeft', KeyW: 'jetpack', KeyD: 'moveRight', KeyS: 'crouch', KeyT: 'chat', Digit1: 'changeWeapon', Digit2: 'changeWeapon'};
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

export function handleInputMobile(e) {
	function transform(touch, type) {
		let element = touch.target;
		if (type === 'touchstart') {
			element.dataset.touchstart = touch.pageY;
			element.dataset.touchmove = touch.pageY;
		} else if (type === 'touchmove') {
			element.dataset.touchmove = touch.pageY;
		} else {//touchend
			element.dataset.touchstart = 0;
			element.dataset.touchmove = 0;
		}
		let yTransform = -Math.max(0, Math.min(50, Math.floor(element.dataset.touchstart - element.dataset.touchmove)));
		element.style.transform = 'translateY(' + yTransform + 'px)';
		return yTransform;
	}

	for (let touch of e.changedTouches) {
		let s = e.type !== 'touchstart' && e.type === 'touchend';
		if (players[ownIdx].controls[touch.target.id] !== undefined) {
			e.preventDefault();
			if (touch.target.id === 'moveLeft' || touch.target.id === 'moveRight') {
				let value = transform(touch, e.type);
				players[ownIdx].controls['run'] = (-value >= 38) * 1;
			}
			if (e.type !== 'touchmove') players[ownIdx].controls[touch.target.id] = s * 1;
			wsClt.currentConnection.refreshControls(players[ownIdx].controls);
		}
	}
}


/* Keyboard */
export function handleInput(e) {
	if (e.code === 'Tab') e.preventDefault();

	let s = (e.type === 'keydown') * 1;

	if (!ui.chatInUse() && ui.noModalOpen() && players[ownIdx] !== undefined) {
		let triggered = handleInput.keyMap[e.code];

		if (players[ownIdx].controls[triggered] !== undefined) {
			e.preventDefault();
			let controlElement = document.getElementById(triggered);
			if (controlElement !== null) controlElement.style['opacity'] = s * 0.7 + 0.3;
			players[ownIdx].controls[triggered] = s;
			wsClt.currentConnection.refreshControls(players[ownIdx].controls);
		} else if (triggered === 'chat' && s === 1) window.setTimeout(function() {//prevent the letter corresponding to
			ui.focusChat();//the 'chat' control (most likelly 't')
		}, 0);//from being written in the chat
	}
}
handleInput.keyMap = defaultKeymap;
handleInput.reverseKeyMap = {};
handleInput.updateReverseKeyMap = function() {
	handleInput.reverseKeyMap = {};
	for (let key in handleInput.keyMap) {
		let action = handleInput.keyMap[key], index;
		if (handleInput.reverseKeyMap[action] === undefined) handleInput.reverseKeyMap[action] = [];
		if (handleInput.reverseKeyMap[action][0] !== undefined) index = 1;
		else index = 0;
		handleInput.reverseKeyMap[action][index] = key;
	}
};
handleInput.updateKeyMap = function() {
	handleInput.keyMap = {};
	for (let action in handleInput.reverseKeyMap){
		let keys = handleInput.reverseKeyMap[action];
		for (let key in keys) {
			if (keys[key] !== undefined || keys[key] !== null) handleInput.keyMap[keys[key]] = action;
		}
	}

};
handleInput.initKeymap = function(fromReversed) {
	if (fromReversed) handleInput.updateKeyMap();
	else handleInput.updateReverseKeyMap();

	let keySettingsElement = document.getElementById('key-settings');

	while (keySettingsElement.firstChild) {
		keySettingsElement.removeChild(keySettingsElement.firstChild);
	}
	let tableTitles = ['Actions', 'Primary Keys', 'Alternate Keys'], firstRow = document.createElement('tr');
	for (let i = 0; i < tableTitles; i++){
		let tableHead = document.createElement('th');
		tableHead.textContent = tableTitles[i];
		firstRow.appendChild(tableHead);
	}
	keySettingsElement.appendChild(firstRow);
	for (let action in handleInput.reverseKeyMap) {
		let rowEl = document.createElement('tr'),
			actionEl = document.createElement('td'),
			keyEl;

		actionEl.textContent = action;
		rowEl.appendChild(actionEl);

		let slice = handleInput.reverseKeyMap[action];
		for (let i = 0; i != 2; i++) {
			keyEl = document.createElement('td');
			if (typeof slice[i] === 'undefined' || slice[i] === '') keyEl.textContent = ' - ';
			else keyEl.textContent = slice[i]; //fixes a bug: if slice[i] is a numeric input it has no replace function -> always convert it to string
			rowEl.appendChild(keyEl);
		}
		keySettingsElement.appendChild(rowEl);
	}

	document.getElementById('key-reset').disabled = sameObjects(defaultKeymap, handleInput.keyMap);
	settings.keymap = JSON.stringify(handleInput.reverseKeyMap);
};
handleInput.loadKeySettings = function() {
	if (settings.keymap !== '') handleInput.reverseKeyMap = JSON.parse(settings.keymap);
	else handleInput.keyMap = defaultKeymap;
	handleInput.initKeymap(settings.keymap !== '');
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
canvas.addEventListener('mousedown', function(e) {
	if (e.button === 0) {
		if (ownIdx in players && wsClt.currentConnection.alive()) {
			players[ownIdx].controls['shoot'] = 1;
			wsClt.currentConnection.refreshControls(players[ownIdx].controls);
		}
	} else if (e.button === 1) {
		dragStart(e);
		canvas.addEventListener('mousemove', dragHandler);
	}
});
canvas.addEventListener('mouseup', function(e) {
	if (e.button === 1) {
		dragEnd(e);
		canvas.removeEventListener('mousemove', dragHandler);
	} else if (e.button === 0) {
		if (ownIdx in players) {
			players[ownIdx].controls['shoot'] = 0;
			wsClt.currentConnection.refreshControls(players[ownIdx].controls);
		}
	}
});
canvas.addEventListener('touchstart', dragStart);//TODO: action 1 on simple tap on mobile
//canvas.addEventListener('touchmove', dragMove);
canvas.addEventListener('touchend', dragEnd);
document.getElementById('gui-controls').addEventListener('dragstart', function(e) {
	e.preventDefault();//prevent unhandled dragging
});
//document.addEventListener('contextmenu', function(e) {
	//e.preventDefault();//prevent right-click context menu
	//unfortunately it also disables the context menu key
//});
document.addEventListener('mousemove', function(e) {
	game.mousePos.x = e.clientX;
	game.mousePos.y = e.clientY;
	game.mousePos.angle = (2.5*Math.PI + Math.atan2(game.mousePos.y - canvas.height*0.5, game.mousePos.x - canvas.width*0.5)) % (2*Math.PI);
});
setInterval(function() {
	if (wsClt.currentConnection !== undefined) wsClt.currentConnection.sendMousePos(game.mousePos.angle);
}, 80);


/* Gamepads */
if ('ongamepadconnected' in window || 'ongamepaddisconnected' in window) { // other browsers
	//no timed query
	let intervalId,
		controllingGamepad = null;
	window.addEventListener('gamepadconnected', e => {
		if (controllingGamepad !== null) {
			ui.notif.showMessage('Gamepad connected', 'Gamepad #' + e.gamepad.index + ' has been ignored because there is already a gamepad connected');
		} else {
			controllingGamepad = e.gamepad.index;
			ui.notif.showMessage('Gamepad connected', 'Gamepad #' + e.gamepad.index + ' is set as controlling device');
			intervalId = setInterval(updateControlsViaGamepad, 50, e.gamepad.index);
		}
	});
	window.addEventListener('gamepaddisconnected', e => {
		ui.notif.showMessage('Gamepad disconnected', 'Gamepad #' + e.gamepad.index + ' was disconnected');
		if (controllingGamepad === e.gamepad.index) {
			clearInterval(intervalId);
			controllingGamepad = null;
		}
	});
} else {
	let usingGamepad = -1,
		intervalId;
	setInterval(function() { // chrome
		let gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
		if (typeof gamepads[usingGamepad] === 'undefined' && usingGamepad !== -1) {
			ui.notif.showMessage('Gamepad disconnected', 'Gamepad #' + usingGamepad + ' was disconnected');
			usingGamepad = -1;
			clearInterval(intervalId);
		}
		if (usingGamepad === -1) {
			Array.prototype.forEach.call(gamepads, (gp) => { // Chrome workaround
				usingGamepad = gp.index;
				ui.notif.showMessage('Gamepad connected', 'Gamepad #' + usingGamepad + ' is set as controlling device');
				intervalId = setInterval(updateControlsViaGamepad, 50, usingGamepad);
			});
		}
	}, 500);
}
function updateControlsViaGamepad(usingGamepad) {
	if (usingGamepad === -1) return;
	let gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
	let g = gamepads[usingGamepad];
	if (typeof(g) !== 'undefined' && players.length !== 0 && ownIdx in players) {
		players[ownIdx].controls['jump'] = g.buttons[0].value;
		players[ownIdx].controls['run'] = g.buttons[1].value;
		players[ownIdx].controls['crouch'] = g.buttons[4].value;
		players[ownIdx].controls['jetpack'] = g.buttons[7].value;

		players[ownIdx].controls['moveLeft'] = 0;
		players[ownIdx].controls['moveRight'] = 0;
		if (g.axes[0] < -0.2 || g.axes[0] > 0.2) players[ownIdx].controls['move' + ((g.axes[0] < 0) ? 'Left' : 'Right')] = Math.abs(g.axes[0]);
		if (g.axes[2] < -0.2 || g.axes[2] > 0.2) game.drag.x = -canvas.width / 2 * g.axes[2];
		else game.drag.x = 0;
		if ((g.axes[3] < -0.2 || g.axes[3] > 0.2)) game.drag.y = -canvas.height / 2 * g.axes[3];
		else game.drag.y = 0;
		wsClt.currentConnection.refreshControls(players[ownIdx].controls);
	}
}

/* Zoom */
document.addEventListener('wheel', function(e) {
	if (!ui.chatInUse() && ui.noModalOpen()) {
		let z = Math.abs(e.deltaY) === e.deltaY ? 0.5 : 2; // 1/2 or 2/1
		draw.windowBox.zoomFactor = Math.max(0.25, Math.min(4, draw.windowBox.zoomFactor * z));
		ui.resizeCanvas();
	}
});

if (!isMobile) handleInput.loadKeySettings();
