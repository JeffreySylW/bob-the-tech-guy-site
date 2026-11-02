// test/offer.test.js — run: node --test test/offer.test.js
// Bob's monthly offer (vault "Ad Pop-up", 2026-11-02): one 10% offer at a time, new customers first, then the season's.
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const O = window.BTGOffer;
const day = (y, m, d) => new Date(y, m - 1, d, 12);

test('season windows: spring Mar 1-Apr 30, fall Sep 15-Nov 15, holiday Nov 20-Dec 31, none in the gaps', () => {
  const at = (y, m, d) => (O.season(day(y, m, d)) || {}).key || null;
  assert.strictEqual(at(2027, 2, 28), null);
  assert.strictEqual(at(2027, 3, 1), 'spring');
  assert.strictEqual(at(2027, 4, 30), 'spring');
  assert.strictEqual(at(2027, 5, 1), null);
  assert.strictEqual(at(2026, 9, 14), null);
  assert.strictEqual(at(2026, 9, 15), 'fall');
  assert.strictEqual(at(2026, 11, 15), 'fall');
  assert.strictEqual(at(2026, 11, 16), null);
  assert.strictEqual(at(2026, 11, 19), null);
  assert.strictEqual(at(2026, 11, 20), 'holiday');
  assert.strictEqual(at(2026, 12, 31), 'holiday');
  assert.strictEqual(at(2027, 1, 1), null);
});

test('priority: the new-customer offer pops up first, even in season', () => {
  const c = O.choose(day(2026, 11, 2), []);
  assert.strictEqual(c.popup.key, 'new');
  assert.strictEqual(c.strip.key, 'new');
});

test('after the new-customer offer is seen, the season offer pops up; then nothing', () => {
  const c = O.choose(day(2026, 11, 2), ['new']);
  assert.strictEqual(c.popup.key, 'fall');
  assert.strictEqual(c.strip.key, 'fall');
  const d = O.choose(day(2026, 11, 2), ['new', c.popup.id]);
  assert.strictEqual(d.popup, null);
  assert.strictEqual(d.strip.key, 'fall');
});

test('outside a season: new-customer offer once, then no pop-up; the strip keeps the new-customer offer', () => {
  assert.strictEqual(O.choose(day(2026, 6, 1), []).popup.key, 'new');
  const c = O.choose(day(2026, 6, 1), ['new']);
  assert.strictEqual(c.popup, null);
  assert.strictEqual(c.strip.key, 'new');
});

test('a season offer seen last year shows again this year', () => {
  assert.strictEqual(O.choose(day(2027, 10, 1), ['new', 'fall-2026']).popup.id, 'fall-2027');
});

test('no stacking: every offer is 10%, says it cannot be combined, and only one is chosen', () => {
  O.OFFERS.forEach((o) => {
    assert.match(o.title, /^10% off /, o.key);
    assert.match(O.fineText(o), /Can.t be combined with other discounts$/, o.key);
  });
  assert.strictEqual(O.fineText(O.OFFERS[0]), 'First-time customers · Can’t be combined with other discounts');
  assert.strictEqual(O.fineText(O.season(day(2026, 10, 1))), 'Ends November 15 · Can’t be combined with other discounts');
});

test('the pop-up skips the Contact page', () => {
  assert.strictEqual(O.skipPath('/contact-2/'), true);
  assert.strictEqual(O.skipPath('/'), false);
  assert.strictEqual(O.skipPath('/computer-tune-up/'), false);
});

test('seen list reads leniently from storage text', () => {
  assert.deepStrictEqual(O.parseSeen(null), []);
  assert.deepStrictEqual(O.parseSeen('junk'), []);
  assert.deepStrictEqual(O.parseSeen('["new","fall-2026"]'), ['new', 'fall-2026']);
});
