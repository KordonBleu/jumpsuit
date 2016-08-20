import test from "ava";

import "../proto_mut.js";

import { default as Planet } from "../mods/capture/planet.js"
import { default as Enemy } from "../mods/capture/enemy.js"
import { default as Shot } from "../mods/capture/shot.js"
import { default as Player } from "../mods/capture/player.js"
import * as message from "../static/message.js";
import * as vinage from "vinage";


test("REGISTER_SERVER", t => {
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


test.skip("ADD_SERVERS", t => {
	let serverList = [{
			ip: "2001:0db8:0000:85a3:0000:0000:ac1f:8001",
			name: "server name",
			mod: "mod name",
			port: 7483,
			secure: true
		},
		{
			ip: "2001:610:240:22::c100:68b",
			name: "The Circlejerk",
			mod: "biscuit",
			port: 31415,
			secure: false
		},
		{
			ip: "2001:0db8:0000:0000:0000:ff00:0042:8329",
			name: "Deutsche Qualität",
			mod: "caractères accentués",
			port: 7483,
			secure: true
		}];

	let buf1 = message.ADD_SERVERS.serialize(serverList);
	let res1 = message.ADD_SERVERS.deserialize(buf1);
});

test("REMOVE_SERVERS", t => {
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

test("SET_PREFERENCES", t => {
	let settings = {
		name: "Unnamed Player",
		primary: "Lmg",
		secondary: "Knife"
	},
		buf = message.SET_PREFERENCES.serialize(settings),
		res = message.SET_PREFERENCES.deserialize(buf);

	t.deepEqual(settings, res);
});

test("SET_NAME_BROADCAST", t => {
	let val = {
		id: 5,
		name: "Jean-Kévin",
		homographId: 2
	},
		buf = message.SET_NAME_BROADCAST.serialize(val.id, val.name, val.homographId),
		res = message.SET_NAME_BROADCAST.deserialize(buf);

	t.deepEqual(val, res);
});

test("CONNECT", t => {
	let buf = message.CONNECT.serialize(45, {
		name: "កែវ",
		primary: "Lmg",
		secondary: "Knife"
	}),
		res = message.CONNECT.deserialize(buf);

	t.is(res.lobbyId, 45);
	t.is(res.primary, "Lmg");
	t.is(res.secondary, "Knife");
	t.is(res.name, "កែវ");
});

test("ERROR", t => {
	let buf1 = message.ERROR.serialize(message.ERROR.NO_LOBBY),
		res1 = message.ERROR.deserialize(buf1),
		buf2 = message.ERROR.serialize(message.ERROR.NO_SLOT),
		res2 = message.ERROR.deserialize(buf2);

	t.is(res1, message.ERROR.NO_LOBBY);
	t.is(res2, message.ERROR.NO_SLOT);
});

test("CONNECT_ACCEPTED", t => {
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

test("LOBBY_STATE", t => {
	let teams = [
		"alienBeige",
		"alienBlue",
		"alienGreen",
		"alienPink",
		"alienYellow"
	],
		buf = message.LOBBY_STATE.serialize(message.LOBBY_STATE.LOBBY_STATES.WARMUP, teams),
		res = message.LOBBY_STATE.deserialize(buf);

	t.deepEqual(teams, res.enabledTeams);
	t.is(res.state, "WARMUP");
});

var planets = [
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
		new Player("Charles", "alienBlue", "_hurt", -1, true, 358, 45, "Knife", "Smg", 0.3*Math.PI),
		new Player("Lucette", "alienPink", "_stand", -1, false, 27, 0, "Lmg", "Shotgun", 1.1*Math.PI)
	];

planets[0].progress.team = "alienBlue";
planets[1].progress.team = "alienPink";
planets[1].progress.value = 33;

players[0].box = new vinage.Rectangle(new vinage.Point(12, 444), 55, 92, 1.5*Math.PI);
players[1].box = new vinage.Rectangle(new vinage.Point(98, 342), 58, 102);
players[1].looksLeft = true;
players[0].pid = 0;
players[1].pid = 1;
players[0].looksLeft = true;
players[1].looksLeft = false;
players[0].homographId = 0;
players[1].homographId = 0;

enemies[0].box.angle = 0.321;
enemies[2].box.angle = Math.PI;

var teams = ["alienBlue", "alienGreen", "alienYellow"];

function approxAngle(angle) {
	return Math.floor(angle*10);
}


test("ADD_ENTITY", t => {
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
		t.is(players[playerI].walkFrame, "_" + walkFrame);
		t.is(players[playerI].name, name);
		t.is(players[playerI].homographId, homographId);
		t.is(players[playerI].armedWeapon.constructor.name, armedWeapon, "player[" + playerI + "]");
		t.is(players[playerI].carriedWeapon.constructor.name, carriedWeapon, "player[" + playerI + "]");

		++playerI;
	});
});


test("GAME_STATE", t => {
	let buf = message.GAME_STATE.serialize(8, 400, planets, enemies, players),
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
		t.is(players[pid].armedWeapon.constructor.name, armedWeapon);
		t.is(players[pid].carriedWeapon.constructor.name, carriedWeapon);

		++playerI;
	});
});
