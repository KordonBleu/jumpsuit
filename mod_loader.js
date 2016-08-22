'use strict';

const logger = require('./logger.js');

module.exports = function(defaultMod, selectedMod, filenameObj) {
	function plugModdedModule(moddedModule, defaultModule) {
		for (let key in defaultModule) {
			if (moddedModule[key] === undefined) moddedModule[key] = defaultModule[key];//use default functions and constructor when the mod doesn't implement them
		}
	}

	let retVal = {};

	for (let moduleName in filenameObj) {
		let defaultModule = require('./mods/' + defaultMod + '/' + filenameObj[moduleName]);
		if (defaultMod === selectedMod) {
			retVal[moduleName] = defaultModule;
			logger(logger.INFO, selectedMod.green + ': default `' + moduleName + '` loaded.')
		} else try {
			let moddedModule = require('./mods/' + selectedMod + '/' + filenameObj[moduleName]);
			plugModdedModule(moddedModule, defaultModule);

			retVal[moduleName] = moddedModule;
			logger(logger.INFO, selectedMod.green, ': modded `' + moduleName + '` loaded.');
		} catch(e) {
			retVal[moduleName] = defaultModule;
			logger(logger.INFO, selectedMod.green, ': default `' + moduleName + '` loaded.');
		}
	}

	return retVal;
};
