/*
	Before using this file, MAKE SURE you have called `init` on it
	Generally its inclusion and `init`ialization must be the first statements of the entry point of your program
*/

const fs = require('fs');
import logger from './logger.js';

let previousConfig;
export let config = {};

export function init(path, skeleton, changeCbk) {
	function loadConfig() {
		previousConfig = config;//config will be set to a brand new object so no reference problem doing this

		if (loadConfig.selfModified === true) { // prevent `changeCbk` from being run again by itself
			loadConfig.selfModified = false;
			return;
		}
		try {
			config = JSON.parse(fs.readFileSync(path));
			for (let key in config) {
				if(skeleton[key] === undefined) throw new Error('Invalid property ' + key + ' in ' + path);
			}

			if (config.dev) process.env.NODE_ENV = 'development';//this is the kind of thing which would usually be set in
			else process.env.NODE_ENV = 'production';//`changeCbk` but it is critical to set it first so that `logger` works properly

			logger(logger.INFO, 'Succesfully loaded' + (previousConfig === undefined ? '' : ' modified') + ' config file.');
			let addedProp = [];
			for (let key in skeleton) {
				if (!config.hasOwnProperty(key)) {
					config[key] = skeleton[key];//all the properties must be listed in `config.json`
					addedProp.push(key);
				}
			}
			if (addedProp.length !== 0) {
				fs.writeFileSync(path, JSON.stringify(config, null, '\t'));
				loadConfig.selfModified = true;
				logger(logger.INFO, 'New properties added to config file: ' + addedProp.join(', ').bold);
			}
		} catch(err) {
			logger(logger.ERROR, err.stack);
			logger(logger.INFO, 'Unproper config file found. Loading default settings.');
			config = Object.assign({}, skeleton);//clone skeleton
		}
	}

	try {
		fs.statSync(path);
		loadConfig();
	} catch(err) {
		if (err.code === 'ENOENT') {
			logger(logger.ERROR, 'No config file (\u001b[1m' + path + '\u001b[0m) found. Creating it.');
			fs.writeFileSync(path, JSON.stringify(skeleton, null, '\t'));
			config = Object.assign({}, skeleton); // clone skeleton
		} else {
			throw err;
		}
	}

	if (changeCbk !== undefined) {
		fs.watchFile(path, function() {//refresh config whenever the `config.json` is modified
			loadConfig();
			changeCbk(config, previousConfig);
		});
	}
}
