const rollup = require('rollup'),
	nodeResolve = require('rollup-plugin-node-resolve');
	commonjs = require('rollup-plugin-commonjs'),
	eslint = require('rollup-plugin-eslint');

const fs = require('fs');

rollup.rollup({
	entry: './master_server.js',
	plugins: [
		nodeResolve({ jsnext: true, main: true }),
		commonjs({ include: 'node_modules/**' }),
		eslint()
	]
}).then((bundle) => {
	let result = bundle.generate({
		format: 'cjs',
		exports: 'none',
		indent: false,
		sourceMap: true
	});
	fs.writeFileSync('./master_server_bundle.js', result.code + '//# sourceMappingURL=' + result.map.toUrl());
}).catch((err) => {
	console.error(err);
});

rollup.rollup({
	entry: './client/main.js',
	plugins: [
		eslint()
	]
}).then((bundle) => {
	let result = bundle.generate({
		format: 'iife',
		exports: 'none',
		indent: false,
		sourceMap: true,
		globals: {
			vinage: 'vinage'
		}
	});
	fs.writeFileSync('./static/bundle.js', result.code + '//# sourceMappingURL=' + result.map.toUrl());
}).catch((err) => {
	console.error(err);
});

