function hashChange() {	
	document.getElementById("donate").setAttribute("style", "display: " + ((location.hash == "#donate") ? "block" : "none"));
	document.getElementById("share").setAttribute("style", "display: " + ((location.hash == "#donate") ? "none" : "block"));
}
window.addEventListener("hashchange", hashChange);
window.addEventListener("load", hashChange);


function handleInput(e){
	var t = e.target.id,
		s = (t == "") ? e.type == "keydown" : (e.type == "touchstart" || e.type == "mousedown");
	s = (s == true) ? 1 : 0;

	if (t == "canvas"){
		var x = (e.type.indexOf("touch") == 0 ? e.changedTouches[0].pageX : e.pageX) | 0,
			y = (e.type.indexOf("touch") == 0 ? e.changedTouches[0].pageY : e.pageY) | 0;
		if (e.type.indexOf("start") !== -1 || e.type.indexOf("down") !== -1){
			game.dragStartX = x;
			game.dragStartY = y;
			game.dragX = x;
			game.dragY = y;
		} else if (e.type.indexOf("end") !== -1 || e.type.indexOf("up") !== -1){
			game.dragStartX = 0;
			game.dragStartY = 0;
			game.dragX = 0;
			game.dragY = 0;
		} else if (e.type.indexOf("move") !== -1) {
			game.dragX = (game.dragStartX !== 0) ? x : 0;
			game.dragY = (game.dragStartY !== 0) ? y : 0;
		}
	} else if (t == "audio") {
		if (s == 1){
			if (e.target.getAttribute("src") === "assets/images/controls/mute.png") {
				e.target.setAttribute("src", "assets/images/controls/unmute.png");
				gain.gain.value = 0.5;
			} else {
				e.target.setAttribute("src", "assets/images/controls/mute.png"); 
				gain.gain.value = 0;
			}
		}		
	} else if (t == ""){
		switch (e.keyCode){
			case 27:
				if (s) {
					var box = document.getElementById("info-box");
					box.className = (box.className == "info-box hidden") ?  "info-box" : "info-box hidden";
				}
				break;
			case 32:
				controls["jump"] = s;
				break;
			case 16:
				controls["leftShift"] = s;
				break;
			case 38:
			case 87:
				controls["jetpack"] = s;
				break;
			case 40:
			case 83:
				controls["crouch"] = s;
				break;
			case 37:
			case 65:
				controls["moveLeft"] = s;
				break;
			case 39:
			case 68:
				controls["moveRight"] = s;
				break;
		}
	} else controls[t] = s;	
}

function handleGamepad(){
	var gamepads = navigator.getGamepads(), g = gamepads[0];
	if (typeof(g) !== "undefined"){
		controls["jump"] = g.buttons[0].value;
		controls["leftShift"] = g.buttons[1].value;
		controls["crouch"] = g.buttons[4].value;
		controls["jetpack"] = g.buttons[7].value;

		controls["moveLeft"] = 0;
		controls["moveRight"] = 0;
		if (g.axes[0] < -0.2 || g.axes[0] > 0.2) controls["move" + ((g.axes[0] < 0) ? "Left" : "Right")] = Math.abs(g.axes[0]);


		if (g.axes[2] < -0.2 || g.axes[2] > 0.2) game.dragX = -canvas.width / 2 * g.axes[2];
		else game.dragX = 0; 
		if ((g.axes[3] < -0.2 || g.axes[3] > 0.2)) game.dragY = -canvas.height / 2 * g.axes[3];
		else game.dragY = 0;
	}
}



window.addEventListener("keydown", handleInput);
window.addEventListener("keyup", handleInput);
window.addEventListener("touchstart", handleInput);
window.addEventListener("touchmove", handleInput);
window.addEventListener("touchend", handleInput);
window.addEventListener("mousedown", handleInput);
window.addEventListener("mousemove", handleInput);
window.addEventListener("mouseup", handleInput);
