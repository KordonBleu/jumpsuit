let previousTimeoutId = -1;

export function showNotif(title, desc) {
	if (!title && !desc) return;
	if (previousTimeoutId !== -1) clearTimeout(previousTimeoutId);

	let notifBox = document.getElementById('notif-box');
	notifBox.setAttribute('data-title', title);
	notifBox.setAttribute('data-desc', desc);
	notifBox.classList.remove('hidden');
	previousTimeoutId = setTimeout(() => {
		notifBox.classList.add('hidden');
		previousTimeoutId = -1;
	}, 4000);
}

let badCoEl = document.getElementById('gui-bad-connection');
export function showBadConnection() {
	badCoEl.classList.remove('hidden');
}
export function hideBadConnection() {
	badCoEl.classList.add('hidden');
}
