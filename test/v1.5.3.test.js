// test/v1.5.3.test.js — run: node --test test/v1.5.3.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const v = css.slice(css.indexOf('/* v1.5.3'));

test('contact location cards: 2 columns from 600px, phone as a call link', () => {
  assert.ok(v.length > 100, 'v1.5.3 block missing');
  assert.match(v, /\.btg-locations \{[^}]*display: grid;[^}]*grid-template-columns: 1fr;/);
  assert.match(v, /@media \(min-width: 600px\) \{ \.btg-locations \{ grid-template-columns: repeat\(2, 1fr\); \} \}/);
  assert.match(v, /\.btg-location \{[^}]*border-top: 3px solid var\(--btg-green\);/);
  assert.match(v, /\.btg-location-phone a \{/);
});
