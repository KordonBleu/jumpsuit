export function hide() {
	[].forEach.call(document.getElementById('gui-controls').querySelectorAll('img'), function(element) {
		element.removeAttribute('style');
	});
}
