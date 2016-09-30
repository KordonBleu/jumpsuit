import test from 'ava';

import * as message from '../shared/message.js';
import * as convert from '../server/convert.js';
import ipaddr from 'ipaddr.js';


test('PartialServer', t => {
	let offset = 26,
		params = {
			secure: true,
			port: 1234,
			serverName: "Awesome server",
			modName: "capture"
		},
		serverNameBuf = convert.stringToBuffer(params.serverName),
		modNameBuf = convert.stringToBuffer(params.modName),
		buf = new ArrayBuffer(5 + serverNameBuf.byteLength + modNameBuf.byteLength + offset);

	message.PartialServer.serialize(buf, offset, params.secure, params.port, serverNameBuf, modNameBuf);

	let res = message.PartialServer.deserialize(buf, offset);

	t.deepEqual(params, res.data);
	t.is(buf.byteLength, res.offset);
});

test('Server', t => {
	let offset = 26,
		params = {
			secure: true,
			port: 1234,
			serverName: "Awesome server",
			modName: "capture",
			ipv6: ipaddr.parse('2001:0db8:0000:85a3:0000:0000:ac1f:8001')
		},
		serverNameBuf = convert.stringToBuffer(params.serverName),
		modNameBuf = convert.stringToBuffer(params.modName),
		buf = new ArrayBuffer(21 + serverNameBuf.byteLength + modNameBuf.byteLength + offset);

	message.Server.serialize(buf, offset, params.secure, params.port, serverNameBuf, modNameBuf, params.ipv6);

	let res = message.Server.deserialize(buf, offset);

	t.deepEqual(params, res.data);
	t.is(buf.byteLength, res.offset);
});
