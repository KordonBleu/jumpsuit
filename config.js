"use strict";

module.exports = function(path, skeleton, changeCbk) {
	var fs = require("fs"),
		config,
		previousConfig;

	function loadConfig() {
		previousConfig = config;//config will be set to a brand new object so no reference problem doing this

		if (loadConfig.selfModified === true) {
			loadConfig.selfModified = false;
			return;
		}
		try {
			config = JSON.parse(fs.readFileSync(path));
			for (let key in config) {
				if(skeleton[key] === undefined) throw new Error("Invalid property " + key + " in " + path);
			}
			printEntry.print(printEntry.INFO, "Succesfully loaded" + (previousConfig === undefined ? "" : " modified") + " config file.");
			var addedProp = [];
			for (let key in skeleton) {
				if (!config.hasOwnProperty(key)) {
					config[key] = skeleton[key];//all the properties must be listed in `config.json`
					addedProp.push(key);
				}
			}
			if (addedProp.length !== 0) {
				fs.writeFileSync(path, JSON.stringify(config, null, "\t"));
				loadConfig.selfModified = true;
				printEntry.print(printEntry.INFO, "New properties added to config file: " + addedProp.join(", ").bold);
			}
		} catch(err) {
			printEntry.print(printEntry.ERROR, err.stack);
			printEntry.print(printEntry.INFO, "Unproper config file found. Loading default settings.");
			config = Object.assign({}, skeleton);//clone skeleton
		}
	}

	try {
		fs.statSync(path);
	} catch(err) {
		if (err.code === "ENOENT") {
			console.log("No config file (\u001b[1m" + path + "\u001b[0m) found. Creating it.");
			fs.writeFileSync(path, JSON.stringify(skeleton, null, "\t"));
			config = skeleton;
		} else {
			throw err;
		}
	}
	if (config === undefined) {
		loadConfig();
	}

	fs.watchFile(path, function() {//refresh config whenever the `config.json` is modified
		loadConfig();
		changeCbk(config, previousConfig);
	});

	return config;
}
