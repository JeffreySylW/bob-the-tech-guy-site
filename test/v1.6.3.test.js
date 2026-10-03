// test/v1.6.3.test.js — run: node --test test/v1.6.3.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const css = fs.readFileSync(require('node:path').join(__dirname, '../dist/btg.css'), 'utf8');

test('contact page: a healthy gap between the location cards and the reviews band', () => {
  assert.match(css, /\.btg-locations \+ \.btg-rv \{ margin-top: 56px; \}/);
  assert.match(css, /@media \(max-width: 600px\) \{ \.btg-locations \+ \.btg-rv \{ margin-top: 44px; \} \}/);
});
