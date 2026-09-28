// test/v1.5.0.test.js — run: node --test test/v1.5.0.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const v15 = css.slice(css.indexOf('/* v1.5.0'));

test('quote cards: mark sits in the padding (no float indent), name always last', () => {
  assert.ok(v15.length > 100, 'v1.5.0 block missing');
  assert.match(v15, /\.btg-home-quote blockquote \{[^}]*position: relative;[^}]*padding-left: 24px !important;/);
  assert.match(v15, /\.btg-home-quote blockquote::before \{[^}]*position: absolute;[^}]*float: none;/);
  assert.match(v15, /\.btg-home-quote figcaption \{[^}]*order: 2;/);
});

test('reviews plugin list becomes cards; decorative dot lines hidden', () => {
  assert.match(v15, /\.wpcr3_review \{[^}]*border-radius: var\(--btg-radius-md\);/);
  assert.match(v15, /\.wpcr3_dotline \{ display: none !important; \}/);
});

test('body text consistent on every bundle page; contact form styled', () => {
  assert.match(v15, /html \.post-content \{ font-size: 16\.5px; line-height: 1\.72; color: var\(--btg-text\); \}/);
  assert.match(v15, /\.wpcf7-form \{[^}]*border-radius: var\(--btg-radius-md\);/);
  assert.match(v15, /\.wpcf7-form input\[type="submit"\] \{[^}]*background: #3a7f30 !important;/);
  assert.match(v15, /\.wpcf7-form-control:focus \{[^}]*box-shadow: 0 0 0 4px var\(--btg-green-tint\);/);
});
