// test/v1.4.0.test.js — run: node --test test/v1.4.0.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const v14 = css.slice(css.indexOf('/* v1.4.0'));

test('homepage sections are styled', () => {
  assert.ok(v14.length > 100, 'v1.4.0 block missing');
  for (const sel of ['.btg-home-announce-link', '.btg-home-grid', '.btg-home-svc', '.btg-home-reason', '.btg-home-quotes', '.btg-home-quote', '.btg-home-about', '.btg-home-cta', '.btg-home-cta-btn', '.btg-home-badges']) {
    assert.ok(v14.includes(sel + ' {') || v14.includes(sel + ','), sel);
  }
});

test('cards: 2x2 grid from 600px (no orphan card), 1 column on phones; quotes in columns', () => {
  assert.match(v14, /\.btg-home-grid \{[^}]*grid-template-columns: 1fr;/);
  assert.match(v14, /@media \(min-width: 600px\) \{ \.btg-home-grid \{ grid-template-columns: repeat\(2, 1fr\); \} \}/);
  assert.match(v14, /\.btg-home-quotes \{[^}]*columns: 3 280px;/);
  assert.match(v14, /\.btg-home-quote \{[^}]*break-inside: avoid;/);
});

test('every homepage icon has a style', () => {
  for (const i of ['box', 'gauge', 'shield', 'wifi']) assert.match(css, new RegExp('\\.btg-card--' + i + '::before \\{'), i);
  for (const i of ['flag', 'tool', 'star', 'home']) assert.match(v14, new RegExp('\\.btg-reason--' + i + '::before \\{'), i);
});

test('reduced motion: no card lift', () => {
  assert.match(v14, /@media \(prefers-reduced-motion: reduce\) \{[^}]*\.btg-home-svc[^}]*\{ transition: none; transform: none; \}/);
});
