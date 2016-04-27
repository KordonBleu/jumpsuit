//load this file in Node's command prompt by typing .load tests/messages.js

delete require.cache[require.resolve("../mods/capture/engine.js")];
var engine = require("../mods/capture/engine.js");

delete require.cache[require.resolve("../static/message.js")];
var message = require("../static/message.js");

delete require.cache[require.resolve("vinage")];
var vinage = require("vinage");

function printArgs() {
	console.log(arguments);
}

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
		new engine.Shot(44, 87, 0.5*Math.PI),
		new engine.Shot(44, 87, 0.75*Math.PI)
	],
	players = [
		new engine.Player("Charles", "alienBlue", "_hurt", -1, true, 358),
		new engine.Player("Lucette", "alienPink", "_stand", -1, false, 27)
	];

planets[0].progress.team = "alienBlue";
planets[1].progress.team = "alienPink";
planets[1].progress.value = 33;

players[0].box = new vinage.Rectangle(new vinage.Point(12, 444), 55, 92, 1.5*Math.PI);
players[1].box = new vinage.Rectangle(new vinage.Point(98, 342), 58, 102);
players[1].looksLeft = true;

enemies[0].box.angle = 0.321;
enemies[2].box.angle = Math.PI;

var teams = ["alienBlue", "alienGreen", "alienYellow"];

/* ADD_ENTITY */
var buf1 = message.ADD_ENTITY.serialize(planets, enemies, shots, players);

var res1 = message.ADD_ENTITY.deserialize(buf1, printArgs, printArgs, printArgs, printArgs);


/* CONNECT_ACCEPTED */
var buf2 = message.CONNECT_ACCEPTED.serialize(0, 0, 10, 6400, 6400, planets, enemies, shots, players, teams);

var res2 = message.CONNECT_ACCEPTED.deserialize(buf2, printArgs, printArgs, printArgs, printArgs);

/* GAME_STATE */
var buf3 = message.GAME_STATE.serialize(8, 400, planets, enemies, shots, players);
var res3 = message.GAME_STATE.deserialize(buf3, planets.length, enemies.length, shots.length, players.length, printArgs, printArgs, printArgs, printArgs);
