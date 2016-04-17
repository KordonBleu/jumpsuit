"use strict";

module.exports = function(startServerCallback) {
	var ipaddr = require("ipaddr.js"),
		localIp = "::1",// default if not on a network
		localNetmask = "ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
		externalIp,
		ifaces = require('os').networkInterfaces();
	for (let iname in ifaces) {
		ifaces[iname].forEach(function(iface) {
			if (iface.family === "IPv6" && !iface.internal) {
				localIp = iface.address;
				localNetmask = iface.netmask;
			}
		});
	}

	localIp = ipaddr.parse(localIp);
	localNetmask = ipaddr.parse(localNetmask);

	//determine prefix length from IPv6 netmask
	//even though IPv6 netmasks don't exist, see https://github.com/whitequark/ipaddr.js/pull/41#issuecomment-210771828
	//also the code is ported from here, stripped of the error-checking because data from gotten Node.js can be assumed safe, right?
	var zerotable = {}//number of zeroes in IPv6 part (16 bits long)
	for (let i = 0; i !== 17; ++i) {
		zerotable[(0xffff >> i) << i] = i;
	}

	var cidr = 0;
	for (let i = 7; i !== 0; --i) {
		let part = localNetmask.parts[i],
			zeros = zerotable[part];
		cidr += zeros;
		if (zeros !== 16) {
			break
		}
	}


	var https = require("https");

	function unknownErrorHandler(err) {
		console.log("Unknown error: " + err.message + ". Closing server.");
		process.exit(1);
	}

	https.get("https://ipv6.icanhazip.com/", function(res) {
		console.log("Acquiring IPv6 address...");
		res.on("data", function(chunk) {
			externalIp = ipaddr.parse(chunk.toString().trim());
			startServerCallback();
		});
	}).on("error", function(err) {
		if (err.code === "ENETUNREACH") {
			console.log("Cannot get IPv6 address. Acquiring IPv4 instead.");
			https.get("https://icanhazip.com/", function(res) {
				res.on("data", function(chunk) {
					externalIp = ipaddr.parse(chunk.toString().trim()).toIPv4MappedAddress();
					startServerCallback();
				});
			}).on("error", unknownErrorHandler);
		} else unknownErrorHandler(err);
	});


	return function(serverIp, clientIp) {
		console.log(serverIp, clientIp);
		var serverOnLocalhost = serverIp.range() === "loopback" || (serverIp.range() === "ipv4Mapped" && serverIp.toIPv4Address().range() === "loopback"),
			serverOnNetwork = localIp.match(serverIp, cidr),
			serverOnInternet = !serverOnLocalhost && !serverOnNetwork,
			clientOnLocalhost = clientIp.range() === "loopback" || (clientIp.range() === "ipv4Mapped" && clientIp.toIPv4Address().range() === "loopback"),
			clientOnNetwork = localIp.match(clientIp, cidr),
			clientOnInternet = !clientOnLocalhost && !clientOnNetwork;

		console.log(clientIp);
		console.log(serverOnLocalhost, serverOnNetwork, serverOnInternet);
		console.log(clientOnLocalhost, clientOnNetwork, clientOnInternet);

		if (serverOnLocalhost && clientOnLocalhost) return ipaddr.parse("::1");
		else if (serverOnNetwork && (clientOnLocalhost || clientOnNetwork) ||
			(serverOnLocalhost && clientOnNetwork)) return localIp;
		else return externalIp;
	};
};
