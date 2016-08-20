'use strict';

module.exports = function(config) {
	const ipaddr = require('ipaddr.js'),
		https = require('https'),
		http = require('http'),
		logger = require('./logger.js');
	let externalIp,
		localIp,
		localNetmask,
		ifaces = require('os').networkInterfaces(),
		internal;

	for (let iname in ifaces) {
		ifaces[iname].forEach(function(iface) {
			if ((iface.family === 'IPv4' && !iface.internal) || (iface.family === 'IPv6' && (localIp === undefined || internal)) ||//priority to non-localhost IPs
				(internal !== false && iface.internal && iface.family === 'IPv4') || (internal !== false && iface.internal && iface.family === 'IPv6' && localIp === undefined) ) {
					localIp = iface.address;
					localNetmask = iface.netmask;
					internal = iface.internal;
			}
		});
	}

	localIp = ipaddr.parse(localIp);
	localNetmask = ipaddr.parse(localNetmask);
	if (localIp.kind() === 'ipv4') localIp = localIp.toIPv4MappedAddress();
	if (localNetmask.kind() === 'ipv4') localNetmask = localNetmask.toIPv4MappedAddress();

	//determine prefix length from IPv6 netmask
	//even though IPv6 netmasks don't exist, see https://github.com/whitequark/ipaddr.js/pull/41#issuecomment-210771828
	//also the code is ported from here, stripped of the error-checking because data gotten from Node.js can be assumed safe, right?
	//and because it makes it possible to calculate the cidr of a mapped IPv4 address. In the mapped address ::ffff:stuff:stuff:stuff the preceding zeroes could be considered an error. It's a hack
	let zerotable = {};//number of zeroes in IPv6 part (16 bits long)
	for (let i = 0; i !== 17; ++i) {
		zerotable[(0xffff >> i) << i] = i;
	}

	let cidr = 0;
	for (let i = 7; i !== 0; --i) {
		let part = localNetmask.parts[i],
			zeros = zerotable[part];
		cidr += zeros;
		if (zeros !== 16) {
			break;
		}
	}


	function getExternalIp() {
		function errorHandler(err) {
			if (err.code === 'ENOTFOUND') {
				logger(logger.ERROR, 'Unable to get own IP address.');
			} else {
				logger(logger.ERROR, 'Unknown error: ' + err.message + '. Closing server.');
				process.exit(1);
			}
		}

		return new Promise(function(resolve, reject) {
			if (externalIp !== undefined) resolve(externalIp);
			else {

				let protocol;
				if (config.ipv4_provider.startsWith('https://')) protocol = https;
				else if(config.ipv4_provider.startsWith('http://')) protocol = http;
				else try {
					externalIp = ipaddr.parse(config.ipv4_provider).toIPv4MappedAddress();
					resolve(externalIp);
				} catch (err) {
					logger(logger.ERR, 'ipv4_provider is invalid. Please edit config file.');
					process.exit(1);
				}

				protocol.get(config.ipv4_provider, function(res) {
					res.on('data', function(chunk) {
						externalIp = ipaddr.parse(chunk.toString().trim()).toIPv4MappedAddress();
						logger(logger.INFO, 'IPv4 is: ' + externalIp.toString());
						resolve(externalIp);
					});
				}).on('error', function(err) {
					if (err.code === 'ENETUNREACH') {
						logger(logger.DEV, 'Cannot get IPv4 address. Acquiring IPv6 instead...');

						let protocol;
						if (config.ipv6_provider.startsWith('https://')) protocol = https;
						else if(config.ipv6_provider.startsWith('http://')) protocol = http;
						else try {
							externalIp = ipaddr.parse(config.ipv6_provider);
							resolve(externalIp);
						} catch (err) {
							logger(logger.ERR, 'ipv6_provider is invalid. Please edit config file.');
							process.exit(1);
						}

						protocol.get(config.ipv6_provider, function(res) {
							res.on('data', function(chunk) {
								externalIp = ipaddr.parse(chunk.toString().trim());
								logger(logger.INFO, 'IPv6 is: ' + externalIp.toString());
								resolve(externalIp);
							});
						}).on('error', err => {
							errorHandler(err);
							reject(err);
						});
					} else {
						errorHandler(err);
						reject(err);
					}
				});
			}
		});
	}




	return function(serverIp, clientIp) {
		let serverOnLocalhost = serverIp.range() === 'loopback' || (serverIp.range() === 'ipv4Mapped' && serverIp.toIPv4Address().range() === 'loopback'),
			serverOnNetwork = localIp.match(serverIp, cidr),
			clientOnLocalhost = clientIp.range() === 'loopback' || (clientIp.range() === 'ipv4Mapped' && clientIp.toIPv4Address().range() === 'loopback'),
			clientOnNetwork = localIp.match(clientIp, cidr);


		if (serverOnLocalhost && clientOnLocalhost) return Promise.resolve(ipaddr.parse('::ffff:7f00:1'));
		else if (serverOnNetwork && (clientOnLocalhost || clientOnNetwork) ||
			(serverOnLocalhost && clientOnNetwork)) return Promise.resolve(localIp);
		else return getExternalIp();
	};
};
