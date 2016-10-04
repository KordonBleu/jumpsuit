import test from 'ava';

import '../server/proto_mut.js';

import * as message from '../shared/message.js';
import * as convert from '../server/convert.js';
import ipaddr from 'ipaddr.js';


import * as vinage from 'vinage';
import Planet from '../shared/planet.js';
import Enemy from '../shared/enemy.js';
import Shot from '../shared/shot.js';
import Player from '../shared/player.js';

function approxAngle(angle) {
	return Math.floor(angle*10);
}


test('PartialServer', t => {
	let offset = 26,
		params = {
			secure: true,
			port: 1234,
			serverName: 'Awesome server',
			modName: 'capture'
		},
		serverNameBuf = convert.stringToBuffer(params.serverName),
		modNameBuf = convert.stringToBuffer(params.modName),
		buf = new ArrayBuffer(5 + serverNameBuf.byteLength + modNameBuf.byteLength + offset);

	message.PartialServer.serialize(buf, offset, params.secure, params.port, serverNameBuf, modNameBuf);

	let res = message.PartialServer.deserialize(buf, offset);

	t.deepEqual(params, res.data);
	t.is(buf.byteLength - offset, res.byteLength);
});

test('Server', t => {
	let offset = 26,
		params = {
			secure: true,
			port: 1234,
			serverName: 'Awesome server',
			modName: 'capture',
			ipv6: ipaddr.parse('2001:0db8:0000:85a3:0000:0000:ac1f:8001')
		},
		serverNameBuf = convert.stringToBuffer(params.serverName),
		modNameBuf = convert.stringToBuffer(params.modName),
		buf = new ArrayBuffer(21 + serverNameBuf.byteLength + modNameBuf.byteLength + offset);

	message.Server.serialize(buf, offset, params.secure, params.port, serverNameBuf, modNameBuf, params.ipv6);

	let res = message.Server.deserialize(buf, offset);

	t.deepEqual(params, res.data);
	t.is(buf.byteLength - offset, res.byteLength);
});

test('PlanetMut', t => {
	let buf = new ArrayBuffer(2 + 37),
		planet = {
			progress: {
				team: 'alienBlue',
				value: 33
			}
		};
	message.PlanetMut.serialize(buf, 35, planet);
	message.PlanetMut.deserialize(buf, 35, 4, (id, ownedBy, progress) => {
		t.is(id, 4);
		t.is(ownedBy, planet.progress.team);
		t.is(progress, planet.progress.value);
	});
});

test('PlanetConst', t => {
	let buf = new ArrayBuffer(7 + 17),
		planet = {
			box: {
				center: {
					x: 24,
					y: 56
				},
				radius: 100
			},
			type: 2
		};
	message.PlanetConst.serialize(buf, 4, planet);
	message.PlanetConst.deserialize(buf, 4, (x, y, radius, type) => {
		t.is(x, planet.box.center.x);
		t.is(y, planet.box.center.y);
		t.is(radius, planet.box.radius);
		t.is(type, planet.type);
	});
});

test('Shot', t => {
	let buf = new ArrayBuffer(7 + 1),
		shot = {
			box: {
				center: {
					x: 78,
					y: 2321
				},
				angle: Math.PI/2
			},
			origin: 3,
			type: 1
		};

	message.Shot.serialize(buf, 1, shot);
	message.Shot.deserialize(buf, 1, (x, y, angle, origin, type) => {
		t.is(x, shot.box.center.x);
		t.is(y, shot.box.center.y);
		t.is(approxAngle(angle), approxAngle(shot.box.angle));
		t.is(origin, shot.origin);
		t.is(type, shot.type);
	});
});

test('EnemyConst', t => {
	let enemy = {
		box: {
			center: {
				x: 9898,
				y: 3
			}
		},
		appearance: 'enemyBlue4'
	},
		buf = new ArrayBuffer(5);

	message.EnemyConst.serialize(buf, 0, enemy);
	message.EnemyConst.deserialize(buf, 0, (x, y, appearance) => {
		t.is(enemy.box.center.x, x);
		t.is(enemy.box.center.y, y);
		t.is(enemy.appearance, appearance);
	});
});

test('PlayerConst', t => {
	let player = {
		pid: 24,
		appearance: 'alienGreen',
		homographId: 5
	},
		nameBuf = convert.stringToBuffer('Florian'),
		buf = new ArrayBuffer(57);

	message.PlayerConst.serialize(buf, 12, player, nameBuf);
	message.PlayerConst.deserialize(buf, 12, (pid, appearance, homographId, name) => {
		t.is(pid, player.pid);
		t.is(appearance, player.appearance);
		t.is(homographId, player.homographId);
		t.is(name, 'Florian');
	});
});

test('PlayerMut', t => {
	let player = {
		pid: 25,
		box: {
			center: {
				x: 44,
				y: 100
			},
			angle: Math.PI/3
		},
		attachedPlanet: 6,
		aimAngle: Math.PI*1.1,
		walkFrame: 'jump',
		jetpack: true,
		looksLeft: true,
		hurt: true,
		armedWeapon: {
			type: 'Knife'
		},
		carriedWeapon: {
			type: 'Smg'
		}
	},
		buf = new ArrayBuffer(11);

	message.PlayerMut.serialize(buf, 1, player);
	message.PlayerMut.deserialize(buf, 1, (pid, x, y, attachedPlanet, angle, looksLeft, jetpack, hurt, walkFrame, armedWeapon, carriedWeapon, aimAngle) => {
		t.is(pid, player.pid);
		t.is(x, player.box.center.x);
		t.is(y, player.box.center.y);
		t.is(attachedPlanet, player.attachedPlanet);
		t.is(approxAngle(angle), approxAngle(player.box.angle));
		t.is(looksLeft, player.looksLeft);
		t.is(jetpack, player.jetpack);
		t.is(hurt, player.hurt);
		t.is(walkFrame, player.walkFrame);
		t.is(armedWeapon, player.armedWeapon.type);
		t.is(carriedWeapon, player.carriedWeapon.type);
		t.is(approxAngle(aimAngle), approxAngle(player.aimAngle));
	});
});


let planets = [
		new Planet(12, 434, 23),
		new Planet(654, 12, 38),
		new Planet(43, 487, 76)
	],
	enemies = [
		new Enemy(38, 98),
		new Enemy(555, 543),
		new Enemy(42, 243)
	],
	shots = [
		new Shot(44, 87, 0.5*Math.PI, -1, 3),
		new Shot(44, 87, 0.75*Math.PI, 0, 1)
	],
	players = [
		new Player('Charles', 'alienBlue', '_hurt', -1, true, 358, 45, 'Knife', 'Smg', 0.3*Math.PI),
		new Player('Lucette', 'alienPink', '_stand', -1, false, 27, 0, 'Lmg', 'Shotgun', 1.1*Math.PI)
	];

planets[0].progress.team = 'alienBlue';
planets[0].progress.value = 0;
planets[1].progress.team = 'alienPink';
planets[1].progress.value = 33;

players[0].box = new vinage.Rectangle(new vinage.Point(12, 444), 55, 92, 1.5*Math.PI);
players[1].box = new vinage.Rectangle(new vinage.Point(98, 342), 58, 102);
players[0].pid = 0;
players[1].pid = 1;
players[0].looksLeft = true;
players[1].looksLeft = false;
players[0].homographId = 0;
players[1].homographId = 0;
players[0].hurt = true;
players[1].hurt = false;

enemies[0].box.angle = 0.321;
enemies[2].box.angle = Math.PI;
test('BootstrapScores', t => {
	let scoresObj = {
		alienPink: -8,
		alienBeige: 5000
	},
		buf = new ArrayBuffer(89);

	message.BootstrapScores.serialize(buf, 50, scoresObj);
	let res = message.BootstrapScores.deserialize(buf, 50);

	t.deepEqual(scoresObj, res.data);
	t.is(9, res.byteLength);
});

test('BootstrapUniverse', t => {
	let addEntityBuf = message.addEntity.serialize(planets, enemies, shots, players),
		planetI = 0,
		enemyI = 0,
		shotI = 0;

	let buf = new ArrayBuffer(1000),
		data = {
			lobbyId: 12345,
			playerId: 100,
			univWidth: 2000,
			univHeight: 2500
		};
	message.BootstrapUniverse.serialize(buf, 500, data.lobbyId, data.playerId, data.univWidth, data.univHeight, addEntityBuf);
	let res = message.BootstrapUniverse.deserialize(buf, 500, (x, y, radius, type) => {
		t.is(planets[planetI].box.center.x, x);
		t.is(planets[planetI].box.center.y, y);
		t.is(planets[planetI].box.radius, radius);
		t.is(planets[planetI].type, type);

		++planetI;
	}, (id, ownedBy, progress) => {
		t.is(planets[id].progress.team, ownedBy);
		t.is(planets[id].progress.value, progress);
	}, (x, y, appearance) => {
		t.is(enemies[enemyI].box.center.x, x);
		t.is(enemies[enemyI].box.center.y, y);
		t.is(enemies[enemyI].appearance, appearance);

		++enemyI;
	}, (id, angle) => {
		t.is(approxAngle(enemies[id].box.angle), approxAngle(angle));
	}, (x, y, angle, origin, type) => {
		t.is(shots[shotI].box.center.x, x);
		t.is(shots[shotI].box.center.y, y);
		t.is(approxAngle(shots[shotI].box.angle), approxAngle(angle)); // there is some imprecision due to brads
		t.is(shots[shotI].origin === -1 ? 255 : shots[shotI].origin, origin); // -1 when originating from enemies, which is 255 when wrapped
		t.is(shots[shotI].type, type);

		++shotI;
	}, (pid, appearance, homographId, name) => {
		t.is(players[pid].pid, pid);
			//t.is(players[pid].appearance, appearance);
		t.is(players[pid].homographId, homographId);
		t.is(players[pid].name, name);
	}, (pid, x, y, attachedPlanet, angle, looksLeft, jetpack, hurt, walkFrame, armedWeapon, carriedWeapon) => {
		t.is(players[pid].pid, pid);
		t.is(players[pid].box.center.x, x);
		t.is(players[pid].box.center.y, y);
		t.is(players[pid].attachedPlanet === -1 ? 255 : players[pid].attachedPlanet, attachedPlanet); // -1 when in space, which is 255 when wrapped
		t.is(approxAngle(players[pid].box.angle), approxAngle(angle)); // there is some imprecision due to brads
		t.is(players[pid].looksLeft, looksLeft);
		t.is(players[pid].jetpack, jetpack);
		t.is(players[pid].hurt, hurt);
		t.is(players[pid].walkFrame, walkFrame);
		t.is(players[pid].armedWeapon.type, armedWeapon, 'player[' + pid + ']');
		t.is(players[pid].carriedWeapon.type, carriedWeapon, 'player[' + pid + ']');
	});

	t.deepEqual(data, res.data);
});
