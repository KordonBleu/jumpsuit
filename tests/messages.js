//load this file in Node's command prompt by typing .load tests/messages.js

delete require.cache[require.resolve("../static/engine.js")];
var engine = require("../static/engine.js");

delete require.cache[require.resolve("../static/message.js")];
var message = require("../static/message.js");

delete require.cache[require.resolve("../static/vinage/vinage.js")];
var vinage = require("../static/vinage/vinage.js");


var planets = [
		new engine.Planet(12, 434, 23),
		new engine.Planet(654, 12, 38),
		new engine.Planet(43, 487, 76),
	],
	enemies = [
		new engine.Enemy(38, 98),
		new engine.Enemy(555, 543),
		new engine.Enemy(42, 243)
	],
	shots = [
		{box: new vinage.Rectangle(new vinage.Point(44, 87), 30, 30, 0.5), lt: 200},
		{box: new vinage.Rectangle(new vinage.Point(44, 87), 30, 30, 0.5), lt: 200}
	],
	players = [
		new engine.Player("Charles"),
		new engine.Player("Lucette"),
		,
		,
	];
players[0].box = new vinage.Rectangle(new vinage.Point(12, 444), 55, 92);
players[1].box = new vinage.Rectangle(new vinage.Point(98, 342), 58, 102);
players[0].fuel = 255;
players[0].jetpack = true;
players[1].looksLeft = true;

var teams = ["alienBlue", "alienGreen", "alienYellow"];

/* ADD_ENTITY */
var buf1 = message.ADD_ENTITY.serialize(planets, enemies, shots, players);

var res1 = message.ADD_ENTITY.deserialize(buf1);


/* CONNECT_ACCEPTED */
var buf2 = message.CONNECT_ACCEPTED.serialize(10, 6400, 6400, planets, enemies, shots, players, teams);

var res2 = message.CONNECT_ACCEPTED.deserialize(buf2);
