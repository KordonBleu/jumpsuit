delete require.cache[require.resolve("../static/message.js")];
var message = require("../static/message.js");

var buf1 = message.RESOLVED.serialize(4, true, 7483, "::ffff:192.0.2.128");
var res1 = message.RESOLVED.deserialize(buf1);

var buf2 = message.RESOLVED.serialize(6, false, 7982, "2001:0db8:85a3:0000:0000:8a2e:0370:7334");
var res2 = message.RESOLVED.deserialize(buf2);
