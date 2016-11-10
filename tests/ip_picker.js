import test from 'ava';

import * as ipPicker from '../server/ip_picker.js';
import ipaddr from 'ipaddr.js';

test.before(t => {
	return ipPicker.init();
});

test('client (IPv6) and server (IPv6) on localhost', t => {
	let client = ipaddr.parse('::1'),
		server = ipaddr.parse('::1'),
		res = ipPicker.pick(server, client).toString();

	t.is(res, '::ffff:7f00:1');
});

test('client (IPv4) and server (IPv4) on localhost', t => {
	let client = ipaddr.parse('::ffff:7f00:1'),
		server = ipaddr.parse('::ffff:7f00:1'),
		res = ipPicker.pick(server, client).toString();

	t.is(res, '::ffff:7f00:1');
});

test('client (IPv4) on network and server (IPv4) on localhost', t => {
	let client = '192.168.0.6',
		server = ipaddr.parse('::ffff:7f00:1'),
		res = ipPicker.pick(server, client).toIPv4Address().toString();

	t.is(res, '192.168.0.2');
});

test('client (IPv4) on localhost and server (IPv4) on network', t => {
	let client = ipaddr.parse('::ffff:7f00:1'),
		server = '192.168.0.6',
		res = ipPicker.pick(server, client).toIPv4Address().toString();

	t.is(res, server);
});

test('client (IPv4) and server (IPv4) on network', t => {
	let client = '192.168.0.35',
		server = '192.168.0.6',
		res = ipPicker.pick(server, client).toIPv4Address().toString();

	t.is(res, server);
});

test('client (IPv4) on Internet and server (IPv4) on localhost', t => {
	let client = '23.54.123.53',
		server = '127.0.0.1',
		res = ipPicker.pick(server, client);

	t.is(res, undefined); // should be externalIp, which may be undefined. In this case it is
});

test('client (IPv4) on Internet and server (IPv4) on network', t => { // if behind a nat, send externalIp, otherwise send uh... undefined?
	let client = '23.54.123.53',
		server = '192.168.0.6',
		res = ipPicker.pick(server, client);

	t.is(res, undefined); // should be externalIp, which may be undefined. In this case it is
});

test('client (IPv4) on the Internet and server (IPv4) on the Internet', t => {
	let client = '23.54.123.53',
		server = '67.83.210.23',
		res = ipPicker.pick(server, client).toIPv4Address().toString();

	t.is(res, server);
});

test('client (IPv4) on localhost and server (IPv4) on the Internet', t => {
	let client = '127.0.0.1',
		server = '67.83.210.23',
		res = ipPicker.pick(server, client).toIPv4Address().toString();

	t.is(res, server);
});

test('client (IPv4) on network and server (IPv4) on the Internet', t => {
	let client = '192.168.0.24',
		server = '67.83.210.23',
		res = ipPicker.pick(server, client).toIPv4Address().toString();

	t.is(res, server);
});
