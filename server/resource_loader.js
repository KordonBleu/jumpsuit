import getFinalResNames from '../shared/resource_list.js';
import sizeOf from 'image-size';

let resources = {};

getFinalResNames((baseName, variants) => {
	resources[baseName] = sizeOf(__dirname + '/assets/images/' + baseName + '.svg');

	for (let variant in variants) resources[variant] = resources[baseName];
});

export default resources;
