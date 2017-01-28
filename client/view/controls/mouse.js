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
