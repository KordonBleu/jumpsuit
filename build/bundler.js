'use strict';

const rollup = require('rollup'),
	nodeResolve = require('rollup-plugin-node-resolve'),
	commonjs = require('rollup-plugin-commonjs'),
	eslint = require('rollup-plugin-eslint'),
	alias = require('rollup-plugin-alias'),
	replace = require('rollup-plugin-replace'),

	config = require('./config_loader.js')('./build_config.json', {
		dev: true,
		mod: 'capture'
	});

function errorHandler(err) {
	console.error(err);
}
const nodeSrcMapIntro = 'require(\'source-map-support\').install();';

rollup.rollup({
	entry: './server/master_server.js',
	plugins: [
		alias({
			'<@convert@>': 'server/convert.js'
		}),
		nodeResolve({ jsnext: true, main: true }),
		commonjs({ include: 'node_modules/**' }),
		eslint()
	]
}).then((bundle) => {
	return bundle.write({
		format: 'cjs',
		intro: config.dev ? nodeSrcMapIntro : '',
		exports: 'none',
		indent: false,
		sourceMap: config.dev ? 'inline' : false,
		cache: './master_server_bundle.js',
		dest: './master_server_bundle.js'
	});
}).catch(errorHandler).then(() => {
	console.log('`./master_server_bundle.js` successfully written!');
});


rollup.rollup({
	entry: './server/game_server.js',
	plugins: [
		replace({
			include: 'shared/**',
			values: {
				'import vinage from \'vinage\';': 'const vinage = require(\'vinage\');'
			}
		}),
		replace({
			include: 'server/resource_loader.js',
			values: {
				'../static/assets/images/': './static/assets/images/'
			}
		}),
		alias({
			'<@engine@>': 'server/mods/' + config.mod + '/engine.js',
			'<@onMessage@>': 'server/mods/' + config.mod + '/on_message.js',
			'<@Player@>': 'server/mods/' + config.mod + '/player.js',
			'<@Planet@>': 'server/mods/' + config.mod + '/planet.js',
			'<@Enemy@>': 'server/mods/' + config.mod + '/enemy.js',

			'<@Shot@>': 'server/mods/' + config.mod + '/shot.js',

			'<@Weapon@>': 'server/mods/' + config.mod + '/weapon.js',
			'<@RapidFireWeapon@>': 'server/mods/' + config.mod + '/rapid_fire_weapon.js',

			'<@Lmg@>': 'server/mods/' + config.mod + '/lmg.js',
			'<@Smg@>': 'server/mods/' + config.mod + '/smg.js',
			'<@Shotgun@>': 'server/mods/' + config.mod + '/shotgun.js',
			'<@Knife@>': 'server/mods/' + config.mod + '/knife.js',

			'<@convert@>': 'server/convert.js'
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
		intro: config.dev ? nodeSrcMapIntro : '',
		exports: 'none',
		indent: false,
		sourceMap: config.dev ? 'inline' : false,
		cache: './game_server_bundle.js',
		dest: './game_server_bundle.js'
	});
}).catch(errorHandler).then(() => {
	console.log('`./game_server_bundle.js` successfully written!');
});


rollup.rollup({
	entry: './client/main.js',
	plugins: [
		replace({
			include: 'shared/**',
			values: { // strip out imports that are global on the client
				'import resources from \'../server/resource_loader.js\';\n': '',
			}
		}),
		alias({
			'<@Player@>': 'client/player.js',
			'<@Shot@>': 'client/shot.js',

			'<@Weapon@>': 'client/weapon.js',
			'<@RapidFireWeapon@>': 'client/rapid_fire_weapon.js',

			'<@Lmg@>': 'client/lmg.js',
			'<@Smg@>': 'client/smg.js',
			'<@Shotgun@>': 'client/shotgun.js',
			'<@Knife@>': 'client/knife.js',

			'<@convert@>': 'client/convert.js'
		}),
		nodeResolve(),
		commonjs({ include: 'node_modules/vinage/*' }), // to bundle vinage
		eslint()
	]
}).then((bundle) => {
	return bundle.write({
		format: 'iife',
		exports: 'none',
		indent: false,
		sourceMap: config.dev ? 'inline' : false,
		cache: './static/bundle.js',
		dest: './static/bundle.js',
		globals: {
			vinage: 'vinage',
			'ipaddr.js': 'ipaddr'
		}
	});
}).catch(errorHandler).then(() => {
	console.log('`./static/bundle.js` successfully written!');
});
