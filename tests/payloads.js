import test from 'ava';

import '../server/proto_mut.js';

import * as message from '../shared/message.js';

import * as vinage from 'vinage';

function approxAngle(angle) {
	return Math.floor(angle*5);
}


let planets = [
		{
			box: {
				center: {
					x: 12,
					y: 434
				},
				radius: 23
			},
			type: 1,
			team: 'alienBlue',
			progress: 0
		},
		{
			box: {
				center: {
					x: 654,
					y: 12
				},
				radius: 38
			},
			type: 0,
			team: 'alienPink',
			progress: 33
		},
		{
			box: {
				center: {
					x: 43,
					y: 487
				},
				radius: 76
			},
			type: 1,
			team: 'alienYellow',
			progress: 100
		}
	],
	enemies = [
		{
			box: {
				center: {
					x: 38,
					y: 98
				},
				angle: 0.321
			},
			appearance: 'enemyBlack1'
		},
		{
			box: {
				center: {
					x: 555,
					y: 543
				},
				angle: Math.PI
			},
			appearance: 'enemyBlue3'
		},
		{
			box: {
				center: {
					x: 42,
					y: 243
				},
				angle: 1.432*Math.PI
			},
			appearance: 'enemyRed2'
		}
	],
	shots = [
		{
			box: {
				center: {
					x: 44,
					y: 87
				},
				angle: 0.5*Math.PI,
			},
			origin: -1,
			type: 3
		},
		{
			box: {
				center: {
					x: 44,
					y: 87
				},
				angle: 0.75*Math.PI,
			},
			origin: 0,
			type: 1
		}
	],
	players = [
		{
			box: {
				center: {
					x: 454,
					y: 80
				},
				angle: Math.PI*1.2
			},
			armedWeapon: {
				type: 'Lmg'
			},
			carriedWeapon: {
				type: 'Smg'
			},
			attachedPlanet: 39,
			pid: 0,
			looksLeft: true,
			jetpack: false,
			name: 'Charles',
			walkFrame: 'duck',
			appearance: 'alienBlue',
			homographId: 1,
			hurt: true,
			aimAngle: Math.PI*1.758
		},
		{
			box: {
				center: {
					x: 9890,
					y: 2890
				},
				angle: 0.01
			},
			armedWeapon: {
				type: 'Knife'
			},
			carriedWeapon: {
				type: 'Shotgun'
			},
			attachedPlanet: -1,
			pid: 1,
			looksLeft: false,
			jetpack: true,
			name: 'Lucette',
			walkFrame: 'stand',
			appearance: 'alienPink',
			homographId: 0,
			hurt: false,
			aimAngle: Math.PI*0.983
		}
	];



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


test('addEntity message', t => {
	let buf = message.addEntity.serialize(planets, enemies, shots, players),
		planetI = 0,
		enemyI = 0,
		shotI = 0;

	message.addEntity.deserialize(buf, (x, y, radius, type) => {
		t.is(planets[planetI].box.center.x, x);
		t.is(planets[planetI].box.center.y, y);
		t.is(planets[planetI].box.radius, radius);
		t.is(planets[planetI].type, type);

		++planetI;
	}, (id, ownedBy, progress) => {
		t.is(planets[id].team, ownedBy);
		t.is(planets[id].progress, progress);
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
		t.is(players[pid].appearance, appearance);
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
	t.is(message.getSerializator(buf), message.addEntity);
});

test('warmup message', t => {
	let params = {
		scoresObj: {
			alienBlue: 4334532,
			alienBeige: -65
		},
		lobbyId: 123456,
		playerId: 27,
		univWidth: 555,
		univHeight: 666 // oh noes
	},
		buf = message.warmup.serialize(params.scoresObj, params.lobbyId, params.playerId, params.univWidth, params.univHeight, planets, enemies, shots, players),
		planetI = 0,
		enemyI = 0,
		shotI = 0;

	let res = message.warmup.deserialize(buf, (x, y, radius, type) => {
		t.is(planets[planetI].box.center.x, x);
		t.is(planets[planetI].box.center.y, y);
		t.is(planets[planetI].box.radius, radius);
		t.is(planets[planetI].type, type);

		++planetI;
	}, (id, ownedBy, progress) => {
		t.is(planets[id].team, ownedBy);
		t.is(planets[id].progress, progress);
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
		t.is(players[pid].appearance, appearance);
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

	t.deepEqual(Object.keys(res.scoresObj).sort(), Object.keys(params.scoresObj).sort());
	t.is(res.lobbyId, params.lobbyId);
	t.is(res.playerId, params.playerId);
	t.is(res.univWidth, params.univWidth);
	t.is(res.univHeight, params.univHeight);

	t.is(message.getSerializator(buf), message.warmup);
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
		t.is(planets[planetI].team, ownedBy);
		t.is(planets[planetI].progress, progress);

		++planetI;
	}, (id, angle) => {
		t.is(id, enemyI);
		t.is(approxAngle(enemies[enemyI].box.angle), approxAngle(angle));

		++enemyI;
	}, (pid, x, y, attachedPlanet, angle, looksLeft, jetpack, hurt, walkFrame, armedWeapon, carriedWeapon, aimAngle) => {
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
		t.is(approxAngle(players[pid].aimAngle), approxAngle(aimAngle));

		++playerI;
	});

	t.deepEqual(selfParam, res);
	t.is(message.getSerializator(buf), message.gameState);
});

test('gameState message bis', t => {
	let planets = [
			{
				team: 'neutral',
				progress: 0
			},
			{
				team: 'neutral',
				progress: 0,
			},
			{
				team: 'neutral',
				progress: 0,
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
				stamina: 300,
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
		t.is(planets[planetI].team, ownedBy);
		t.is(planets[planetI].progress, progress);

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
		buf = message.scores.serialize(scoresObj),
		res = message.scores.deserialize(buf, scoresObj);

	t.deepEqual(res, scoresObj);
	t.is(message.getSerializator(buf), message.scores);
});

test('displayScores message', t => {
	let scoresObj = {
			'alienBeige': 123,
			'alienGreen': -32, // booo
			'alienPink': 345
		},
		buf = message.displayScores.serialize(scoresObj),
		res = message.displayScores.deserialize(buf);

	t.deepEqual(res, scoresObj);
	t.is(message.getSerializator(buf), message.displayScores);
});
