delete require.cache[require.resolve("../static/message.js")];
var message = require("../static/message.js");

var buf1 = message.RESOLVE.serialize(123);
var res1 = message.RESOLVE.deserialize(buf1);
