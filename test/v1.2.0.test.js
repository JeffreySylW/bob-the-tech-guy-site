// test/v1.2.0.test.js — run: node --test test/v1.2.0.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const R = require('../tools/service-recipes.js');
const I = require('../tools/services-index.js');

test('split layout: 2 columns from 768px, stacked variant stays 1 column', () => {
  assert.match(css, /\.btg-split \{[^}]*display: grid;[^}]*grid-template-columns: 1fr;/);
  assert.match(css, /@media \(min-width: 768px\) \{\s*\.btg-split \{ grid-template-columns: 1\.3fr 1fr; \}\s*\.btg-split--stacked \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.btg-include-card \{[^}]*border-top: 3px solid var\(--btg-green\);/);
  assert.match(css, /\.btg-split--stacked \.btg-include-card \.btg-checklist \{ grid-template-columns: repeat\(2, 1fr\); \}/);
  assert.match(css, /\.btg-note \{/);
  assert.match(css, /\.btg-banner \{/);
});

test('index panels: adaptive grid, icon tile, arrow', () => {
  assert.match(css, /\.btg-panels \{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(240px, 100%\), 1fr\)\);/);
  assert.match(css, /\.btg-panel-link::before \{[^}]*background-color: var\(--btg-green-tint\);/);
  assert.doesNotMatch(css, /\.btg-panel-link::before \{[^}]*background:/);
  assert.match(css, /\.btg-panel-link::after \{ content: "\\203A";/);
});

test('every split-recipe and index icon has a style', () => {
  const icons = new Set(Object.values(R).filter((r) => r.layout === 'split').map((r) => r.icon));
  I.GROUPS.forEach((g) => g.items.forEach((i) => icons.add(i[1])));
  for (const icon of icons) assert.match(css, new RegExp('\\.btg-card--' + icon + '::before \\{'), icon);
});
