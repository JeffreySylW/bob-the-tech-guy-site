// test/v1.6.4.test.js — run: node --test test/v1.6.4.test.js
// Reviews band on the home page only; the pre-hide style moves to the top of the page content.
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const L = require('../tools/loader.js');
const R = window.BTGReviews;

test('reviews band is not added to contact, service or Northern New Jersey pages', () => {
  const el = { parentNode: { insertBefore() {}, removeChild() {} }, appendChild() {} };
  const doc = { querySelector: (s) => (s === '.btg-rv' ? null : el) }; // every other placement target exists
  for (const p of ['/contact-2/', '/networking/', '/anti-virus/', '/northern-new-jersey/']) {
    assert.strictEqual(R.init(doc, { location: { pathname: p } }), false, p);
  }
});

test('upgrade() puts the pre-hide style at the very top of the content, once', () => {
  const old = 'Body text.' + L.loaderBlock('v1.6.3');
  const up = L.upgrade(old, 'v1.6.3', 'v1.6.4');
  assert.ok(up.startsWith(L.EARLY + 'Body text.'));
  assert.ok(up.endsWith(L.loaderBlock('v1.6.4')));
  assert.strictEqual(L.upgrade(up, 'v1.6.4', 'v1.6.4'), up, 'idempotent');
  assert.match(L.EARLY, /^<!-- btg-early -->\n<style>html:not\(\.btg-ready\)/);
});
