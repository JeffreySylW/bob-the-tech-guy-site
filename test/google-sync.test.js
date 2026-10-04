// test/google-sync.test.js — run: node --test test/google-sync.test.js
// Daily Google sync: tools/google-reviews.js shapes the Places API reply into dist/google-reviews.json;
// BTGGoogleLive only trusts a fresh, well-formed file and renders it with escaping.
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const G = require('../tools/google-reviews.js');
const L = window.BTGGoogleLive;

const NOW = Date.parse('2026-10-04T12:00:00Z');
const api = {
  places: [{
    id: 'ChIJxyz', displayName: { text: 'Bob The Tech Guy' }, rating: 5, userRatingCount: 29,
    googleMapsUri: 'https://maps.google.com/?cid=12486145650775343960',
    reviews: [
      { rating: 5, relativePublishTimeDescription: '2 days ago', publishTime: '2026-10-02T15:00:00Z',
        originalText: { text: 'Fixed my <b>laptop</b> fast!' }, text: { text: 'translated' },
        authorAttribution: { displayName: 'Ann B.', uri: 'https://www.google.com/maps/contrib/1' } },
      { rating: 5, relativePublishTimeDescription: 'a year ago', publishTime: '2025-09-01T00:00:00Z',
        authorAttribution: { displayName: 'No Text', uri: 'javascript:alert(1)' } },
      { rating: 4, relativePublishTimeDescription: '3 weeks ago', publishTime: '2026-09-10T00:00:00Z',
        text: { text: 'Good service.' }, authorAttribution: { displayName: 'Cy D.', uri: 'javascript:alert(1)' } },
    ],
  }],
};

test('shape(): rating, count, link and text reviews, original language first, https links only', () => {
  const d = G.shape(api, NOW);
  assert.strictEqual(d.updated, '2026-10-04T12:00:00.000Z');
  assert.deepStrictEqual([d.rating, d.count, d.url], [5, 29, 'https://maps.google.com/?cid=12486145650775343960']);
  assert.strictEqual(d.reviews.length, 2, 'the review without text is dropped');
  assert.deepStrictEqual(d.reviews[0], { name: 'Ann B.', url: 'https://www.google.com/maps/contrib/1', rating: 5, date: '2 days ago', text: 'Fixed my <b>laptop</b> fast!' });
  assert.strictEqual(d.reviews[1].url, '');
});

test('shape() refuses a reply that is not Bob\'s listing or has no rating', () => {
  assert.throws(() => G.shape({ places: [{ displayName: { text: 'Some Other Shop' }, rating: 4, userRatingCount: 3 }] }, NOW), /Bob The Tech Guy/);
  assert.throws(() => G.shape({ places: [] }, NOW), /Bob The Tech Guy/);
  assert.throws(() => G.shape({ places: [{ displayName: { text: 'Bob The Tech Guy' } }] }, NOW), /rating/);
});

test('accept(): fresh well-formed data only (stale after 30 days)', () => {
  const d = G.shape(api, NOW);
  assert.ok(L.accept(d, NOW + 29 * 864e5));
  assert.strictEqual(L.accept(d, NOW + 31 * 864e5), null, 'stale');
  assert.strictEqual(L.accept(null, NOW), null);
  assert.strictEqual(L.accept({ updated: d.updated, rating: 'x', count: 3, url: d.url, reviews: [] }, NOW), null);
  assert.strictEqual(L.accept(Object.assign({}, d, { url: 'javascript:alert(1)' }), NOW), null);
});

test('section: escaped text, Google attribution, author links only when https', () => {
  const h = L.sectionHtml(L.accept(G.shape(api, NOW), NOW));
  assert.match(h, /<section class="btg-gl" aria-label="Latest Google reviews">/);
  assert.doesNotMatch(h, /<b>laptop/);
  assert.match(h, /Fixed my &lt;b&gt;laptop/);
  assert.match(h, /href="https:\/\/www\.google\.com\/maps\/contrib\/1"[^>]*>Ann B\.<\/a>/);
  assert.doesNotMatch(h, /javascript:/);
  assert.match(h, /Reviews from Google/);
  assert.match(h, /href="https:\/\/maps\.google\.com\/\?cid=12486145650775343960"[^>]*>See all 29 on Google/);
});

test('the bundle reads the synced file from the main branch on jsDelivr', () => {
  assert.strictEqual(L.URL, 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@main/dist/google-reviews.json');
});
