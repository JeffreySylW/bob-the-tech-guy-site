// test/v1.6.8.test.js — run: node --test test/v1.6.8.test.js
// The 10 reviews approved on 2026-10-04 join the home page reviews strip, newest first.
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const R = window.BTGReviews.REVIEWS;

test('home strip carries all 22 site reviews, every one rated 5 stars except the 5 unrated originals', () => {
  assert.strictEqual(R.length, 22);
  assert.strictEqual(R.filter((r) => r.rating === 5).length, 17);
});

test('newest first: Frank Abate (Apr 28, 2022) leads; Lauren and Deraney are in', () => {
  assert.deepStrictEqual([R[0].name, R[0].date], ['Frank Abate', 'Apr 28, 2022']);
  assert.ok(R.some((r) => r.name === 'Lauren' && /external hard drive/.test(r.text)));
  assert.ok(R.some((r) => r.name === 'Daniel F. Deraney, Esq.' && /Law Firm/.test(r.text)));
  assert.ok(R.every((r) => !/bob@bobthetechguy|<br|&#/.test(r.text)), 'no signature, markup or entities');
});

test('footer hours match the Google listing (2026-10-04) and get their own heading', () => {
  const F = window.BTGFooter;
  assert.deepStrictEqual(F.HOURS, [['Tue', '9:30 AM–7 PM'], ['Wed–Fri', '9:30 AM–5 PM'], ['Sat', '12–3 PM'], ['Sun–Mon', 'Closed']]);
  assert.match(F.hoursHtml(F.HOURS), /^<h4 class="widget-title btg-foot-hours-h">Hours<\/h4><dl class="btg-foot-hours">/);
});
