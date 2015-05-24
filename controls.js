var resIcon = ["jetpack.svg", "jump.png", "crouch.png", "moveLeft.png", "moveRight.png"];

function handleMobileInput(e) {
	var s = (e.type === "mousedown") ? 1 : 0,
		triggered = e.target.src.replace(window.location.href.replace("index.html" + window.location.hash, "") + "assets/images/controls/", "");
	triggered = triggered.slice(0, triggered.lastIndexOf("."));
	
	controls[triggered] = s;
}

var controls = document.createElement("ul");
controls.id = "controls";
document.body.appendChild(controls);

resIcon.forEach(function(elem) {
	var li = document.createElement("li"),
		icon = new Image();
	icon.src = "assets/images/controls/" + elem;

	icon.addEventListener("mouseup", handleMobileInput);
	icon.addEventListener("mousedown", handleMobileInput);

	li.appendChild(icon);
	controls.appendChild(li);
});


function handleInput(e){
	if (e.target.id == "canvas"){
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
	} else {
		var t = e.target.id,
			s = (t == "") ? e.type == "keydown" : (e.type == "touchstart" || e.type == "mousedown");
		s = (s == true) ? 1 : 0;

		if (t == "audio" && s == 1) {
			if (e.target.getAttribute("src") === "assets/images/controls/mute.png") {
				e.target.setAttribute("src", "assets/images/controls/unmute.png");
				gain.gain.value = 0.5;
			} else {
				e.target.setAttribute("src", "assets/images/controls/mute.png"); 
				gain.gain.value = 0;
			}
		} else {
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
		}
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
