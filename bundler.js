const rollup = require('rollup'),
	nodeResolve = require('rollup-plugin-node-resolve');
	commonjs = require('rollup-plugin-commonjs'),
	eslint = require('rollup-plugin-eslint'),
	alias = require('rollup-plugin-alias'),
	replace = require('rollup-plugin-replace'),

	fs = require('fs'),
	config = require('./config.js')('./build_config.json', {
		dev: false, // TODO: whether to include sourcemaps
		mod: 'capture'
	}),
	logger = require('./logger.js');

function errorHandler(err) {
	console.error(err);
}
const nodeSrcMapIntro = 'require(\'source-map-support\').install();';

rollup.rollup({
	entry: './master_server.js',
	plugins: [
		nodeResolve({ jsnext: true, main: true }),
		commonjs({ include: 'node_modules/**' }),
		eslint()
	]
}).then((bundle) => {
	return bundle.write({
		format: 'cjs',
		intro: nodeSrcMapIntro,
		exports: 'none',
		indent: false,
		sourceMap: "inline",
		cache: './master_server_bundle.js',
		dest: './master_server_bundle.js'
	});
}).catch(errorHandler).then(() => {
	logger(logger.INFO, '`./master_server_bundle.js` successfully written!');
});


try {
	fs.statSync('./build/');
} catch (err) {
	if (err.code === 'ENOENT') {
		fs.mkdirSync('./build/');
	} else {
		throw err;
	}
}

rollup.rollup({
	entry: './game_server.js',
	plugins: [
		alias({
			'<@engine@>': './mods/' + config.mod + '/engine.js',
			'<@onMessage@>': './mods/' + config.mod + '/on_message.js',
			'<@Player@>': './mods/' + config.mod + '/player.js',
			'<@Planet@>': './mods/' + config.mod + '/planet.js',
			'<@Enemy@>': './mods/' + config.mod + '/enemy.js',
		}),
		replace({
			exclude: 'node_modules/**',
			delimiters: [ '<@', '@>' ],
			values: {
				modName: config.mod
			}
		}),
		nodeResolve({ jsnext: true, main: true }),
		commonjs({ include: 'node_modules/**' }),
		eslint()
	]
}).then((bundle) => {
	return bundle.write({
		format: 'cjs',
		intro: nodeSrcMapIntro,
		exports: 'none',
		indent: false,
		sourceMap: 'inline',
		cache: './game_server_bundle.js',
		dest: './game_server_bundle.js'
	});
}).catch(errorHandler).then(() => {
	logger(logger.INFO, '`./game_server_bundle.js` successfully written!');
});


rollup.rollup({
	entry: './client/main.js',
	plugins: [
		eslint()
	]
}).then((bundle) => {
	return bundle.generate({
		format: 'iife',
		exports: 'none',
		indent: false,
		sourceMap: "inline",
		cache: './static/bundle.js',
		dest: './static/bundle.js',
		globals: {
			vinage: 'vinage',
			'ipaddr.js': 'ipaddr'
		}
	});
}).catch(errorHandler).then(() => {
	logger(logger.INFO, '`./static/bundle.js` successfully written!');
});

