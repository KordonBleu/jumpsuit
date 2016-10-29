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
			progress: 33,
			team: 'alienBlue'
		};
	message.PlanetMut.serialize(buf, 35, planet);
	message.PlanetMut.deserialize(buf, 35, 4, (id, ownedBy, progress) => {
		t.is(id, 4);
		t.is(ownedBy, planet.team);
		t.is(progress, planet.progress);
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


test('EnabledTeams', t => {
	let scoresObj = {
		alienPink: -8,
		alienBeige: 5000
	},
		buf = new ArrayBuffer(89);

	message.EnabledTeams.serialize(buf, 50, scoresObj);
	let res = message.EnabledTeams.deserialize(buf, 50);

	t.deepEqual(Object.keys(scoresObj).sort(), Object.keys(res.data).sort());
	t.is(1, res.byteLength);
});
