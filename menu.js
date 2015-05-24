function hashChange() {
	console.log(location.hash);
	document.getElementById("donate").setAttribute("style", "display: " + ((location.hash == "#donate") ? "block" : "none"));
	document.getElementById("share").setAttribute("style", "display: " + ((location.hash == "#donate") ? "none" : "block"));
}
window.addEventListener("hashchange", hashChange);
window.addEventListener("load", hashChange);

