const ipaddr = require('ipaddr.js'),
	http = require('http'),
	https = require('https');

import * as os from 'os';

import logger from './logger.js';
import { config } from './config_loader.js';


class Ip {
	constructor(ip, netmask) {
		this.ip = typeof ip === 'string' ? ipaddr.parse(ip) : ip;
		if (this.ip.kind() === 'ipv4') this.ip = this.ip.toIPv4MappedAddress();

		if (netmask !== undefined) {
			this.netmask = typeof ip === 'string' ? ipaddr.parse(netmask) : netmask;
			if (this.netmask.kind() === 'ipv4') this.netmask = this.netmask.toIPv4MappedAddress();
		} else this.netmask = null;
	}
	version() {
		return this.ip.isIPv4MappedAddress() ? 4 : 6;
	}
	range() {
		return this.ip.isIPv4MappedAddress() ? this.ip.toIPv4Address().range() : this.ip.range();
	}
	prefixLength() {
		//determine prefix length from IPv6 netmask
		//even though IPv6 netmasks don't exist, see https://github.com/whitequark/ipaddr.js/pull/41#issuecomment-210771828
		//also the code is ported from here, stripped of the error-checking because data gotten from Node.js can be assumed safe, right?
		//and because it makes it possible to calculate the cidr of a mapped IPv4 address. In the mapped address ::ffff:stuff:stuff:stuff the preceding zeroes could be considered an error. It's a hack
		let zerotable = {};//number of zeroes in IPv6 part (16 bits long)
		for (let i = 0; i !== 17; ++i) {
			zerotable[(0xffff >>> i) << i] = i;
		}

		let cidr = 0;
		for (let i = 7; i !== 0; --i) {
			let part = this.netmask.parts[i],
				zeros = zerotable[part];
			cidr += zeros;
			if (zeros !== 16) {
				break;
			}
		}
		return 128 - cidr;
	}
}

let ifaces = os.networkInterfaces(),
	internalIp,
	localIps = [],
	externalIp;

for (let iname in ifaces) {
	for (let netAddr of ifaces[iname]) {
		let ip = new Ip(netAddr.address, netAddr.netmask);

		if (netAddr.internal) {
			if (internalIp !== undefined && internalIp.version() === 4) continue;

			internalIp = ip;
			logger(logger.INFO, 'Listening on internal IP: ' + ip.ip.toString());
		} else if (ip.range() === 'private') {
			localIps.push(ip);
			logger(logger.INFO, 'Listening on private IP: ' + ip.ip.toString());
		} else if (ip.range() === 'unicast') {
			if (internalIp !== undefined && internalIp.version() === 4) continue;

			externalIp = ip;
			logger(logger.INFO, 'Listening on external IP: ' + ip.ip.toString());
		}
	}
}

export function init() {
	if (config.nat === false) return Promise.resolve();

	logger(logger.INFO, '\'nat\''.bold + ' option set. Requesting external IP');

	function errorHandler(err) {
		if (err.code === 'ENOTFOUND') {
			logger(logger.ERROR, 'Unable to get own IP address.');
		} else {
			logger(logger.ERROR, 'Unknown error: ' + err.message + '. Closing server.');
			process.exit(1);
		}
	}

	return new Promise((resolve, reject) => {
		function getIp(provider, ipVersion) {
			return new Promise((resolve, reject) =>  {
				let protocol;
				if (provider.startsWith('https://')) protocol = https;
				else if(provider.startsWith('http://')) protocol = http;
				else try {
					externalIp = new Ip(provider);
					resolve(externalIp);
				} catch (err) {
					logger(logger.ERR, 'ipv' + ipVersion + '_provider is invalid. Please edit config file.');
					process.exit(1);
					reject();
				}

				protocol.get(provider, res => {
					let ipTxt = '';
					res.on('data', chunk => {
						ipTxt += chunk.toString();
					});
					res.on('end', () => {
						let ip = new Ip(ipTxt.trim());
						logger(logger.INFO, 'IPv' + ipVersion + ' is: ' + ip.ip.toString());
						resolve(ip);
					});
				}).on('error', err => {
					reject(err);
				});
			});
		}

		getIp(config.nat.ipv4_provider, 4).then((ip) => {
			externalIp = ip;
			resolve();
		}).catch(err => {
			if (err.code === 'ENETUNREACH') {
				logger(logger.DEV, 'Cannot get IPv4 address. Acquiring IPv6 instead...');
				return getIp(config.nat.ipv6_provider, 6);
			} else {
				errorHandler(err);
				reject();
			}
		}).then((ip) => {
			externalIp = ip;
			resolve();
		}).catch((err) => {
			errorHandler(err);
			reject();
		});
	});
}


export function pick(gameServerIp, clientIp) {
	gameServerIp = new Ip(gameServerIp);
	clientIp = new Ip(clientIp);

	function isOnNetwork(ip, network) {
		let cidr = network.prefixLength();
		return network.ip.match(gameServerIp.ip, cidr);
	}
	function isOnInternet(ip) {
		for (let network of localIps) {
			if (isOnNetwork(ip, network)) return false;
		}

		return ip.range() !== 'loopback'; // if it is a public internet adress it's certainly not loopback
	}

	if (gameServerIp.range() === 'loopback' && clientIp.range() === 'loopback') return internalIp.ip;
	else if (clientIp.range() === 'loopback') return gameServerIp.ip; // game server is on network or on the internet
	else if (isOnInternet(gameServerIp)) return gameServerIp.ip;
	else {
		for (let ip of localIps) {
			let cidr = ip.prefixLength(),
				gameServerMatch = ip.ip.match(gameServerIp.ip, cidr),
				clientMatch = ip.ip.match(clientIp.ip, cidr);

			if (gameServerMatch && clientMatch) { // client and server on same network
				return gameServerIp.ip;
			} else if (clientMatch && gameServerIp.range() === 'loopback') return ip.ip;
		}

		return externalIp;
	}
}
