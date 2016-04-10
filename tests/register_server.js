delete require.cache[require.resolve("../static/message.js")];
var message = require("../static/message.js");

var buf1 = message.REGISTER_SERVER.serialize(true, 7483, "server name", "mod name");
var res1 = message.REGISTER_SERVER.deserialize(buf1);

var buf2 = message.REGISTER_SERVER.serialize(false, 328, "The Circlejerk", "biscuit");
var res2 = message.REGISTER_SERVER.deserialize(buf2);
