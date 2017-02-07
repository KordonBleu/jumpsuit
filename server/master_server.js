import * as config from './config_loader.js';
config.init(process.argv[2] || './master_config.json', {
	dev: true,
	monitor: false,
	nat: {
		ipv4_provider: 'https://ipv4.icanhazip.com/',
		ipv6_provider: 'https://ipv6.icanhazip.com/'
	},
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


import logger from './logger.js';
import * as monitor from './monitor.js';

require('colors');
const http = require('http'),
	fs = require('fs');

ipPicker.init().then(() => {

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

let server = http.createServer((req, res) => {
	if (req.url === '/index.html') {
		res.writeHead(301, {'Location': '/'});
		res.end();
		return;
	} //beautifying URL, shows foo.bar when requested foo.bar/index.html

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
		effectiveIp(clientIp) {
			return ipPicker.pick(this.ip, clientIp);
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

	server = http.createServer(function (req, res) {
		if (req.url === '/index.html') {
			res.writeHead(301, {'Location': '/'});
			res.end();
			return;
		} //beautifying URL, shows foo.bar when requested foo.bar/index.html

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


const Master = require('enslavism').Master;

let master = new Master(server);

master.on('slaveauth', authData => {
	logger(logger.DEV, 'Slave is attempting to connect with data: ' + JSON.stringify(authData));
});
master.on('clientauth', authData => {
	logger(logger.DEV, 'Client is attempting to connect with data: ' + JSON.stringify(authData));
});

// there should be a
// logger(logger.INFO, 'Registered "{0}" server "{1}" @ ' + gameServer.ip + ':' + gameServer.port, gameServer.modName, gameServer.serverName);
// of some kind once the connection is established with a server
// and a
// logger(logger.INFO, 'Unregistered "{0}" server "{1}" @ ' + gS.ip + ':' + gS.port, gS.modName, gS.serverName);
// when the server disconnects
// this capability needs to be added to Enslavism
