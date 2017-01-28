export let ownIdx = null,
	state = null,
	scores = null,
	ownHealth = null,
	ownFuel = null;

export function setState(newState) {
	state = newState;
}
export function setOwnIdx(newOwnIdx) {
	ownIdx = newOwnIdx;
}
export function setOwnHealth(newOwnHealth) {
	ownHealth = newOwnHealth;
}
export function setOwnFuel(newOwnFuel) {
	ownFuel = newOwnFuel;
}
export function setScores(newScores) {
	scores = newScores;
}
