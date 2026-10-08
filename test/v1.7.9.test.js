// test/v1.7.9.test.js — run: node --test test/v1.7.9.test.js
// Northern New Jersey service-area map (NJ page + footer), and even pill/card layout on the NJ and Virginia pages.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../dist/btg.js');
const Z = window.BTGZone, F = window.BTGFooter;
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const NJ = ['Pompton Lakes', 'Wayne', 'Wyckoff', 'Ramsey', 'Mahwah', 'Oakland', 'Allendale', 'Upper Saddle River', 'Saddle River', 'Waldwick', 'Midland Park',
  'Ridgewood', 'Glen Rock', 'Fair Lawn', 'Paramus', 'Riverdale', 'Butler', 'Wanaque', 'Pequannock', 'Montville', 'Totowa'];
const inside = (ring, p) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j];
  if ((a[0] > p[0]) !== (b[0] > p[0]) && p[1] < ((b[1] - a[1]) * (p[0] - a[0])) / (b[0] - a[0]) + a[1]) c = !c; } return c; };

test('NJ area: the 21 towns Bob serves (counties are not points), a rounded zone containing every one', () => {
  const A = Z.AREAS.nj;
  assert.deepStrictEqual(A.towns.map((t) => t[0]), NJ);
  const ring = Z.zone('nj');
  assert.ok(ring.length >= 24);
  for (const t of A.towns) assert.ok(inside(ring, [t[1], t[2]]), t[0]);
  for (const t of A.towns) assert.ok(t[1] > 40.88 && t[1] < 41.11 && t[2] > -74.38 && t[2] < -74.04, t[0] + ' is in Bergen/Passaic/Morris, NJ');
});

test('the Virginia zone is unchanged', () => {
  assert.strictEqual(Z.TOWNS.length, 9);
  assert.deepStrictEqual(Z.zone(), Z.zone('va'));
});

test('map markup per area: NJ gets its own class and label', () => {
  assert.match(Z.mapHtml('nj'), /^<div class="btg-zone-map btg-zone-big btg-zone-nj" role="img" aria-label="Map of the northern New Jersey service area: Pompton Lakes, Wayne,/);
  assert.match(Z.mapHtml(), /^<div class="btg-zone-map btg-zone-big" role="img" aria-label="Map of the Virginia service area: Richmond,/);
});

test('slots: a plain slot gets the Virginia map, a --nj slot gets the New Jersey one', () => {
  const fill = (cls) => { const slot = { className: cls, innerHTML: '', querySelector: () => null };
    Z.init({ querySelector: (s) => (s === '.btg-zone-slot' ? slot : null), querySelectorAll: (s) => (s === '.btg-zone-slot' ? [slot] : []) }, { location: { pathname: '/x/' } }); return slot.innerHTML; };
  assert.match(fill('btg-zone-slot'), /Virginia service area/);
  assert.match(fill('btg-zone-slot btg-zone-slot--nj'), /northern New Jersey service area/);
});

test('footer: the Northern NJ column has a service-area map and a link to the NJ page', () => {
  const h = F.regionHtml('nj');
  assert.match(h, /<div class="btg-foot-zone btg-zone-map btg-zone-nj" role="img" aria-label="Map of the northern New Jersey service area/);
  assert.match(h, /<a href="https:\/\/bobthetechguy\.com\/northern-new-jersey\/">See every NJ town we serve &rarr;<\/a>/);
});

test('styles: service cards stretch to equal height; town pills sit on an even grid', () => {
  assert.match(css, /\.btg-sr-list li \{[^}]*display: flex;/);
  assert.match(css, /\.btg-sr-item \{[^}]*flex: 1 1 auto;/);
  assert.match(css, /\.btg-nj-towns \{[^}]*display: grid; grid-template-columns: repeat\(auto-fill, minmax\(160px, 1fr\)\)/);
  assert.match(css, /\.btg-nj-towns li \{[^}]*text-align: center;/);
  assert.match(css, /\.btg-zone-nj\b/);
});
