// test/v1.5.2.test.js — run: node --test test/v1.5.2.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const v = css.slice(css.indexOf('/* v1.5.2'));

test('gallery: responsive grid, cropped rounded photos, controls span the row', () => {
  assert.ok(v.length > 100, 'v1.5.2 block missing');
  assert.match(v, /\.ngg-galleryoverview:not\(\.ngg-slideshow\) \{[^}]*display: grid !important;[^}]*grid-template-columns: repeat\(auto-fill, minmax\(min\(200px, 100%\), 1fr\)\);/);
  assert.match(v, /\.ngg-gallery-thumbnail img \{[^}]*object-fit: cover;/);
  assert.match(v, /\.ngg-galleryoverview > \.slideshowlink,\s*\.ngg-galleryoverview > \.ngg-navigation \{ grid-column: 1 \/ -1; \}/);
});

test('gallery hover zoom respects reduced motion', () => {
  assert.match(v, /@media \(prefers-reduced-motion: reduce\) \{[^}]*\.ngg-gallery-thumbnail img \{ transition: none; transform: none !important; \}/);
});
