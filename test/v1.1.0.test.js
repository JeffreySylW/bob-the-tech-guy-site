// test/v1.1.0.test.js — run: node --test test/v1.1.0.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');
const R = require('../tools/service-recipes.js');

test('title separator lines hidden, words kept', () => {
  assert.match(css, /\.fusion-title \.title-sep-container \{\s*display: none !important;/);
});

test('empty sidebar hidden and content column centered', () => {
  assert.match(css, /body\.has-sidebar #sidebar \{\s*display: none !important;/);
  assert.match(css, /body\.has-sidebar #content \{[^}]*float: none !important;[^}]*margin-left: auto !important;[^}]*margin-right: auto !important;/);
});

test('runtime hero nudge removed', () => {
  assert.doesNotMatch(js, /centerHeroOnPage/);
});

test('checklist and CTA block styles exist', () => {
  // v1.8.9: two flowing columns, not grid rows (rows made the space between items uneven; see test/e2e/checklist-gaps.e2e.mjs).
  assert.match(css, /\.btg-checklist \{[^}]*display: block;[^}]*column-count: 2;/);
  assert.match(css, /@media \(max-width: 600px\) \{\s*\.btg-checklist \{ column-count: 1; \}/);
  assert.doesNotMatch(css, /\.btg-checklist \{[^}]*display: grid/);
  assert.match(css, /\.btg-cta-block \{[^}]*text-align: center;/);
});

test('every Services card icon has a style', () => {
  for (const r of Object.values(R)) for (const c of r.cards || []) assert.match(css, new RegExp('\.btg-card--' + c.icon + '::before \{'));
});

test('a lone card spans the column and cards never overflow narrow phones', () => {
  assert.match(css, /\.btg-cards \{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(280px, 100%\), 1fr\)\);/);
});
