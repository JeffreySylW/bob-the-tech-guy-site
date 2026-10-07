// test/va-page.test.js — run: node --test test/va-page.test.js
// The one "Chesterfield & Greater Richmond" page that replaces nine near-identical town posts.
const test = require('node:test');
const assert = require('node:assert');
const V = require('../tools/va-page.js');
const G = require('../tools/markup-guard.js');
const L = require('../tools/loader.js');
const html = V('v1.7.5');
const TOWNS = ['Chesterfield', 'Richmond', 'Midlothian', 'Chester', 'Bon Air', 'Brandermill', 'Woodlake', 'Moseley', 'Colonial Heights'];

test('hero: one h1 naming Chesterfield, Bob\'s own tagline, the Virginia phone line', () => {
  assert.ok(html.startsWith('<section class="btg-hero">'));
  assert.strictEqual((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /<h1 class="btg-hero-title">Best computer repair in <strong>Chesterfield, Virginia<\/strong>\.<\/h1>/);
  assert.match(html, /Diagnostics, virus removal, and networking for homes and small businesses\./);
  assert.match(html, /href="tel:8448354890"/);
  assert.doesNotMatch(html, /8622105656/);
});

test('links every service page and lists the nine towns', () => {
  assert.strictEqual((html.match(/class="btg-sr-item /g) || []).length, 15);
  for (const t of TOWNS) assert.ok(html.includes('<li>' + t + '</li>'), t);
  assert.strictEqual((html.match(/<li>[A-Z][A-Za-z ]+<\/li>/g) || []).length, 9);
});

test('keeps Bob\'s sentence about the move, leaves a slot for the service-area map, no address or reviews band', () => {
  assert.match(html, /Bob and his family made the move from New Jersey to Chesterfield, Virginia/);
  assert.match(html, /<div class="btg-zone-slot"><\/div>/);
  assert.doesNotMatch(html, /iframe|btg-rv-slot|Broadway|streetAddress/);
});

test('a call box with the phone number, and it ends with the standard loader', () => {
  assert.match(html, /<div class="btg-cta-block">[\s\S]*844-TEKGUY-0/);
  assert.ok(html.endsWith(L.loaderBlock('v1.7.5')));
});

test('body markup stays inside the safe allowlist', () => {
  const body = html.slice(html.indexOf('</section>') + 10, html.indexOf('<!-- btg-loader'));
  assert.deepStrictEqual(G.markupProblems(body), []);
});
