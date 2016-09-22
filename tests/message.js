import test from 'ava';

import '../server/proto_mut.js';

import Planet from '../shared/planet.js';
import Enemy from '../shared/enemy.js';
import Shot from '../shared/shot.js';
import Player from '../shared/player.js';

import message from '../shared/message.js';

import * as vinage from 'vinage';
import ipaddr from 'ipaddr.js';


test('REGISTER_SERVER', t => {
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
	let buf1 = message.REGISTER_SERVER.serialize(a.secure, a.serverPort, a.serverName, a.modName);
	let res1 = message.REGISTER_SERVER.deserialize(buf1);
	t.deepEqual(a, res1);

	let buf2 = message.REGISTER_SERVER.serialize(b.secure, b.serverPort, b.serverName, b.modName);
	let res2 = message.REGISTER_SERVER.deserialize(buf2);
	t.deepEqual(b, res2);
});


test('ADD_SERVERS', t => {
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

	let buf1 = message.ADD_SERVERS.serialize(serverList, ipList);
	let res1 = message.ADD_SERVERS.deserialize(buf1);

	serverList.forEach((srv, i) => {
		t.is(srv.name, res1[i].name);
		t.is(srv.mod, res1[i].mod);
		t.is(srv.port, res1[i].port);
		t.is(srv.secure, res1[i].secure);
		t.is(ipList[i].toString(), res1[i].ipv6.toString());
	});
});

test('REMOVE_SERVERS', t => {
	let ids1 = [1, 45, 65535, 5, 899],
		buf1 = message.REMOVE_SERVERS.serialize(ids1),
		res1 = message.REMOVE_SERVERS.deserialize(buf1);
	t.deepEqual(ids1, res1);

	let ids2 = [],
		buf2 = message.REMOVE_SERVERS.serialize(ids2),
		res2 = message.REMOVE_SERVERS.deserialize(buf2);
	t.deepEqual(ids2, res2);

	let ids3 = [99],
		buf3 = message.REMOVE_SERVERS.serialize(ids3),
		res3 = message.REMOVE_SERVERS.deserialize(buf3);
	t.deepEqual(ids3, res3);
});

test('SET_PREFERENCES', t => {
	let settings = {
			name: 'Unnamed Player',
			primary: 'Lmg',
			secondary: 'Knife'
		},
		buf = message.SET_PREFERENCES.serialize(settings),
		res = message.SET_PREFERENCES.deserialize(buf);

	t.deepEqual(settings, res);
});

test('SET_NAME_BROADCAST', t => {
	let val = {
			id: 5,
			name: 'Jean-Kévin',
			homographId: 2
		},
		buf = message.SET_NAME_BROADCAST.serialize(val.id, val.name, val.homographId),
		res = message.SET_NAME_BROADCAST.deserialize(buf);

	t.deepEqual(val, res);
});

test('CONNECT', t => {
	let buf = message.CONNECT.serialize(45, {
			name: 'កែវ',
			primary: 'Lmg',
			secondary: 'Knife'
		}),
		res = message.CONNECT.deserialize(buf);

	t.is(res.lobbyId, 45);
	t.is(res.primary, 'Lmg');
	t.is(res.secondary, 'Knife');
	t.is(res.name, 'កែវ');
});

test('ERROR', t => {
	let buf1 = message.ERROR.serialize(message.ERROR.NO_LOBBY),
		res1 = message.ERROR.deserialize(buf1),
		buf2 = message.ERROR.serialize(message.ERROR.NO_SLOT),
		res2 = message.ERROR.deserialize(buf2);

	t.is(res1, message.ERROR.NO_LOBBY);
	t.is(res2, message.ERROR.NO_SLOT);
});

test('CONNECT_ACCEPTED', t => {
	let val =  {
			lobbyId: 4000000000, // 32 bits
			playerId: 244, // 8bits
			univWidth: 65535, // 16 bits
			univHeight: 30000 // 16 bits
		},
		buf = message.CONNECT_ACCEPTED.serialize(val.lobbyId, val.playerId, val.univWidth, val.univHeight),
		res = message.CONNECT_ACCEPTED.deserialize(buf);

	t.deepEqual(val, res);

	let val2 = {
			lobbyId: 989043,
			playerId: 24,
			univWidth: 3429,
			univHeight: 4452
		},
		buf2 = message.CONNECT_ACCEPTED.serialize(val2.lobbyId, val2.playerId, val2.univWidth, val2.univHeight);

	t.deepEqual(val2, message.CONNECT_ACCEPTED.deserialize(buf2));
});

test('LOBBY_STATE', t => {
	let teams = [
			'alienBeige',
			'alienBlue',
			'alienGreen',
			'alienPink',
			'alienYellow'
		],
		buf = message.LOBBY_STATE.serialize('warmup', teams),
		res = message.LOBBY_STATE.deserialize(buf);

	t.deepEqual(teams, res.enabledTeams);
	t.is(res.state, 'warmup');
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


test('ADD_ENTITY', t => {
	let buf = message.ADD_ENTITY.serialize(planets, enemies, shots, players),
		planetI = 0,
		enemyI = 0,
		shotI = 0,
		playerI = 0;

	message.ADD_ENTITY.deserialize(buf, (x, y, radius, type) => {
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
});


test('GAME_STATE', t => {
	let selfParam = {
			yourHealth: 8,
			yourFuel: 40
		},
		buf = message.GAME_STATE.serialize(selfParam.yourHealth, selfParam.yourFuel, planets, enemies, players),
		planetI = 0,
		enemyI = 0,
		playerI = 0;
	let res = message.GAME_STATE.deserialize(buf, planets.length, enemies.length, (id, ownedBy, progress) => {
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
});

test('PLAYER_CONTROLS', t => {
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

		let buf = message.PLAYER_CONTROLS.serialize(controls),
			res = message.PLAYER_CONTROLS.deserialize(buf);
		t.deepEqual(res, controls);
	}
});

test('AIM_ANGLE', t => {
	for(let angle of [0, Math.PI * 2, Math.PI * 0.487, Math.PI * 1.456, Math.PI]) {
		let buf = message.AIM_ANGLE.serialize(angle),
			res = message.AIM_ANGLE.deserialize(buf);

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

test('CHAT', t => {
	for (let chatMsg of chatMsgs) {
		let buf = message.CHAT.serialize(chatMsg),
			res = message.CHAT.deserialize(buf);

		t.is(chatMsg, res);
	}
});

test('CHAT_BROADCAST', t => {
	let i = 0;
	for (let chatMsg of chatMsgs) {
		let buf = message.CHAT_BROADCAST.serialize(i, chatMsg),
			res = message.CHAT_BROADCAST.deserialize(buf);

		t.is(i, res.id);
		t.is(chatMsg, res.message);

		++i;
	}
});

test('SCORES', t => {
	let scoresObj = {
			'alienBeige': 123,
			'alienGreen': -32, // booo
			'alienPink': 345
		},
		enabledTeams = Object.keys(scoresObj),
		buf = message.SCORES.serialize(scoresObj),
		res = message.SCORES.deserialize(buf, enabledTeams);

	t.deepEqual(res, scoresObj);
});
