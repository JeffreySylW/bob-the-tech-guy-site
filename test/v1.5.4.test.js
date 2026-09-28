// test/v1.5.4.test.js — run: node --test test/v1.5.4.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');

test('quote cards keep the DOM order (name first on Testimonials, as in the original)', () => {
  assert.doesNotMatch(css, /\.btg-home-quote figcaption \{[^}]*order:/);
});

test('Testimonials quotes, which carry their own quote mark, get no second one', () => {
  assert.match(css, /\.btg-home-quote figcaption:first-child \+ blockquote::before \{ display: none; \}/);
  assert.match(css, /\.btg-home-quote figcaption:first-child \+ blockquote \{ padding-left: 0 !important; \}/);
});

test('gallery grid leaves the NextGEN slideshow view alone', () => {
  assert.doesNotMatch(css, /(^|[\s,}])\.ngg-galleryoverview \{/);
  assert.match(css, /\.ngg-galleryoverview:not\(\.ngg-slideshow\) \{ display: grid !important;/);
});

test('contact form: checkbox/radio groups are not boxed like text fields; focus is high-contrast', () => {
  assert.match(css, /\.wpcf7-form-control:not\(\[type="submit"\]\):not\(\.wpcf7-checkbox\):not\(\.wpcf7-radio\):not\(\.wpcf7-acceptance\) \{/);
  assert.match(css, /\.wpcf7-form-control:focus \{[^}]*border-color: #38792f !important;[^}]*box-shadow: 0 0 0 3px #38792f33, 0 0 0 1px #38792f;/);
});

test('header init survives a failing Services dropdown build', () => {
  assert.match(js, /try \{ buildDropdown\(doc, nav, header\); \} catch \(e\) \{/);
});

test('v1.5.5: Testimonials italic quote is plain inline italics, not the home review sub-block', () => {
  assert.match(css, /\.btg-home-quote figcaption:first-child \+ blockquote > em \{ display: inline; margin: 0; padding: 0; border: 0; font-size: inherit; color: inherit; \}/);
});
