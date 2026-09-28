// Copies tools/search-pages.js into dist/btg.js between the search-data markers.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../dist/btg.js');
const pages = require('./search-pages.js');
const src = fs.readFileSync(file, 'utf8');
const re = /(\/\* search-data:start \*\/\n)[\s\S]*?(\n\s*\/\* search-data:end \*\/)/;
if (!re.test(src)) throw new Error('search-data markers not found in dist/btg.js');
const body = '  var PAGES = [\n' + pages.map((p) => '    ' + JSON.stringify(p)).join(',\n') + '\n  ];';
fs.writeFileSync(file, src.replace(re, '$1' + body + '$2'));
console.log('wrote', pages.length, 'search pages into dist/btg.js');
