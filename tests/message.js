import test from 'ava';

import '../server/proto_mut.js';

import Planet from '../shared/planet.js';
import Enemy from '../shared/enemy.js';
import Shot from '../shared/shot.js';
import Player from '../shared/player.js';

import * as message from '../shared/message.js';

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
	t.is(message.getSerializator(buf1), message.registerServer);

	let buf2 = message.registerServer.serialize(b.secure, b.serverPort, b.serverName, b.modName);
	let res2 = message.registerServer.deserialize(buf2);
	t.deepEqual(b, res2);
	t.is(message.getSerializator(buf2), message.registerServer);
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
	t.is(message.getSerializator(buf1), message.addServers);

	serverList.forEach((srv, i) => {
		t.is(srv.name, res1[i].name);
		t.is(srv.mod, res1[i].mod);
		t.is(srv.port, res1[i].port);
		t.is(srv.secure, res1[i].secure);
		t.is(ipList[i].toString(), res1[i].ipv6.toString());
	});
});

test('removeServers message', t => {
	let ids1 = [1, 45, 65535, 5, 899],
		buf1 = message.removeServers.serialize(ids1),
		res1 = message.removeServers.deserialize(buf1);
	t.deepEqual(ids1, res1);
	t.is(message.getSerializator(buf1), message.removeServers);

	let ids2 = [],
		buf2 = message.removeServers.serialize(ids2),
		res2 = message.removeServers.deserialize(buf2);
	t.deepEqual(ids2, res2);
	t.is(message.getSerializator(buf2), message.removeServers);

	let ids3 = [99],
		buf3 = message.removeServers.serialize(ids3),
		res3 = message.removeServers.deserialize(buf3);
	t.deepEqual(ids3, res3);
	t.is(message.getSerializator(buf3), message.removeServers);
});

test('setPreferences message', t => {
	let settings = {
			name: 'Unnamed Player',
			primary: 'Lmg',
			secondary: 'Knife'
		},
		buf = message.setPreferences.serialize(settings),
		res = message.setPreferences.deserialize(buf);

	t.deepEqual(settings, res);
	t.is(message.getSerializator(buf), message.setPreferences);
});

test('setNameBroadcast message', t => {
	let val = {
			id: 5,
			name: 'Jean-Kévin',
			homographId: 2
		},
		buf = message.setNameBroadcast.serialize(val.id, val.name, val.homographId),
		res = message.setNameBroadcast.deserialize(buf);

	t.deepEqual(val, res);
	t.is(message.getSerializator(buf), message.setNameBroadcast);
});

test('connect message', t => {
	let buf = message.connect.serialize(45, {
			name: 'កែវ',
			primary: 'Lmg',
			secondary: 'Knife'
		}),
		res = message.connect.deserialize(buf);

	t.is(res.lobbyId, 45);
	t.is(res.primary, 'Lmg');
	t.is(res.secondary, 'Knife');
	t.is(res.name, 'កែវ');
	t.is(message.getSerializator(buf), message.connect);
});

test('error message', t => {
	let buf1 = message.error.serialize(message.error.NO_LOBBY),
		res1 = message.error.deserialize(buf1);
	t.is(res1, message.error.NO_LOBBY);
	t.is(message.getSerializator(buf1), message.error);

	let buf2 = message.error.serialize(message.error.NO_SLOT),
		res2 = message.error.deserialize(buf2);
	t.is(res2, message.error.NO_SLOT);
	t.is(message.getSerializator(buf2), message.error);
});

test('connectAccepted message', t => {
	let val =  {
			lobbyId: 4000000000, // 32 bits
			playerId: 244, // 8bits
			univWidth: 65535, // 16 bits
			univHeight: 30000 // 16 bits
		},
		buf = message.connectAccepted.serialize(val.lobbyId, val.playerId, val.univWidth, val.univHeight),
		res = message.connectAccepted.deserialize(buf);

	t.deepEqual(val, res);
	t.is(message.getSerializator(buf), message.connectAccepted);

	let val2 = {
			lobbyId: 989043,
			playerId: 24,
			univWidth: 3429,
			univHeight: 4452
		},
		buf2 = message.connectAccepted.serialize(val2.lobbyId, val2.playerId, val2.univWidth, val2.univHeight);

	t.deepEqual(val2, message.connectAccepted.deserialize(buf2));
	t.is(message.getSerializator(buf2), message.connectAccepted);
});

test('lobbyState message', t => {
	let teams = [
			'alienBeige',
			'alienBlue',
			'alienGreen',
			'alienPink',
			'alienYellow'
		],
		buf = message.lobbyState.serialize('warmup', teams),
		res = message.lobbyState.deserialize(buf);

	t.deepEqual(teams, res.enabledTeams);
	t.is(res.state, 'warmup');
	t.is(message.getSerializator(buf), message.lobbyState);
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

function approxAngle(angle) {
	return Math.floor(angle*10);
}


test('addEntity message', t => {
	let buf = message.addEntity.serialize(planets, enemies, shots, players),
		planetI = 0,
		enemyI = 0,
		shotI = 0,
		playerI = 0;

	message.addEntity.deserialize(buf, (x, y, radius, type) => {
		t.is(planets[planetI].box.center.x, x);
		t.is(planets[planetI].box.center.y, y);
		t.is(planets[planetI].box.radius, radius);
		t.is(planets[planetI].type, type);

		++planetI;
	}, (x, y, appearance) => {
		t.is(enemies[enemyI].box.center.x, x);
		t.is(enemies[enemyI].box.center.y, y);
		t.is(enemies[enemyI].appearance, appearance);

		++enemyI;
	}, (x, y, angle, origin, type) => {
		t.is(shots[shotI].box.center.x, x);
		t.is(shots[shotI].box.center.y, y);
		t.is(approxAngle(shots[shotI].box.angle), approxAngle(angle)); // there is some imprecision due to brads
		t.is(shots[shotI].origin === -1 ? 255 : shots[shotI].origin, origin); // -1 when originating from enemies, which is 255 when wrapped
		t.is(shots[shotI].type, type);

		++shotI;
	}, (pid, x, y, attachedPlanet, angle, looksLeft, jetpack, appearance, walkFrame, name, homographId, armedWeapon, carriedWeapon) => {
		t.is(players[playerI].pid, pid);
		t.is(players[playerI].box.center.x, x);
		t.is(players[playerI].box.center.y, y);
		t.is(players[playerI].attachedPlanet === -1 ? 255 : players[playerI].attachedPlanet, attachedPlanet); // -1 when in space, which is 255 when wrapped
		t.is(approxAngle(players[playerI].box.angle), approxAngle(angle)); // there is some imprecision due to brads
		t.is(players[playerI].looksLeft, looksLeft);
		t.is(players[playerI].jetpack, jetpack);
		t.is(players[playerI].appearance, appearance);
		t.is(players[playerI].walkFrame, walkFrame);
		t.is(players[playerI].name, name);
		t.is(players[playerI].homographId, homographId);
		t.is(players[playerI].armedWeapon.type, armedWeapon, 'player[' + playerI + ']');
		t.is(players[playerI].carriedWeapon.type, carriedWeapon, 'player[' + playerI + ']');

		++playerI;
	});
	t.is(message.getSerializator(buf), message.addEntity);
});


test('gameState message', t => {
	let selfParam = {
			yourHealth: 8,
			yourFuel: 40
		},
		buf = message.gameState.serialize(selfParam.yourHealth, selfParam.yourFuel, planets, enemies, players),
		planetI = 0,
		enemyI = 0,
		playerI = 0;

	let res = message.gameState.deserialize(buf, planets.length, enemies.length, (id, ownedBy, progress) => {
		t.is(id, planetI);
		t.is(planets[planetI].progress.team, ownedBy);
		t.is(planets[planetI].progress.value, progress);

		++planetI;
	}, (id, angle) => {
		t.is(id, enemyI);
		t.is(approxAngle(enemies[enemyI].box.angle), approxAngle(angle));

		++enemyI;
	}, (pid, x, y, attachedPlanet, angle, looksLeft, jetpack, hurt, walkFrame, armedWeapon, carriedWeapon) => {
		t.is(pid, playerI);
		t.is(players[pid].box.center.x, x);
		t.is(players[pid].box.center.y, y);
		t.is(players[pid].attachedPlanet === -1 ? 255 : players[pid].attachedPlanet, attachedPlanet); // -1 when in space, which is 255 when wrapped
		t.is(approxAngle(players[pid].box.angle), approxAngle(angle));
		t.is(players[pid].looksLeft, looksLeft);
		t.is(players[pid].jetpack, jetpack);
		t.is(players[pid].hurt, hurt);
		t.is(players[pid].walkFrame, walkFrame);
		t.is(players[pid].armedWeapon.type, armedWeapon);
		t.is(players[pid].carriedWeapon.type, carriedWeapon);

		++playerI;
	});

	t.deepEqual(selfParam, res);
	t.is(message.getSerializator(buf), message.gameState);
});

test('gameState message bis', t => {
	let planets = [
			{
				progress: {
					team: 'neutral',
					value: 0,
				}
			},
			{
				progress: {
					team: 'neutral',
					value: 0,
				}
			},
			{
				progress: {
					team: 'neutral',
					value: 0,
				}
			},
		],
		enemies = [
			{
				box: {
				angle: 0.06283185307179585
				},
			},
			{
				box: {
				angle: 3.1238214839968435
				},
			},
			{
				box: {
				angle: 0.06283185307179585
				},
			}
		],
		players = [
			{
				pid: 0,
				box: {
					center: {
						x: 0,
						y: 0,
					},
					angle: 1.0845553855026504
				 },
				aimAngle: 0,
				walkFrame: 'jump',
				jetpack: false,
				looksLeft: true,
				hurt: true,
				health: 8,
				fuel: 300,
				attachedPlanet: -1,
				armedWeapon: {
					type: "Lmg"
				},
				carriedWeapon: {
					type: "Smg"
				}
			}
		];
	let selfParam = {
			yourHealth: 8,
			yourFuel: 300
		},
		buf = message.gameState.serialize(selfParam.yourHealth, selfParam.yourFuel, planets, enemies, players),
		planetI = 0,
		enemyI = 0,
		playerI = 0;

	let res = message.gameState.deserialize(buf, planets.length, enemies.length, (id, ownedBy, progress) => {
		t.is(id, planetI);
		t.is(planets[planetI].progress.team, ownedBy);
		t.is(planets[planetI].progress.value, progress);

		++planetI;
	}, (id, angle) => {
		t.is(id, enemyI);
		t.is(approxAngle(enemies[enemyI].box.angle), approxAngle(angle));

		++enemyI;
	}, (pid, x, y, attachedPlanet, angle, looksLeft, jetpack, hurt, walkFrame, armedWeapon, carriedWeapon) => {
		t.is(pid, playerI);
		t.is(players[pid].box.center.x, x);
		t.is(players[pid].box.center.y, y);
		t.is(players[pid].attachedPlanet === -1 ? 255 : players[pid].attachedPlanet, attachedPlanet); // -1 when in space, which is 255 when wrapped
		t.is(approxAngle(players[pid].box.angle), approxAngle(angle));
		t.is(players[pid].looksLeft, looksLeft);
		t.is(players[pid].jetpack, jetpack);
		t.is(players[pid].hurt, hurt);
		t.is(players[pid].walkFrame, walkFrame);
		t.is(players[pid].armedWeapon.type, armedWeapon);
		t.is(players[pid].carriedWeapon.type, carriedWeapon);

		++playerI;
	});

	t.deepEqual(selfParam, res);
	t.is(message.getSerializator(buf), message.gameState);
});

test('playerControls message', t => {
	// All the 255 possibilities are tested
	let controls = {
		jump: 0,
		run: 0,
		crouch: 0,
		jetpack: 0,
		moveLeft: 0,
		moveRight: 0,
		changeWeapon: 0,
		shoot: 0,
	};

	for (let i = 1; i !== 256; ++i) {
		Object.keys(controls).forEach((key, j) => {
			controls[key] = i << 31 - j >>> 31;
		});

		let buf = message.playerControls.serialize(controls),
			res = message.playerControls.deserialize(buf);
		t.deepEqual(res, controls);
		t.is(message.getSerializator(buf), message.playerControls);
	}
});

test('aimAngle message', t => {
	for(let angle of [0, Math.PI * 2, Math.PI * 0.487, Math.PI * 1.456, Math.PI]) {
		let buf = message.aimAngle.serialize(angle),
			res = message.aimAngle.deserialize(buf);

		t.is(approxAngle(res), approxAngle(angle));
	}
});


let chatMsgs = [
	'Hi! What\'s up?',
	'Nuthin',
	'Did you know Getkey dislikes emojis?',
	'But it has to be tested, eh?',
	'Here are some poop emojis: 💩💩💩',
	'Happy now?',
	'( ͡° ͜ʖ ͡°)',
	'自動翻訳は素晴らしいです',
	'האלפבית העברי הוא הכי המגניב שיש. ברצינות זה נראה מפואר כמו לזיין.',
	'Fju ist Deutsch also ich wurde einige Ümläüt schreiben. äëüöÄËÜÖööööööööööö',
	'En français on utilise des accents. Et en plus là je suis sûr qu\'il n\'y a pas de faute grammaticale.',
	'By the way, did you know accents can be used in english as well? You are now much more learnèd!'
];

test('chat message', t => {
	for (let chatMsg of chatMsgs) {
		let buf = message.chat.serialize(chatMsg),
			res = message.chat.deserialize(buf);

		t.is(chatMsg, res);
		t.is(message.getSerializator(buf), message.chat);
	}
});

test('chatBroadcast message', t => {
	let i = 0;
	for (let chatMsg of chatMsgs) {
		let buf = message.chatBroadcast.serialize(i, chatMsg),
			res = message.chatBroadcast.deserialize(buf);

		t.is(i, res.id);
		t.is(chatMsg, res.message);
		t.is(message.getSerializator(buf), message.chatBroadcast);

		++i;
	}
});

test('scores message', t => {
	let scoresObj = {
			'alienBeige': 123,
			'alienGreen': -32, // booo
			'alienPink': 345
		},
		enabledTeams = Object.keys(scoresObj),
		buf = message.scores.serialize(scoresObj),
		res = message.scores.deserialize(buf, enabledTeams);

	t.deepEqual(res, scoresObj);
	t.is(message.getSerializator(buf), message.scores);
});

test('serverRegistered message', t => {
	let buf = message.serverRegistered.serialize();
	t.is(message.getSerializator(buf), message.serverRegistered);
});
