import * as config from './config_loader.js';
config.init(process.argv[2] || './master_config.json', {
	dev: true,
	ipv4_provider: 'https://ipv4.icanhazip.com/',
	ipv6_provider: 'https://ipv6.icanhazip.com/',
	monitor: false,
	port: 80
},
(newConfig, previousConfig) => {
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
});


import message from '../shared/message.js';
import logger from './logger.js';
import ipPicker from './ip_picker.js';
import * as monitor from './monitor.js';
import * as ips from './ips';

require('colors');
const http = require('http'),
	fs = require('fs'),
	WebSocket = require('ws'),
	ipaddr = require('ipaddr.js');

class GameServer {
	constructor(name, mod, secure, port, ip) {
		this.name = name;
		this.mod = mod;
		this.secure = secure;
		this.port = port;
		this.ip = ip;
	}
	getUrl() {
		return (this.secure ? 'wss://[' : 'ws://[') + this.ip + ']:' + this.port;
	}
	effectiveIp(clientIp) {
		return ipPicker(this.ip, clientIp);
	}
}
let gameServers = [];


if(config.config.monitor) monitor.setMonitorMode();

let files = {};
function loadFile(name, path) {
	let mimeList = {html: 'text/html', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', js: 'application/javascript', ogg: 'audio/ogg', opus: 'audio/ogg'},
		extension = path.slice(path.lastIndexOf('.') - path.length + 1);
	files[name] = {
		content: fs.readFileSync(path),
		mtime: fs.statSync(path).mtime,
		path: path,
		mime: extension in mimeList ? mimeList[extension] : 'application/octet-stream'
	};
	if (config.config.dev && (extension === 'html' || extension === 'css' || extension === 'js')) files[name].content = files[name].content.toString('utf8').replace(/https:\/\/jumpsuit\.space/g, '');
}
loadFile('/ipaddr.min.js', './node_modules/ipaddr.js/ipaddr.min.js');
loadFile('/vinage.js', './node_modules/vinage/vinage.js');

files.construct = function(path, oName) {
	fs.readdirSync(path).forEach(function(pPath) {
		let cPath = path + '/' + pPath,
			stat = fs.statSync(cPath);
		if(stat.isDirectory()) {//WE NEED TO GO DEEPER
			files.construct(cPath, oName + pPath + '/');
		} else loadFile(oName + pPath, cPath);
	});
};
files.construct('./static', '/'); // load everything under `./static` in RAM for fast access
files.construct('./mods/capture', '/'); // default engine, player class etc.

let server = http.createServer(function (req, res) {
	if (req.url === '/index.html') {
		res.writeHead(301, {'Location': '/'});
		res.end();
		return;
	} //beautifying URL, shows foo.bar when requested foo.bar/index.html (why would someone request foo.bar/index.html though?) It tends to happen... just in case, you know?

	if (req.url === '/') req.url = '/index.html';
	if (files[req.url] !== undefined) {
		res.setHeader('Cache-Control', 'public, no-cache, must-revalidate, proxy-revalidate');
		if (config.config.dev) {
			try {
				if (fs.statSync(files[req.url].path).mtime.getTime() !== files[req.url].mtime.getTime()) loadFile(req.url, files[req.url].path);
			} catch(err) {
				console.log(err);
			}
		}
		if (req.headers['if-modified-since'] !== undefined && new Date(req.headers['if-modified-since']).toUTCString() === files[req.url].mtime.toUTCString()) {
			res.writeHead(304);
			res.end();
		} else {
			res.writeHead(200, {'Content-Type': files[req.url].mime, 'Last-Modified': files[req.url].mtime.toUTCString()});
			res.end(files[req.url].content);
		}
	} else {
		res.writeHead(404);
		res.end('Error 404:\nPage not found\n');
	}
});
server.listen(config.config.port);

let gameServerSocket = new WebSocket.Server({server: server, path: '/game_servers'}),
	clientsSocket = new WebSocket.Server({server: server, path: '/clients'}),
	wsOptions = { binary: true, mask: false };

gameServerSocket.on('connection', function(ws) {
	let gameServer = new GameServer(undefined, undefined, undefined, undefined, ipaddr.parse(ws._socket.remoteAddress)),
		lastPing = 0;

	ws.on('message', function(msg) {
		if (ips.banned(gameServer.ip)) return;

		msg = msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength);//convert Buffer to ArrayBuffer
		try {
			let state = new Uint8Array(msg, 0, 1)[0];

			if (config.config.monitor) monitor.traffic.beingConstructed.in += msg.byteLength;

			if (state === message.REGISTER_SERVER.value) {
				let data = message.REGISTER_SERVER.deserialize(msg);
				gameServer.name = data.serverName;
				gameServer.mod = data.modName;
				gameServer.secure = data.secure;
				gameServer.port = data.serverPort;
				gameServer.pingIntervalId = setInterval(function() {
					try {
						ws.ping();
						lastPing = Date.now();
					} catch (err) {/* Do nothing */}
				}, 5000);
				gameServers.push(gameServer);

				logger(logger.INFO, 'Registered "{0}" server "{1}" @ ' + gameServer.ip + ':' + gameServer.port, gameServer.mod, gameServer.name);
				ws.send(message.SERVER_REGISTERED.serialize());
				clientsSocket.clients.forEach(function(client) {//broadcast
					try {
						message.ADD_SERVERS.serialize([gameServer], client.ipAddr).then(function(buf) {
							client.send(buf, wsOptions);
						});
					} catch (err) {/* Do nothing */}
				});
			} else {
				ips.ban(gameServer.ip);
				return;//prevent logging
			}
			logger(logger.DEV, (message.toString(state)).italic);
		} catch (err) {
			ips.ban(gameServer.ip);
		}
	});
	ws.on('pong', function() {
		gameServer.latency = Date.now() - lastPing;
	});
	ws.on('close', function() {
		gameServers.forEach(function(gS, i) {
			if (gameServer === gS) {
				clearInterval(gameServer.pingIntervalId);
				gameServers.splice(i, 1);
				logger(logger.INFO, 'Unregistered "{0}" server "{1}" @ ' + gS.ip + ':' + gS.port, gS.mod, gS.name);
				clientsSocket.clients.forEach(function(client) {//broadcast
					try {
						client.send(message.REMOVE_SERVERS.serialize([i]), wsOptions);
					} catch (err) {/* Do nothing */}
				});
			}
		});
	});
});

clientsSocket.on('connection', function(ws) {
	ws.ipAddr = ipaddr.parse(ws.upgradeReq.headers['x-forwarded-for'] || ws._socket.remoteAddress);
	if (ws.ipAddr.kind() === 'ipv4') ws.ipAddr = ws.ipAddr.toIPv4MappedAddress();

	try {
		message.ADD_SERVERS.serialize(gameServers, ws.ipAddr).then(function(buf) {
			ws.send(buf, wsOptions);
		});
	} catch (err) {/* Do nothing */ console.log(err); }
});

