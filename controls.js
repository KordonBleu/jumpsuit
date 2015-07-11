function changeTab (obj){
	var tab = obj.textContent;
	document.getElementById("donate").setAttribute("style", "display: " + ((tab == "Donate") ? "block" : "none"));
	document.getElementById("share").setAttribute("style", "display: " + ((tab == "Donate") ? "none" : "block"));	
}
function convertToKey(keyCode) {
	if (keyCode > 47 && keyCode < 58) return keyCode - 48;//numbers
	else if (keyCode > 95 && keyCode < 106) return keyCode - 96;//numpad
	else if (keyCode > 64 && keyCode < 91) return convertToKey.keyMapChar.charAt(keyCode - 65);//characters
	else if (keyCode > 111 && keyCode < 124) return "F" + (keyCode - 111);//F-keys
	else return convertToKey.keyMapMisc[keyCode];//misc
}
convertToKey.keyMapChar = "abcdefghijklmnopqrstuvwxyz";
convertToKey.keyMapMisc = {//there are more but those are the most common
	8: "Backspace",
	9: "Tab",
	13: "Enter",
	16: "Shift",
	17: "Control",
	18: "Alt",
	19: "Pause",
	20: "CapsLock",
	27: "Escape",
	32: " ",
	37: "ArrowLeft",
	38: "ArrowUp",
	39: "ArrowRight",
	40: "ArrowDown"
}

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
	var s = e.type === "keydown",
		triggered,
		framesClosed = (document.getElementById("info-box").className.indexOf("hidden") !== -1 && document.getElementById("multiplayer-box").className.indexOf("hidden") !== -1);

	if (e.target.id === "canvas"){
		dragging(e.type, e.pageX, e.pageY);
	} else if (!changingKeys) {
		if(e.type.substring(0, 3) === "key"){
			triggered = handleInput.keyMap[e.key || convertToKey(e.keyCode)];
		} else if (controls[e.target.id] !== undefined){
			e.preventDefault();
			triggered = e.target.id;
		}
		if (triggered == "menu" || triggered == "lobby" && !chat.enabled){
			e.preventDefault();
			if (s == 1){
				var box = document.getElementById((triggered == "menu") ? "info-box" : "multiplayer-box");
				box.className = (box.className.indexOf("hidden") !== -1) ? box.className.substring(0, box.className.length - 7) : box.className + " hidden";		
			}
		} else if (triggered == "chat"){
			e.preventDefault();
			if (s == 1) chat.enabled = !chat.enabled;
		} else if (typeof triggered !== "undefined" && e.type.indexOf("mouse") !== 0 && !chat.enabled && framesClosed) {
			e.preventDefault();
			controls[triggered] = s;
		}
	}
}
handleInput.keyMap = {Tab: "lobby", Escape: "menu", Shift: "run", " ": "jump", ArrowLeft: "moveLeft", ArrowUp: "jetpack", ArrowRight: "moveRight", ArrowDown: "crouch", a: "moveLeft", w: "jetpack", d: "moveRight", s: "crouch"};

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

var reverseKeyMap = {};
for (key in handleInput.keyMap) {
	var action = handleInput.keyMap[key];
	if(reverseKeyMap[action] === undefined) reverseKeyMap[action] = [];
	reverseKeyMap[action].push(key);
}

var settingsEl = document.getElementById("key-settings");
for (action in reverseKeyMap) {
	var rowEl = document.createElement("tr"),
		actionEl = document.createElement("td"),
		keyEl;		

	actionEl.textContent = action	
	rowEl.appendChild(actionEl);

	var slice = reverseKeyMap[action];
	for (var i = 0; i != 2; i++){
		keyEl = document.createElement("td");
		if (typeof slice[i] === "undefined" || slice[i] == "") keyEl.textContent = " - ";
		else keyEl.textContent = slice[i].replace(" ", "Space").ucFirst();
		rowEl.appendChild(keyEl);
	}
	settingsEl.appendChild(rowEl);
}
var keyCol = document.getElementById("key-col"),
	changingKeys = false,
	selectedRow = -1;

settingsEl.addEventListener("click", function(e) {	
	function reselect(obj){	
		for (row in e.target.parentNode.parentNode.childNodes){
			e.target.parentNode.parentNode.childNodes[row].className = "";
			document.removeEventListener("keydown", wrap);
		}
		console.log(typeof obj !== "undefined");
		if (typeof obj !== "undefined") {
			obj.className = "selected";
			var nsr = [].slice.call(obj.parentNode.childNodes, 0).indexOf(obj);
			if (nsr === selectedRow) reselect();
			else selectedRow = nsr;
		} else {
			selectedRow = -1;
			document.removeEventListener("keyup", wrap);
			changingKeys = false;
		}
	}
	function handleChangeKey(e) {
		var keyName = e.key || convertToKey(e.keyCode),
			target = document.getElementById("key-settings").childNodes[selectedRow],
			firstKey = target.childNodes[1],
			altKey = target.childNodes[2];		
		delete handleInput.keyMap[altKey.textContent];		
		handleInput.keyMap[keyName] = target.firstChild.textContent;
		altKey.textContent = firstKey.textContent;
		firstKey.textContent = keyName.replace(" ", "Space").ucFirst();		
	}
	function wrap(nE) {
		nE.preventDefault();
		switch(nE.type) {
			case "keydown":
				changingKeys = true;
				document.removeEventListener("keydown", wrap);
				document.addEventListener("keyup", wrap);
				break;
			case "keyup":
				handleChangeKey(nE);
				reselect();
				break;				
		}
	}
	if (e.target.previousElementSibling !== null && e.target.nodeName === "TD") {//not action collumn, not th
		reselect(e.target.parentNode);
		document.addEventListener("keydown", wrap);
	}
});

window.addEventListener("touchstart", handleInputMobile);
window.addEventListener("touchmove", handleInputMobile);
window.addEventListener("touchend", handleInputMobile);
window.addEventListener("mousedown", handleInput);
window.addEventListener("mousemove", handleInput);
window.addEventListener("mouseup", handleInput);
window.addEventListener("keydown", handleInput);
window.addEventListener("keyup", handleInput);

document.getElementById("chat-input").addEventListener("focus", function(){
	document.getElementById("info-box").className = "info-box hidden";
	document.getElementById("multiplayer-box").className = "multiplayer-box hidden";
	chat.enabled = true;
});
document.getElementById("chat-input").addEventListener("blur", function(){
	chat.enabled = false;
});
document.getElementById("chat-input").addEventListener("keydown", function(e){
	if (e.keyCode == 13){
		chat.history.splice(0, 0, this.value);
		this.value = "";
	}
});