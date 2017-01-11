import vinage from 'vinage';
import settings from './settings.js';
import * as bimap from '../shared/bimap.js';

import windowBox from './windowbox.js';

import * as ui from './ui.js';
import * as wsClt from './websockets.js';

const canvas = document.getElementById('canvas');

export const isMobile = (navigator.userAgent.match(/Android/i) || navigator.userAgent.match(/webOS/i) || navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPad/i)
	|| navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/BlackBerry/i) || navigator.userAgent.match(/Windows Phone/i));

String.prototype.ucFirst = function () {
	//uppercasing the first letter
	return this.charAt(0).toUpperCase() + this.slice(1);
};

export let selfControls = {
		changeWeapon: 0,
		crouch: 0,
		jetpack: 0,
		jump: 0,
		moveLeft: 0,
		moveRight: 0,
		run: 0,
		shoot: 0
	},
	keyMap = new bimap.KeyActionMap(settings.keymap);

export function resetKeyMap() {
	delete settings.keymap;
	keyMap.parse(settings.keymap);
}

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
		if (selfControls[touch.target.id] !== undefined) {
			e.preventDefault();
			if (touch.target.id === 'moveLeft' || touch.target.id === 'moveRight') {
				let value = transform(touch, e.type);
				selfControls['run'] = (-value >= 38) * 1;
			}
			if (e.type !== 'touchmove') selfControls[touch.target.id] = s * 1;
			wsClt.currentConnection.refreshControls(selfControls);
		}
	}
}


/* Keyboard */
function handleInput(e) {
	let s = (e.type === 'keydown') * 1;

	if (!ui.chatInUse() && ui.noModalOpen()) {
		let triggered = keyMap.getAction(e.code);

		if (selfControls[triggered] !== undefined) {
			e.preventDefault();
			let controlElement = document.getElementById(triggered);
			if (controlElement !== null) controlElement.style['opacity'] = s * 0.7 + 0.3;
			selfControls[triggered] = s;
			wsClt.currentConnection.refreshControls(selfControls);
		} else if (triggered === 'chat' && s === 1) {
			e.preventDefault();
			window.setTimeout(function() { // prevent the letter corresponding to
				ui.focusChat(); // the 'chat' control (most likelly 't')
			}, 0); // from being written in the chat
		}
	}
}

/* Drag & Mouse */
let dragStart = new vinage.Vector(0, 0),
	drag = new vinage.Vector(0, 0);

export let dragSmoothed = new vinage.Vector(0, 0);
export function updateDragSmooth(windowBox) { // this must be run at a certain frequency by the game loop
	dragSmoothed.x = ((dragStart.x - drag.x) * 1/windowBox.zoomFactor + dragSmoothed.x * 4) / 5;
	dragSmoothed.y = ((dragStart.y - drag.y) * 1/windowBox.zoomFactor + dragSmoothed.y * 4) / 5;
}

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
		if (wsClt.currentConnection.alive()) {
			selfControls['shoot'] = 1;
			wsClt.currentConnection.refreshControls(selfControls);
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
		if (wsClt.currentConnection.alive()) {
			selfControls['shoot'] = 0;
			wsClt.currentConnection.refreshControls(selfControls);
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


/* Gamepads */
if ('ongamepadconnected' in window || 'ongamepaddisconnected' in window) { // other browsers
	//no timed query
	let intervalId,
		controllingGamepad = null;
	window.addEventListener('gamepadconnected', e => {
		if (controllingGamepad !== null) {
			ui.showNotif('Gamepad connected', 'Gamepad #' + e.gamepad.index + ' has been ignored because there is already a gamepad connected');
		} else {
			controllingGamepad = e.gamepad.index;
			ui.showNotif('Gamepad connected', 'Gamepad #' + e.gamepad.index + ' is set as controlling device');
			intervalId = setInterval(updateControlsViaGamepad, 50, e.gamepad.index);
		}
	});
	window.addEventListener('gamepaddisconnected', e => {
		ui.showNotif('Gamepad disconnected', 'Gamepad #' + e.gamepad.index + ' was disconnected');
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
			ui.showNotif('Gamepad disconnected', 'Gamepad #' + usingGamepad + ' was disconnected');
			usingGamepad = -1;
			clearInterval(intervalId);
		}
		if (usingGamepad === -1) {
			/*Array.prototype.forEach.call(gamepads, (gp) => { // Chrome workaround
				usingGamepad = gp.index;
				ui.showNotif('Gamepad connected', 'Gamepad #' + usingGamepad + ' is set as controlling device');
				intervalId = setInterval(updateControlsViaGamepad, 50, usingGamepad);
			});*/
		}
	}, 500);
}
function updateControlsViaGamepad(usingGamepad) {
	if (usingGamepad === -1) return;
	let gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
	let g = gamepads[usingGamepad];
	if (typeof(g) !== 'undefined') {
		selfControls['jump'] = g.buttons[0].value;
		selfControls['run'] = g.buttons[1].value;
		selfControls['crouch'] = g.buttons[4].value;
		selfControls['jetpack'] = g.buttons[7].value;

		selfControls['moveLeft'] = 0;
		selfControls['moveRight'] = 0;
		if (g.axes[0] < -0.2 || g.axes[0] > 0.2) selfControls['move' + ((g.axes[0] < 0) ? 'Left' : 'Right')] = Math.abs(g.axes[0]);
		if (g.axes[2] < -0.2 || g.axes[2] > 0.2) drag.x = -canvas.width / 2 * g.axes[2];
		else drag.x = 0;
		if ((g.axes[3] < -0.2 || g.axes[3] > 0.2)) drag.y = -canvas.height / 2 * g.axes[3];
		else drag.y = 0;
		wsClt.currentConnection.refreshControls(selfControls);
	}
}

/* Zoom */
document.addEventListener('wheel', function(e) {
	if (!ui.chatInUse() && ui.noModalOpen()) {
		let z = Math.abs(e.deltaY) === e.deltaY ? 0.5 : 2; // 1/2 or 2/1
		windowBox.zoomFactor = Math.max(0.25, Math.min(4, windowBox.zoomFactor * z));
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
