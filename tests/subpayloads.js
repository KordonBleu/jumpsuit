import test from 'ava';

import * as message from '../shared/message.js';
import * as convert from '../server/convert.js';
import ipaddr from 'ipaddr.js';

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
