// test/v1.3.0.test.js — run: node --test test/v1.3.0.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const v13 = css.slice(css.indexOf('/* v1.3.0'));

test('top bar: one font on every page, old per-page strip replaced', () => {
  assert.ok(v13.length > 100, 'v1.3.0 block missing');
  assert.match(v13, /\.fusion-secondary-header \.fusion-contact-info,\s*\.fusion-secondary-header \.fusion-contact-info a \{[^}]*font-family: var\(--btg-font-body\) !important;[^}]*font-size: 12\.5px !important;[^}]*font-weight: 700 !important;/);
  assert.match(v13, /html \.fusion-header-wrapper::before,\s*html \.fusion-header-wrapper:before \{ display: none !important; \}/);
  assert.match(v13, /\.fusion-secondary-header \.fusion-row::before \{[^}]*content: "NOW SERVING CHESTERFIELD/);
});

test('header row, dropdown, search and call button styles exist', () => {
  for (const sel of ['.btg-header-on .fusion-header .fusion-row', '.btg-header-tools', '.btg-call', '.btg-search-btn', '.btg-dropdown', '.btg-search', '.btg-search-list', '.btg-search-opt.is-active', '.btg-scrolled']) {
    assert.ok(v13.includes(sel), sel);
  }
  assert.match(v13, /\.btg-header-on li\.btg-has-panel > \.sub-menu \{ display: none !important; \}/);
  assert.match(v13, /\.btg-header-on \.fusion-main-menu-search \{ display: none !important; \}/);
});

test('reduced motion stops the pulse, trace and shrink transitions', () => {
  const rm = v13.slice(v13.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(rm, /\.btg-logo-pad \{ animation: none; \}/);
  assert.match(rm, /transition: none/);
});

test('icons exist for towns (pin) and pages (page)', () => {
  assert.match(css, /\.btg-card--pin::before \{/);
  assert.match(css, /\.btg-card--page::before \{/);
});
