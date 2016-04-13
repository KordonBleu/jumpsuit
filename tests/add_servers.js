delete require.cache[require.resolve("../static/message.js")];
var message = require("../static/message.js");

var serverList = [{
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

var buf1 = message.ADD_SERVERS.serialize(serverList);
var res1 = message.ADD_SERVERS.deserialize(buf1);
