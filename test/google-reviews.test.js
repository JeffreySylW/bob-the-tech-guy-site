// test/google-reviews.test.js — run: node --test test/google-reviews.test.js
// Real reviews copied from Bob's Google listing, shown as "Posted on Google" cards above the site's own reviews (issue #11).
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const R = window.BTGReviews;

const cards = (html) => html.split('<article class="btg-gr-card"').slice(1);

test('Google band: one card per review copied from the listing, each marked "Posted on Google"', () => {
  const c = cards(R.googleBandHtml());
  assert.strictEqual(c.length, 10);
  assert.ok(c.every((x) => x.includes('Posted on Google')));
  assert.ok(c[0].includes('Richard McFarlane'));
});

test('Google band summary: Excellent, 28 reviews, and a button to Bob\'s listing', () => {
  const sum = R.googleBandHtml().split('<article')[0];
  assert.match(sum, /Excellent/);
  assert.match(sum, /Based on <b>28<\/b> reviews/);
  assert.match(sum, /<a class="btg-rv-google" href="https:\/\/maps\.google\.com\/\?cid=12486145650775343960" rel="noopener">Review us on Google<\/a>/);
});

test('long reviews fold behind Read more; reviews Google itself cuts short end in … and link to the rest on Google', () => {
  const c = cards(R.googleBandHtml());
  const by = (name) => c.find((x) => x.includes('<b class="btg-rv-name">' + name + '</b>'));
  assert.match(by('Rudge Information'), /<button type="button" class="btg-rv-more"[^>]*>Read more<\/button>/);
  assert.match(by('Anthony Carolei'), /can handle …<\/p><a class="btg-gr-rest" href="https:\/\/maps\.google\.com\/\?cid=12486145650775343960" rel="noopener">Read the rest on Google<\/a>/);
  assert.doesNotMatch(by('Nick Caso'), /btg-rv-more|btg-gr-rest/);
});
