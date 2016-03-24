"use strict";

var fs = require("fs"),
	http = require("http"),
	WebSocketServer = require("ws").Server,
	colors = require("colors"),
	interactive = require("./interactive.js"),
	MESSAGE = require("./static/message.js"),

	configSkeleton = {
		dev: false,
		interactive: false,
		monitor: false,
		port: 8080
	};


global.printEntry = {
	print: function(type, content) {
		if (type === undefined) return;
		let timestamp = (config !== undefined && config.dev) ? ("[" + Math.round(Date.now() / 1000).toString(16) + "]").grey : "";
		console.log(timestamp + " " + this.enumToString(type) + " " + (content || ""));
	},
	DEV: 0,
	INFO: 1,
	ERROR: 2,
	RESULT: 3,
	enumToString: function (e) {
		switch (e) {
			case 0: return "[DEV]".cyan.bold;
			case 1: return "[INFO]".yellow.bold;
			case 2: return "[ERR]".red.bold;
			case 3: return "[RESULT]".magenta.bold;
		}
		return "";
	}
};

function GameServer(url, name, mod, lobbies) {
	this.url = url;
	this.name = name;
	this.mod = mod;
	this.lobbies = lobbies;
}
var gameServers = [];

function changeCbk(newConfig, previousConfig) {
	if (newConfig.port !== previousConfig.port) {
		server.close();
		server.listen(newConfig.port);
	}
	if (newConfig.monitor !== previousConfig.monitor) {
		if (previousConfig.monitor) {
			monitor.unsetMonitorMode();
		} else {
			monitor.setMonitorMode();
		}
	}
	if (newConfig.interactive !== previousConfig.interactive) {
		if (previousConfig.interactive) interactive.close();
		else interactive.open();
	}
}
var config = require("./config.js")(process.argv[2] || "./master_config.json", configSkeleton, changeCbk);

/*var monitor = require("./monitor.js")(config);
if(config.monitor) monitor.setMonitorMode();*/

if (config.interactive) interactive.open();

var files = {
	"/engine.js": fs.readFileSync("./mods/capture/engine.js")//the default engine is not under `./static` because it is part of a mod
};
files["/engine.js"].mtime = fs.statSync("./mods/capture/engine.js").mtime;
files.construct = function(path, oName) {
	fs.readdirSync(path).forEach(function(pPath) {
		var cPath = path + "/" + pPath,
			stat = fs.statSync(cPath);
		if(stat.isDirectory()) {//WE NEED TO GO DEEPER
			files.construct(cPath, oName + pPath + "/");
		} else {
			files[oName + pPath] = fs.readFileSync(cPath);
			files[oName + pPath].mtime = stat.mtime;
		}
	});
};
files.construct("./static", "/");//load everything under `./static` in RAM for fast access

//send static files
var server = http.createServer(function (req, res) {
	var gameSrvLobby = /^\/([^\/]+)\/([0-9a-f]+)\/$/.exec(req.url);
	if (req.url === "/") req.url = "/index.html";
	else if (gameSrvLobby !== null) {
		//find lobby in lobby-list
		if (/* server is not found */ false) res.end("This server doesn't exist (anymore)!\n");//TODO: display index.html with a pop-up showing this explanation instead
		if (/* lobby is not found */ false) res.end("This lobby doesn't exist (anymore)!\n");
		else req.url = "/index.html";
	}

	if (files[req.url] !== undefined) {
		res.setHeader("Cache-Control", "public, no-cache, must-revalidate, proxy-revalidate");
		if (config.dev) {
			try {
				var path = "./static" + req.url,
					mtime = fs.statSync(path).mtime;
				if (mtime.getTime() !== files[req.url].mtime.getTime()) {
					files[req.url] = fs.readFileSync(path);
					files[req.url].mtime = mtime;
				}
			} catch(e) {/*Do nothing*/}
		}
		if (req.headers["if-modified-since"] !== undefined && new Date(req.headers["if-modified-since"]).toUTCString() === files[req.url].mtime.toUTCString()) {
			res.writeHead(304);
			res.end();
		} else {
			let mime;
			switch(req.url.slice(req.url.lastIndexOf(".") - req.url.length + 1)) {//extension
				case "html":
					mime = "text/html";
					break;
				case "css":
					mime = "text/css";
					break;
				case "svg":
					mime = "image/svg+xml";
					break;
				case "png":
					mime = "image/png";
					break;
				case "js":
					mime = "application/javascript";
					break;
				case "ogg":
					mime = "audio/ogg";
					break;
				default:
					mime = "application/octet-stream";
			}
			res.setHeader("Content-Type", mime);
			res.setHeader("Last-Modified", files[req.url].mtime.toUTCString());
			res.writeHead(200);
			res.end(files[req.url]);
			console.log(res);
		}
	} else {
		res.writeHead(404);
		res.end("Error 404:\nPage not found\n");
	}
});
server.listen(config.port);


var wss = new WebSocketServer({server: server});

wss.on("connection", function(ws) {
	ws.on("message", function(message, flags) {
		let state = new Uint8Array(message, 0, 1)[0];
		if (config.monitor) monitor.getTraffic().beingConstructed.in += message.byteLength;
		if (config.dev) printEntry.print(printEntry.DEV, (MESSAGE.toString(state)).italic);

		switch (state) {
			case MESSAGE.REGISTER_SERVER.value:
				let data = MESSAGE.REGISTER_SERVER.deserialize(message);
				gameServers.push(new GameServer("fake url"), data.serverName, data.modName, data.lobbyList);
				break;
			case MESSAGE.REGISTER_LOBBIES.value:
				break;
			case MESSAGE.UNREGISTER_LOBBIES.value:
				break;
		}
	});

	ws.on("close", function() {
	});
});
