delete require.cache[require.resolve("../static/message.js")];
var message = require("../static/message.js");

var serverList = [{
		name: "server name",
		mod: "mod name"
	},
	{
		name: "The Circlejerk",
		mod: "biscuit"
	},
	{
		name: "Deutsche Qualität",
		mod: "caractères accentués"
	}];

var buf1 = message.ADD_SERVERS.serialize(serverList);
var res1 = message.ADD_SERVERS.deserialize(buf1);
