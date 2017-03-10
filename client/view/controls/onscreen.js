export function hide() {
	[].forEach.call(document.getElementById('gui-controls').querySelectorAll('img'), function(element) {
		element.removeAttribute('style');
	});
}
export function displayJetpack() {
	document.getElementById('jump').setAttribute('src', '/assets/images/controls/jetpack.svg');
}
export function displayJump() {
	document.getElementById('jump').setAttribute('src', '/assets/images/controls/jump.svg');
}
