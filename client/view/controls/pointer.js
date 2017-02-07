import vinage from 'vinage';
import * as model from '../../model/index.js';

const canvas = document.getElementById('canvas');

export function bindMouseMove(handler) {
	document.addEventListener('mousemove', e => {
		handler((2.5*Math.PI + Math.atan2(e.clientY - canvas.height*0.5, e.clientX - canvas.width*0.5)) % (2*Math.PI));
	});
}
//document.addEventListener('contextmenu', function(e) {
	//e.preventDefault();//prevent right-click context menu
	//unfortunately it also disables the context menu key
//});

// Zoom
export function bindWheel(handler) {
	document.addEventListener('wheel', e => {
		handler(e.deltaY);
	});
}

// dragging
let dragStart = new vinage.Vector(0, 0),
	drag = new vinage.Vector(0, 0); // yass kween!

export let dragSmoothed = new vinage.Vector(0, 0);
export function updateDragSmooth() { // this must be run at a certain frequency by the game loop
	dragSmoothed.x = ((dragStart.x - drag.x) * 1/model.controls.zoomFactor + dragSmoothed.x * 4) / 5;
	dragSmoothed.y = ((dragStart.y - drag.y) * 1/model.controls.zoomFactor + dragSmoothed.y * 4) / 5;
}


export function bindMouseDown(leftClickHandler, rightClickHandler) {
	canvas.addEventListener('mousedown', e => {
		switch (e.button) {
			case 0:
				leftClickHandler();
				break;
			case 1:
				rightClickHandler();
				break;
		}
	});
}
export function bindMouseUp(leftClickHandler, rightClickHandler) {
	canvas.addEventListener('mouseup', e => {
		switch (e.button) {
			case 0:
				leftClickHandler();
				break;
			case 1:
				rightClickHandler(e);
				break;
		}
	});
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
canvas.addEventListener('touchstart', updateDragStart);//TODO: action 1 on simple tap on mobile
//canvas.addEventListener('touchmove', dragMove);
canvas.addEventListener('touchend', dragEnd);
document.getElementById('gui-controls').addEventListener('dragstart', function(e) {
	e.preventDefault();//prevent unhandled dragging
});

export function startDrag(e) {
	updateDragStart(e);
	canvas.addEventListener('mousemove', dragHandler);
}
export function finishDrag() {
	dragEnd();
	canvas.removeEventListener('mousemove', dragHandler);
}

let touchControlsHandler;
export function setTouchcontrolsHandler(newTouchControlsHandler) {
	touchControlsHandler = newTouchControlsHandler;
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
		e.preventDefault();
		if (touch.target.id === 'moveLeft' || touch.target.id === 'moveRight') {
			let pressure = (- transform(touch, e.type) >= 38) * 1;
			touchControlsHandler('run', pressure);
		} else if (e.type !== 'touchmove') {
			let pressure = (e.type !== 'touchstart' && e.type === 'touchend') * 1;
			touchControlsHandler(touch.target.id, pressure);
		}
	}
}
