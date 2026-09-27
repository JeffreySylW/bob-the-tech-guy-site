// test/v1.0.9.test.js — run: node --test test/v1.0.9.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const C = require('../tools/cards-transform.js');

test('card grid adapts to the column: min 280px, top-aligned', () => {
  assert.match(css, /\.btg-cards \{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(280px, 100%\), 1fr\)\);[^}]*align-items: start;/);
  assert.doesNotMatch(css, /\.btg-cards \{ grid-template-columns: repeat\(2, 1fr\); \}/);
});

test('every card icon the transform emits has a style', () => {
  for (const c of C.CARDS) assert.match(css, new RegExp('\\.btg-card--' + c.icon + '::before \\{'));
});

test('Read more uses the AA-safe link green and has a visible focus ring', () => {
  assert.match(css, /\.btg-card summary \{[^}]*color: var\(--btg-green-link\);/);
  assert.match(css, /\.btg-card summary:focus-visible \{[^}]*outline: 3px solid var\(--btg-green-link\);/);
});

test('posts with a hero hide the duplicate title and prev/next nav', () => {
  assert.match(css, /body\.single-post:has\(\.btg-hero\) h2\.entry-title,\s*body\.single-post:has\(\.btg-hero\) \.single-navigation \{\s*display: none !important;/);
});
