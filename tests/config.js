const fs = require('fs');

export let config = JSON.parse(fs.readFileSync('../master_config.json'));
