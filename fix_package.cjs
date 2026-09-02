const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts.dev = 'tsx api/index.ts';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
