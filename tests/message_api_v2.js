import test from 'ava';

import '../server/proto_mut.js';

/*import Planet from '../shared/planet.js';
import Enemy from '../shared/enemy.js';
import Shot from '../shared/shot.js';
import Player from '../shared/player.js';*/

import * as message from '../shared/message_api_v2.js';

import * as vinage from 'vinage';
import ipaddr from 'ipaddr.js';


test('registerServer message', t => {
	let a = {
			secure: true,
			serverPort: 7483,
			serverName: 'server name',
			modName: 'mod name'
		},
		b = {
			secure: false,
			serverPort: 328,
			serverName: 'The Circlejerk',
			modName: 'biscuit'
		};
	let buf1 = message.registerServer.serialize(a.secure, a.serverPort, a.serverName, a.modName);
	let res1 = message.registerServer.deserialize(buf1);
	t.deepEqual(a, res1);

	console.log(message.getSerializator(buf1) === message.registerServer);
	console.log(message);

	let buf2 = message.registerServer.serialize(b.secure, b.serverPort, b.serverName, b.modName);
	let res2 = message.registerServer.deserialize(buf2);
	t.deepEqual(b, res2);
});

test('addServers message', t => {
	let serverList = [
			{
				name: 'server name',
				mod: 'mod name',
				port: 7483,
				secure: true
			},
			{
				name: 'The Circlejerk',
				mod: 'biscuit',
				port: 31415,
				secure: false
			},
			{
				name: 'Deutsche Qualität',
				mod: 'caractères accentués',
				port: 7483,
				secure: true
			}
		],
		ipList = [
			ipaddr.parse('2001:0db8:0000:85a3:0000:0000:ac1f:8001'),
			ipaddr.parse('2001:610:240:22::c100:68b'),
			ipaddr.parse('2001:0db8:0000:0000:0000:ff00:0042:8329')
		];

	let buf1 = message.addServers.serialize(serverList, ipList);
	let res1 = message.addServers.deserialize(buf1);

	serverList.forEach((srv, i) => {
		t.is(srv.name, res1[i].name);
		t.is(srv.mod, res1[i].mod);
		t.is(srv.port, res1[i].port);
		t.is(srv.secure, res1[i].secure);
		t.is(ipList[i].toString(), res1[i].ipv6.toString());
	});
});
