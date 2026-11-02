// test/offer.test.js — run: node --test test/offer.test.js
// Bob's monthly offer (vault "Ad Pop-up", 2026-11-02): every 10% offer running now, in one slider (new customers first),
// never combined; the pop-up opens on the first offer the visitor hasn't seen.
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const O = window.BTGOffer;
const day = (y, m, d) => new Date(y, m - 1, d, 12);
const keys = (c) => c.offers.map((o) => o.key).join(',');

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

test('every offer running now is in the slider, new customers first', () => {
  assert.strictEqual(keys(O.choose(day(2026, 11, 2), [])), 'new,fall');
  assert.strictEqual(keys(O.choose(day(2026, 12, 10), [])), 'new,holiday');
  assert.strictEqual(keys(O.choose(day(2026, 6, 1), [])), 'new');
});

test('first visit: the pop-up shows and opens on new customers', () => {
  const c = O.choose(day(2026, 11, 2), []);
  assert.strictEqual(c.popup, true);
  assert.strictEqual(c.start, 0);
});

test('the new-customer offer stays in the slider after it is seen; the pop-up opens on the unseen season offer', () => {
  const c = O.choose(day(2026, 11, 2), ['new']);
  assert.strictEqual(keys(c), 'new,fall');
  assert.strictEqual(c.popup, true);
  assert.strictEqual(c.start, 1);
});

test('nothing unseen: no pop-up (the strip still lists every offer)', () => {
  const c = O.choose(day(2026, 11, 2), ['new', 'fall-2026']);
  assert.strictEqual(c.popup, false);
  assert.strictEqual(keys(c), 'new,fall');
  assert.strictEqual(O.choose(day(2026, 6, 1), ['new']).popup, false);
});

test('a season offer seen last year counts as unseen this year', () => {
  const c = O.choose(day(2027, 10, 1), ['new', 'fall-2026']);
  assert.strictEqual(c.popup, true);
  assert.strictEqual(c.offers[c.start].id, 'fall-2027');
});

test('no stacking, and the new-customer disclaimer', () => {
  O.OFFERS.forEach((o) => {
    assert.match(o.title, /^10% off /, o.key);
    assert.match(O.fineText(o), /Can.t be combined with other discounts$/, o.key);
  });
  assert.strictEqual(O.fineText(O.OFFERS[0]), 'Only applies if you haven’t purchased any services from Bob before · Can’t be combined with other discounts');
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

// The discount choice on the Contact form and the helper's form (Jeff, 2026-11-02): it fills form 16906's hidden
// discount (body line) and discount-tag (subject, after "Sent via ...") fields. Only offers running that day count.
test('discountFields: a running offer fills both fields; none, unknown or out-of-season offers send none', () => {
  assert.deepStrictEqual(O.discountFields('fall', day(2026, 11, 2)), { discount: '10% fall clean-up', 'discount-tag': ' - 10% fall clean-up' });
  assert.deepStrictEqual(O.discountFields('new', day(2026, 11, 2)), { discount: '10% new customers', 'discount-tag': ' - 10% new customers' });
  const none = { discount: 'none', 'discount-tag': '' };
  assert.deepStrictEqual(O.discountFields('', day(2026, 11, 2)), none);
  assert.deepStrictEqual(O.discountFields('holiday', day(2026, 11, 2)), none);
  assert.deepStrictEqual(O.discountFields('bogus', day(2026, 11, 2)), none);
});

test('discountHtml: No discount plus one radio per running offer, one choice only, the chosen one checked', () => {
  const html = O.discountHtml('d1', 'fall', day(2026, 11, 2));
  const radios = html.match(/<input type="radio"[^>]*>/g);
  assert.strictEqual(radios.length, 3);
  assert.deepStrictEqual(radios.map((r) => /value="([^"]*)"/.exec(r)[1]), ['', 'new', 'fall']);
  assert.ok(radios.every((r) => r.includes('name="d1"')));
  assert.ok(/value="fall" checked/.test(html) && !/value="new" checked/.test(html));
  assert.match(html, /only if you haven’t purchased any services from Bob before/);
  assert.match(html, /one per job/);
  assert.ok(/value="" checked/.test(O.discountHtml('d1', 'holiday', day(2026, 11, 2))), 'an offer not running falls back to No discount');
});

test('helper requests carry the chosen discount; without one they say none', () => {
  const f = { name: 'Jane', phone: '804 555 0100', email: '', area: 'va', summary: 'Slow PC', topic: 'slow' };
  assert.strictEqual(window.BTGHelper.buildFields(f).discount, 'none');
  const withFall = window.BTGHelper.buildFields(Object.assign({ discount: 'fall', now: day(2026, 11, 2) }, f));
  assert.strictEqual(withFall.discount, '10% fall clean-up');
  assert.strictEqual(withFall['discount-tag'], ' - 10% fall clean-up');
});

test('the offer buttons pre-select their discount on the Contact form', () => {
  assert.strictEqual(O.hrefFor({ key: 'fall' }), '/contact-2/?offer=fall#btg-request');
});
