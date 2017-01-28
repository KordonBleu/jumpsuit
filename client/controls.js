import vinage from 'vinage';

import * as view from './view/index.js';
import * as wsClt from './websockets.js';

import * as model from './model/index.js';

const canvas = document.getElementById('canvas');

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
		if (model.controls.selfControls[touch.target.id] !== undefined) {
			e.preventDefault();
			if (touch.target.id === 'moveLeft' || touch.target.id === 'moveRight') {
				let value = transform(touch, e.type);
				model.controls.selfControls['run'] = (-value >= 38) * 1;
			}
			if (e.type !== 'touchmove') model.controls.selfControls[touch.target.id] = s * 1;
			wsClt.currentConnection.refreshControls(model.controls.selfControls);
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
			model.controls.selfControls['shoot'] = 1;
			wsClt.currentConnection.refreshControls(model.controls.selfControls);
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
			model.controls.selfControls['shoot'] = 0;
			wsClt.currentConnection.refreshControls(model.controls.selfControls);
		}
	}
});
canvas.addEventListener('touchstart', updateDragStart);//TODO: action 1 on simple tap on mobile
//canvas.addEventListener('touchmove', dragMove);
canvas.addEventListener('touchend', dragEnd);
document.getElementById('gui-controls').addEventListener('dragstart', function(e) {
	e.preventDefault();//prevent unhandled dragging
});

export function addInputListeners() {
	view.controls.enable();
	window.addEventListener('touchstart', handleInputMobile);
	window.addEventListener('touchmove', handleInputMobile);
	window.addEventListener('touchend', handleInputMobile);
}
export function removeInputListeners() {
	view.controls.disable();
	window.removeEventListener('touchstart', handleInputMobile);
	window.removeEventListener('touchmove', handleInputMobile);
	window.removeEventListener('touchend', handleInputMobile);
}
