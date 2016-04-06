delete require.cache[require.resolve("../mods/capture/engine.js")];
var engine = require("../mods/capture/engine.js");

delete require.cache[require.resolve("../static/message.js")];
var message = require("../static/message.js");

delete require.cache[require.resolve("../lobby.js")];
var Lobby = require("../lobby.js")(engine);

var lobbies = [new Lobby("placeholder name1", 8, 0),
	new Lobby("placeholder name2", 10, 0),
	new Lobby("placeholder name3", 3, 0),
	new Lobby("placeholder name4", 9, 0)
];
lobbies[0].uid = 24;

var buf1 = message.REGISTER_SERVER.serialize(7483, "server name", "mod name", lobbies);
var res1 = message.REGISTER_SERVER.deserialize(buf1);
