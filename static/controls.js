var gameBlurred = "";

function handleInputMobile(e){
	for (var t = 0; t < e.changedTouches.length; t++){
		var touch = e.changedTouches.item(t);
		if (touch.target.id == "canvas"){
			dragging(e.type, touch.pageX, touch.pageY);
		} else {
			e.preventDefault();
			if (e.type.indexOf("move") !== -1) return;
			var s = (e.type.indexOf("start") > -1 && e.type.indexOf("end") == -1);
			if (controls[touch.target.id] !== undefined) controls[touch.target.id] = s;
		}
	}
}

function handleInput(e){	
	if (e.target.id === "canvas" && gameBlurred === ""){
		dragging(e.type, e.pageX, e.pageY);
	} else {
		var triggered, keyMap = {9: "lobby", 27: "menu", 16: "run", 32: "jump", 37: "moveLeft", 38: "jetpack", 39: "moveRight", 40: "crouch", 65: "moveLeft", 68: "moveRight", 83: "crouch", 87: "jetpack"};
		if (e.type.substring(0, 3) === "key"){
			triggered = keyMap[e.keyCode];
		} else if (controls[e.target.id] !== undefined){
			e.preventDefault();		
			triggered = e.target.id;
		}
		if (triggered == "menu" && gameBlurred !== "m"){
			if (e.type === "keydown"){
				var box = document.getElementById("info-box");
				box.className = (box.className == "info-box hidden") ?  "info-box" : "info-box hidden";
			}
		} else if (triggered == "lobby" && gameBlurred !== "i"){
			if (e.type === "keydown"){
				var box = document.getElementById("multiplayer-box");
				box.className = (box.className == "multiplayer-box hidden") ?  "multiplayer-box" : "multiplayer-box hidden";
			}
		} else if (triggered != null && e.type.indexOf("mouse") !== 0 && gameBlurred === "") controls[triggered] = e.type === "keydown";
	}
	gameBlurred = document.getElementById("info-box").className === "info-box" ? "i" : document.getElementById("multiplayer-box").className === "multiplayer-box" ? "m" : "";	
	canvas.className = (gameBlurred === "") ? "" : "blurred";
}

function dragging(ev, x, y){
	if (ev.indexOf("start") !== -1 || ev.indexOf("down") !== -1){
		game.dragX = x;
		game.dragY = y;
		game.dragStartX = x;
		game.dragStartY = y;
	} else if (ev.indexOf("end") !== -1 || ev.indexOf("up") !== -1){
		game.dragX = 0;
		game.dragY = 0;
		game.dragStartX = 0;
		game.dragStartY = 0;
	} else if (ev.indexOf("move") !== -1){
		game.dragX = game.dragStartX !== 0 ? x : 0;
		game.dragY = game.dragStartY !== 0 ? y : 0;
	}	
}

document.getElementById("audio-icon").addEventListener("click", function(ev){
	if (ev.target.getAttribute("src") === "assets/images/controls/mute.svg") {
		ev.target.setAttribute("src", "assets/images/controls/unmute.svg");
		gain.gain.value = 0.5;
	} else {
		ev.target.setAttribute("src", "assets/images/controls/mute.svg");
		gain.gain.value = 0;
	}	
});

function handleGamepad(){
	var gamepads = navigator.getGamepads(), g = gamepads[0];
	if (typeof(g) !== "undefined"){
		controls["jump"] = g.buttons[0].value;
		controls["run"] = g.buttons[1].value;
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
window.addEventListener("touchstart", handleInputMobile);
window.addEventListener("touchmove", handleInputMobile);
window.addEventListener("touchend", handleInputMobile);
window.addEventListener("mousedown", handleInput);
window.addEventListener("mousemove", handleInput);
window.addEventListener("mouseup", handleInput);

function switchInformation(obj){
	document.getElementById("donate").setAttribute("style", "display: " + ((obj.textContent === "Donate") ? "block" : "none"));
	document.getElementById("share").setAttribute("style", "display: " + ((obj.textContent === "Donate") ? "none" : "block"));
}

var chosenAppearance = "alienBlue";
[].forEach.call(document.querySelectorAll(".playerSelect"), function (element){
	element.addEventListener("mousedown", function(){
		chosenAppearance = this.id.replace("player", "alien");
	});
});

document.getElementById("button-1").addEventListener("click", function(){
	if (this.textContent == "Disconnect"){
		this.textContent = "Connect";
		closeSocket();
	} else {
		this.textContent = "Disconnect";
		openSocket();		
	}
});
document.getElementById("button-2").addEventListener("click", function(){
	if (this.textContent === "Leave Lobby")	leaveLobby();
	else refreshLobbies();
});
document.getElementById("button-3").addEventListener("click", newLobby);
document.getElementById("button-4").addEventListener("click", function(){
	player.name = chosenAppearance;
	player.playerName = document.getElementById("name").value;
	settingsChanged();
});