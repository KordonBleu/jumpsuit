import * as audio from './audio.js';
import * as game from './game.js';
import * as ui from './ui.js';

import Planet from './planet.js';
import Enemy from './enemy.js';
import Player from './player.js';
import Shot from './shot.js';

export let universe = new vinage.Rectangle(new vinage.Point(0, 0), null, null), // these parameters will be overwritten later
	players = [],
	planets = [],
	enemies = [],
	shots = [],
	deadShots = [];

export function addPlanet(x, y, radius, type) {
	planets.push(new Planet(x, y, radius, type));
}
export function updatePlanet(id, ownedBy, progress) {
	planets[id].team = ownedBy;
	planets[id].progress = progress;
	planets[id].updateColor();
}

export function addEnemy(x, y, appearance) {
	enemies.push(new Enemy(x, y, appearance));
}
export function updateEnemy(id, angle) {
	enemies[id].box.angle = angle;
}

export function addPlayer(pid, appearance, homographId, name) {
	let newPlayer = new Player(pid, appearance, homographId, name);
	players[pid] = newPlayer;
	if (!(pid in players)) ui.printChatMessage(undefined, undefined, newPlayer.getFinalName() + ' joined the game');
}
export function updatePlayer(pid, x, y, attachedPlanet, angle, looksLeft, jetpack, hurt, walkFrame, armedWeapon, carriedWeapon, aimAngle) {
	if (players[pid] === undefined) console.log(pid, players);
	players[pid].playSteps(players[game.ownIdx], walkFrame, x, y);
	players[pid].playJetpack(players[game.ownIdx], jetpack);
	players[pid].update(x, y, attachedPlanet, angle, looksLeft, jetpack, hurt, walkFrame, armedWeapon, carriedWeapon, aimAngle);
}
export function addShot(x, y, angle, origin, type) {
	audio.laserModel.makeSound(audio.makePanner(x - players[game.ownIdx].box.center.x, y - players[game.ownIdx].box.center.y)).start(0);
	let shot = new Shot(x, y, angle, origin, type);
	shots.push(shot);
	let originatingPlayer = players.find(element => {
		return element !== undefined && element.pid === origin;
	});
	if (originatingPlayer) originatingPlayer.armedWeapon.muzzleFlash = type === shot.TYPES.BULLET || type === shot.TYPES.BALL;
}
