// test/v1.8.0.test.js — run: node --test test/v1.8.0.test.js
// Footer layout A: Virginia | Northern New Jersey | Explore | Why Bob, new bottom bar, "Computer Repair Experts" gone.
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const F = window.BTGFooter;
const SITE = 'https://bobthetechguy.com';

test('Virginia column: service line, phone, email, map, link to the Virginia page, hours; nothing from NJ', () => {
  const h = F.regionHtml('va');
  assert.match(h, /<li>Serving Chesterfield &amp; Greater Richmond, VA<\/li>/);
  assert.match(h, /href="tel:8448354890"[^>]*>844-TEKGUY-0/);
  assert.match(h, /href="mailto:info@bobthetechguy\.com"/);
  assert.match(h, /<div class="btg-foot-zone btg-zone-map" role="img" aria-label="Map of the Virginia service area: /);
  assert.ok(h.includes('<a href="' + SITE + '/best-computer-repair-chesterfield-va/">See our Virginia service area &rarr;</a>'));
  assert.match(h, /<dl class="btg-foot-hours"><dt>Tue<\/dt><dd>9:30 AM–7 PM<\/dd>/);
  assert.strictEqual((h.match(/<dt>/g) || []).length, 4);
  assert.doesNotMatch(h, /8622105656|iframe|Broadway|northern-new-jersey/);
});

test('Northern New Jersey column: service line, NJ phone, email, map, link to the NJ page; no hours, no pin map', () => {
  const h = F.regionHtml('nj');
  assert.match(h, /<li>Serving northern New Jersey<\/li>/);
  assert.match(h, /href="tel:8622105656"[^>]*>\(862\) 210-5656/);
  assert.match(h, /href="mailto:info@bobthetechguy\.com"/);
  assert.match(h, /<div class="btg-foot-zone btg-zone-map btg-zone-nj" role="img" aria-label="Map of the northern New Jersey service area: /);
  assert.ok(h.includes('<a href="' + SITE + '/northern-new-jersey/">See every NJ town we serve &rarr;</a>'));
  assert.doesNotMatch(h, /8448354890|iframe|btg-foot-hours|Broadway/);
});

test('the old helpers are gone (no pin map, no recent-posts list)', () => {
  for (const k of ['contactHtml', 'njZoneHtml', 'addAreaLink']) assert.strictEqual(F[k], undefined, k);
});

test('bottom bar line: current year, Chesterfield and northern NJ, no Nine73, no Pompton Lakes', () => {
  assert.match(F.copyrightText(), /^© \d{4} Bob The Tech Guy · Serving Chesterfield and Greater Richmond, VA, and northern New Jersey$/);
  assert.strictEqual(F.copyrightText(new Date('2027-03-01')).slice(0, 6), '© 2027');
  const el = { textContent: 'old' };
  const doc = { querySelector: (s) => (/copyright-notice/.test(s) ? el : null) };
  assert.strictEqual(F.setCopyright(doc), true);
  assert.strictEqual(el.textContent, F.copyrightText());
  assert.doesNotMatch(el.textContent, /Nine73|Pompton/);
  assert.strictEqual(F.setCopyright({ querySelector: () => null }), false);
});
