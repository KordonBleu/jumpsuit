"use strict";

var fs = require("fs"),
	http = require("http"),
	WebSocketServer = require("ws").Server,
	colors = require("colors"),
	interactive = require("./interactive.js"),
	MESSAGE = require("./static/message.js"),
	logger = require("./logger.js"),
	ipaddr = require("ipaddr.js"),

	configSkeleton = {
		dev: false,
		interactive: false,
		ipv4_provider: "https://icanhazip.com/",
		ipv6_provider: "https://ipv6.icanhazip.com/",
		monitor: false,
		port: 80,
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
	return ipPicker(this.ip, clientIp);
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
var config = require("./config.js")(process.argv[2] || "./master_config.json", configSkeleton, changeCbk),
	ipPicker = require("./ip_picker.js")(config);


/*var monitor = require("./monitor.js")(config);
if(config.monitor) monitor.setMonitorMode();*/

if (config.interactive) interactive.open();

var files = {
	"/engine.js": fs.readFileSync("./mods/capture/engine.js"),//the default engine is not under `./static` because it is part of a mod
	"/ipaddr.min.js": fs.readFileSync("./node_modules/ipaddr.js/ipaddr.min.js"),
	"/vinage.js": fs.readFileSync("./node_modules/vinage/vinage.js")
};
files["/engine.js"].mtime = fs.statSync("./mods/capture/engine.js").mtime;
files["/ipaddr.min.js"].mtime = fs.statSync("./node_modules/ipaddr.js/ipaddr.min.js").mtime;
files["/vinage.js"].mtime = fs.statSync("./node_modules/vinage/vinage.js").mtime;
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

var server = http.createServer(function (req, res) {
	if (req.url === "/index.html") {
		res.writeHead(301, {"Location": "/"});
		res.end();
		return;
	} //beautifying URL, shows foo.bar when requested foo.bar/index.html

	if (req.url === "/") req.url = "/index.html";
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
			let mimeList = {html: "text/html", css: "text/css", svg: "image/svg+xml", png: "image/png", js: "application/javascript", ogg: "audio/ogg", opus: "audio/ogg"},
				extension = req.url.slice(req.url.lastIndexOf(".") - req.url.length + 1),
				mime = extension in mimeList ? mimeList[extension] : "application/octet-stream";

			res.writeHead(200, {"Content-Type": mime, "Last-Modified": files[req.url].mtime.toUTCString()});
			res.end(files[req.url]);
		}
	} else {
		res.writeHead(404);
		res.end("Error 404:\nPage not found\n");
	}
});
server.listen(config.port);


var gameServerSocket = new WebSocketServer({server: server, path: "/game_servers"}),
	clientsSocket = new WebSocketServer({server: server, path: "/clients"}),
	wsOptions = { binary: true, mask: false };

gameServerSocket.on("connection", function(ws) {
	var gameServer;
	ws.on("message", function(message, flags) {
		message = message.buffer.slice(message.byteOffset, message.byteOffset + message.byteLength);//convert Buffer to ArrayBuffer
		let state = new Uint8Array(message, 0, 1)[0];

		if (config.monitor) monitor.getTraffic().beingConstructed.in += message.byteLength;
		logger(logger.DEV, (MESSAGE.toString(state)).italic);

		switch (state) {
			case MESSAGE.REGISTER_SERVER.value:
				let data = MESSAGE.REGISTER_SERVER.deserialize(message);
				gameServer = new GameServer(data.serverName, data.modName, data.secure, data.serverPort, ipaddr.parse(ws._socket.remoteAddress));
				gameServer.pingIntervalId = setInterval(function() {
					try {
						ws.ping();
					} catch (err) {/* Do nothing */}

				}, 20000);
				gameServers.push(gameServer);

				logger(logger.INFO, "Registered \"" + gameServer.mod + "\" server \"" + gameServer.name + "\" @ " + gameServer.ip + ":" + gameServer.port);
				clientsSocket.clients.forEach(function(client) {//broadcast
					try {
						MESSAGE.ADD_SERVERS.serialize([gameServer], client.ipAddr).then(function(buf) {
							client.send(buf, wsOptions);
						});
					} catch (err) {/* Do nothing */}
				});
				break;
		}
	});

	ws.on("close", function() {
		gameServers.forEach(function(gS, i) {
			if (gameServer = gS) {
				clearInterval(gameServer.pingIntervalId);
				gameServers.splice(i, 1);
				logger(logger.INFO, "Unregistered \"" + gS.mod + "\" server \"" + gS.name + "\" @ " + gS.ip + ":" + gS.port);
				clientsSocket.clients.forEach(function(client) {//broadcast
					try {
						client.send(MESSAGE.REMOVE_SERVERS.serialize([i]), wsOptions);
					} catch (err) {/* Do nothing */}
				});
			}
		});
	});
});

clientsSocket.on("connection", function(ws) {
	ws.ipAddr = ipaddr.parse(ws.upgradeReq.headers['x-forwarded-for'] || ws._socket.remoteAddress);
	if (ws.ipAddr.kind() === "ipv4") ws.ipAddr = ws.ipAddr.toIPv4MappedAddress();

	try {
		MESSAGE.ADD_SERVERS.serialize(gameServers, ws.ipAddr).then(function(buf) {
			ws.send(buf, wsOptions);
		});
	} catch (err) {/* Do nothing */}
});
