import test from 'ava';

import * as message from '../shared/message.js';
import * as convert from '../server/convert.js';
import ipaddr from 'ipaddr.js';


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
				}
			},
			radius: 100,
			type: 2
		};
	message.PlanetConst.serialize(buf, 4, planet);
	message.PlanetConst.deserialize(buf, 4, 67, (id, x, y, radius, type) => {
		t.is(id, 67);
		t.is(x, planet.box.center.x);
		t.is(y, planet.box.center.y);
		t.is(radius, planet.radius);
		t.is(type, planet.type);
	});
});
