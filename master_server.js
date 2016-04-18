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
		port: 80
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

function GameServer(name, mod, secure, port, ip) {
	this.name = name;
	this.mod = mod;

	this.secure = secure;
	this.port = port;
	this.ip = ip;
}
GameServer.prototype.getUrl = function() {
	return (this.secure ? "wss://[" : "ws://[") + this.ip + "]:" + this.port;
};
GameServer.prototype.effectiveIp = function(clientIp) {
	console.log(clientIp);
	var ipaddr = require('ipaddr.js');
	return ipPicker(ipaddr.parse(this.ip), clientIp);
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
	"/engine.js": fs.readFileSync("./mods/capture/engine.js"),//the default engine is not under `./static` because it is part of a mod
	"/ipaddr.min.js": fs.readFileSync("./node_modules/ipaddr.js/ipaddr.min.js")
};
files["/engine.js"].mtime = fs.statSync("./mods/capture/engine.js").mtime;
files["/ipaddr.min.js"].mtime = fs.statSync("./node_modules/ipaddr.js/ipaddr.min.js").mtime;
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
	var gameSrv = /^\/wss?:\/\/(.+:\d+)\/.+$/.exec(req.url);
	if (req.url === "/") req.url = "/index.html";
	else if (gameSrv !== null) {
		if (!gameServers.some(function(server) {
			console.log(server.url, gameSrv[1]);
			return server.url === "ws://" + gameSrv[1];
		})) res.end("This server doesn't exist (anymore)!\n");//TODO: display index.html with a pop-up showing this explanation instead
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
				case "ogg"://vorbis in ogg
				case "opus"://opus in ogg
					mime = "audio/ogg";
					break;
				default:
					mime = "application/octet-stream";
			}
			res.setHeader("Content-Type", mime);
			res.setHeader("Last-Modified", files[req.url].mtime.toUTCString());
			res.writeHead(200);
			res.end(files[req.url]);
		}
	} else {
		res.writeHead(404);
		res.end("Error 404:\nPage not found\n");
	}
});
var ipPicker = require("./ip_picker.js")(function() {
	server.listen(config.port);
});


var gameServerSocket = new WebSocketServer({server: server, path: "/game_servers"}),
	clientsSocket = new WebSocketServer({server: server, path: "/clients"}),
	wsOptions = { binary: true, mask: false };

gameServerSocket.on("connection", function(ws) {
	var gameServer;
	ws.on("message", function(message, flags) {
		message = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);//convert Buffer to ArrayBuffer
		let state = new Uint8Array(message, 0, 1)[0];

		if (config.monitor) monitor.getTraffic().beingConstructed.in += message.byteLength;
		if (config.dev) printEntry.print(printEntry.DEV, (MESSAGE.toString(state)).italic);

		switch (state) {
			case MESSAGE.REGISTER_SERVER.value:
				let data = MESSAGE.REGISTER_SERVER.deserialize(message);
				gameServer = new GameServer(data.serverName, data.modName, data.secure, data.serverPort, ws._socket.remoteAddress);
				gameServers.push(gameServer);
				printEntry.print(printEntry.INFO, "Registered \"" + gameServer.mod + "\" server \"" + gameServer.name + "\" @ " + gameServer.ip + ":" + gameServer.port);
				clientsSocket.clients.forEach(function(client) {//broadcast
					let newGameServerBuf = MESSAGE.ADD_SERVERS.serialize([gameServer], client.ws._socket.remoteAddress);
					client.send(newGameServerBuf, wsOptions);
				});
				break;
		}
	});

	ws.on("close", function() {
		gameServers.forEach(function(gS, i) {
			if (gameServer = gS) {
				gameServers.splice(i, 1);
				clientsSocket.clients.forEach(function(client) {//broadcast
					client.send(MESSAGE.REMOVE_SERVERS.serialize([i]), wsOptions);
				});
			}
		});
	});
});

clientsSocket.on("connection", function(ws) {
	//console.log("client addr", ws.upgradeReq.headers['x-forwarded-for'] || ws.upgradeReq.connection.remoteAddress);
	ws.send(MESSAGE.ADD_SERVERS.serialize(gameServers, ws.upgradeReq.headers['x-forwarded-for'] || ws._socket.remoteAddress), wsOptions);

	ws.on("message", function(message, flags) {
		message = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);//convert Buffer to ArrayBuffer

		let state = new Uint8Array(message, 0, 1)[0];

		if (config.monitor) monitor.getTraffic().beingConstructed.in += message.byteLength;
		if (config.dev) printEntry.print(printEntry.DEV, (MESSAGE.toString(state)).italic);

		if (state === MESSAGE.RESOLVE.value) {
			let id = MESSAGE.RESOLVE.deserialize(message);
			console.log("the magic happens");
			ws.send(MESSAGE.RESOLVED.serialize(id, gameServers[id].secure, gameServers[id].port, gameServers[id].ip), wsOptions);
		}
	});

});