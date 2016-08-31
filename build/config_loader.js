'use strict';

const fs = require('fs');

module.exports = function(path, skeleton) {
	try {
		let config = JSON.parse(fs.readFileSync(path));
		for (let key in config) {
			if(skeleton[key] === undefined) throw new Error('Invalid property ' + key + ' in ' + path);
		}

		return config;
	} catch(err) {
		if (err.code === 'ENOENT') {
			console.log('No config file (\u001b[1m' + path + '\u001b[0m) found. Creating it.');
			fs.writeFileSync(path, JSON.stringify(skeleton, null, '\t'));

			return skeleton;
		} else {
			throw err;
		}
	}
};
