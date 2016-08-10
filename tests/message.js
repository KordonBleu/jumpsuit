import test from "ava";

import "../proto_mut.js";

import * as engine from "../mods/capture/engine.js";
import * as message from "../static/message.js";
import * as vinage from "vinage";

var planets = [
		new engine.Planet(12, 434, 23),
		new engine.Planet(654, 12, 38),
		new engine.Planet(43, 487, 76)
	],
	enemies = [
		new engine.Enemy(38, 98),
		new engine.Enemy(555, 543),
		new engine.Enemy(42, 243)
	],
	shots = [
		new engine.Shot(44, 87, 0.5*Math.PI, -1, 3),
		new engine.Shot(44, 87, 0.75*Math.PI, 0, 1)
	],
	players = [
		new engine.Player("Charles", "alienBlue", "_hurt", -1, true, 358, 45, "knife", "smg", 0.3*Math.PI),
		new engine.Player("Lucette", "alienPink", "_stand", -1, false, 27, 0, "lmg", "shotgun", 1.1*Math.PI)
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
		t.is(Math.floor(shots[shotI].box.angle*10), Math.floor(angle*10)); // there is some imprecision due to brads
		t.is(shots[shotI].origin === -1 ? 255 : shots[shotI].origin, origin); // -1 when originating from enemies, which is 255 when wrapped
		t.is(shots[shotI].type, type);

		++shotI;
	}, (pid, x, y, attachedPlanet, angle, looksLeft, jetpack, appearance, walkFrame, name, homographId, armedWeapon, carriedWeapon) => {
		t.is(players[playerI].pid, pid);
		t.is(players[playerI].box.center.x, x);
		t.is(players[playerI].box.center.y, y);
		t.is(players[playerI].attachedPlanet === -1 ? 255 : players[playerI].attachedPlanet, attachedPlanet); // -1 when in space, which is 255 when wrapped
		t.is(Math.floor(players[playerI].box.angle*10), Math.floor(angle*10)); // there is some imprecision due to brads
		t.is(players[playerI].looksLeft, looksLeft);
		t.is(players[playerI].jetpack, jetpack);
		t.is(players[playerI].appearance, appearance);
		t.is(players[playerI].walkFrame, "_" + walkFrame);
		t.is(players[playerI].name, name);
		t.is(players[playerI].homographId, homographId);
		t.is(players[playerI].weaponry.armed, armedWeapon, "player[" + playerI + "]");
		t.is(players[playerI].weaponry.carrying, carriedWeapon, "player[" + playerI + "]");

		++playerI;
	});
});


test("CONNECT_ACCEPTED", t => {
	let xpectd_res = {
		lobbyId: 989043,
		playerId: 24,
		univWidth: 3429,
		univHeight: 4452
	},
		buf = message.CONNECT_ACCEPTED.serialize(xpectd_res.lobbyId, xpectd_res.playerId, xpectd_res.univWidth, xpectd_res.univHeight);

	t.deepEqual(xpectd_res, message.CONNECT_ACCEPTED.deserialize(buf));
});


test.skip("GAME_STATE", t => {
	function printArgs() {
		console.log(arguments);
	}

	let buf = message.GAME_STATE.serialize(8, 400, planets, enemies, shots, players);
	let res = message.GAME_STATE.deserialize(buf3, planets.length, enemies.length, shots.length, players.length, printArgs, printArgs, printArgs, printArgs);
});

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
