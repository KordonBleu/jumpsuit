import settings from './settings.js';
import * as ui from './ui.js';
import * as wsClt from './websocket_client.js';
import * as draw from './draw.js';

const canvas = document.getElementById('canvas');

export const isMobile = (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)
	|| navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i));

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
		if (draw.players[ownIdx].controls[touch.target.id] !== undefined) {
			e.preventDefault();
			if (touch.target.id === 'moveLeft' || touch.target.id === 'moveRight') {
				let value = transform(touch, e.type);
				draw.players[ownIdx].controls['run'] = (-value >= 38) * 1;
			}
			if (e.type !== 'touchmove') draw.players[ownIdx].controls[touch.target.id] = s * 1;
			wsClt.currentConnection.refreshControls(draw.players[ownIdx].controls);
		}
	}
}


/* Keyboard */
function handleInput(e) {
	if (e.code === 'Tab') e.preventDefault();

	let s = (e.type === 'keydown') * 1;

	if (!ui.chatInUse() && ui.noModalOpen() && draw.players[ownIdx] !== undefined) {
		let triggered = keyMap[e.code];

		if (draw.players[ownIdx].controls[triggered] !== undefined) {
			e.preventDefault();
			let controlElement = document.getElementById(triggered);
			if (controlElement !== null) controlElement.style['opacity'] = s * 0.7 + 0.3;
			draw.players[ownIdx].controls[triggered] = s;
			wsClt.currentConnection.refreshControls(draw.players[ownIdx].controls);
		} else if (triggered === 'chat' && s === 1) window.setTimeout(function() {//prevent the letter corresponding to
			ui.focusChat();//the 'chat' control (most likelly 't')
		}, 0);//from being written in the chat
	}
}
export let keyMap = JSON.parse(settings.keymap),
	reverseKeyMap = {};

function updateReverseKeyMap() {
	handleInput.reverseKeyMap = {};
	for (let key in keyMap) {
		let action = keyMap[key], index;
		if (handleInput.reverseKeyMap[action] === undefined) handleInput.reverseKeyMap[action] = [];
		if (handleInput.reverseKeyMap[action][0] !== undefined) index = 1;
		else index = 0;
		handleInput.reverseKeyMap[action][index] = key;
	}
}
function updateKeyMap() {
	keyMap = {};
	for (let action in handleInput.reverseKeyMap){
		let keys = handleInput.reverseKeyMap[action];
		for (let key in keys) {
			if (keys[key] !== undefined || keys[key] !== null) keyMap[keys[key]] = action;
		}
	}

}

/* Drag & Mouse */
export let dragStart = new vinage.Vector(0, 0),
	drag = new vinage.Vector(0, 0);

function updateDragStart(e) {
	drag.x = e.pageX;
	drag.y = e.pageY;
	dragStart.x = e.pageX;
	dragStart.y = e.pageY;
}
function dragEnd() {
	drag.x = 0;
	drag.y = 0;
	dragStart.x = 0;
	dragStart.y = 0;
}
function dragMove(e) {
	drag.x = dragStart.x !== 0 ? e.pageX : 0;
	drag.y = dragStart.y !== 0 ? e.pageY : 0;
}
function dragHandler(e) {
	if (e.buttons & 4) {//middle-click enabled (and possibly other clicks too)
		dragMove(e);
	}
}
canvas.addEventListener('mousedown', function(e) {
	if (e.button === 0) {
		if (ownIdx in draw.players && wsClt.currentConnection.alive()) {
			draw.players[ownIdx].controls['shoot'] = 1;
			wsClt.currentConnection.refreshControls(draw.players[ownIdx].controls);
		}
	} else if (e.button === 1) {
		updateDragStart(e);
		canvas.addEventListener('mousemove', dragHandler);
	}
});
canvas.addEventListener('mouseup', function(e) {
	if (e.button === 1) {
		dragEnd(e);
		canvas.removeEventListener('mousemove', dragHandler);
	} else if (e.button === 0) {
		if (ownIdx in draw.players) {
			draw.players[ownIdx].controls['shoot'] = 0;
			wsClt.currentConnection.refreshControls(draw.players[ownIdx].controls);
		}
	}
});
canvas.addEventListener('touchstart', updateDragStart);//TODO: action 1 on simple tap on mobile
//canvas.addEventListener('touchmove', dragMove);
canvas.addEventListener('touchend', dragEnd);
document.getElementById('gui-controls').addEventListener('dragstart', function(e) {
	e.preventDefault();//prevent unhandled dragging
});
//document.addEventListener('contextmenu', function(e) {
	//e.preventDefault();//prevent right-click context menu
	//unfortunately it also disables the context menu key
//});

export let mouseAngle = 0;
document.addEventListener('mousemove', function(e) {
	mouseAngle = (2.5*Math.PI + Math.atan2(e.clientY - canvas.height*0.5, e.clientX - canvas.width*0.5)) % (2*Math.PI);
});
setInterval(function() {
	if (wsClt.currentConnection !== undefined) wsClt.currentConnection.sendMousePos(mouseAngle);
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
	if (typeof(g) !== 'undefined' && draw.players.length !== 0 && ownIdx in draw.players) {
		draw.players[ownIdx].controls['jump'] = g.buttons[0].value;
		draw.players[ownIdx].controls['run'] = g.buttons[1].value;
		draw.players[ownIdx].controls['crouch'] = g.buttons[4].value;
		draw.players[ownIdx].controls['jetpack'] = g.buttons[7].value;

		draw.players[ownIdx].controls['moveLeft'] = 0;
		draw.players[ownIdx].controls['moveRight'] = 0;
		if (g.axes[0] < -0.2 || g.axes[0] > 0.2) draw.players[ownIdx].controls['move' + ((g.axes[0] < 0) ? 'Left' : 'Right')] = Math.abs(g.axes[0]);
		if (g.axes[2] < -0.2 || g.axes[2] > 0.2) drag.x = -canvas.width / 2 * g.axes[2];
		else drag.x = 0;
		if ((g.axes[3] < -0.2 || g.axes[3] > 0.2)) drag.y = -canvas.height / 2 * g.axes[3];
		else drag.y = 0;
		wsClt.currentConnection.refreshControls(draw.players[ownIdx].controls);
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

export function addInputListeners() {
	window.addEventListener('keydown', handleInput);
	window.addEventListener('keyup', handleInput);
	window.addEventListener('touchstart', handleInputMobile);
	window.addEventListener('touchmove', handleInputMobile);
	window.addEventListener('touchend', handleInputMobile);
}
export function removeInputListeners() {
	window.removeEventListener('keydown', handleInput);
	window.removeEventListener('keyup', handleInput);
	window.removeEventListener('touchstart', handleInputMobile);
	window.removeEventListener('touchmove', handleInputMobile);
	window.removeEventListener('touchend', handleInputMobile);
}
