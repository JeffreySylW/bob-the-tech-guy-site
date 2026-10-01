// test/v1.6.0.test.js — run: node --test test/v1.6.0.test.js
// Reviews band, New Jersey consolidation, crypto-widget blocker, request-a-visit, descriptions.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../dist/btg.js');
const R = window.BTGReviews, I = window.BTGInit;
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');

test('REVIEWS are the 12 real reviewers, each with a name and text; 7 carry a 5-star rating', () => {
  assert.strictEqual(R.REVIEWS.length, 12);
  assert.ok(R.REVIEWS.every((r) => r.name && r.text.length > 10));
  assert.strictEqual(R.REVIEWS.filter((r) => r.rating === 5).length, 7);
  assert.ok(R.REVIEWS.some((r) => r.name === 'Drew C.' && r.place === 'Pompton Lakes, NJ'));
});

test('summary without Google details: on-site numbers, no Google claim, link to all reviews', () => {
  const h = R.summaryHtml({ url: '', rating: 0, count: 0 });
  assert.match(h, /5\.0/);
  assert.match(h, /7 star ratings/);
  assert.match(h, /12 written reviews/);
  assert.doesNotMatch(h, /Google/);
  assert.match(h, /href="\/reviews\/"/);
});

test('summary with Google details switches to Google rating, count and review button', () => {
  const h = R.summaryHtml({ url: 'https://g.page/r/abc/review', rating: 4.9, count: 41 });
  assert.match(h, /4\.9/);
  assert.match(h, /41 Google reviews/);
  assert.match(h, /href="https:\/\/g\.page\/r\/abc\/review"[^>]*>Review us on Google/);
});

test('cards escape text, show stars only when rated, and have an accessible Read more', () => {
  const rated = R.cardHtml({ name: 'A <b>', place: '', date: 'Jun 8, 2018', rating: 5, text: 'x'.repeat(300) }, 0);
  assert.doesNotMatch(rated, /<b>/);
  assert.match(rated, /aria-label="5 out of 5 stars"/);
  assert.match(rated, /<button type="button" class="btg-rv-more" aria-expanded="false"/);
  const plain = R.cardHtml({ name: 'B', place: 'Riverdale, NJ', date: '', rating: 0, text: 'Short.' }, 1);
  assert.doesNotMatch(plain, /stars"/);
  assert.match(plain, /Riverdale, NJ/);
});

test('band has a labelled region and previous/next controls', () => {
  const h = R.bandHtml({ url: '', rating: 0, count: 0 });
  assert.match(h, /<section class="btg-rv" aria-label="Customer reviews">/);
  assert.match(h, /aria-label="Previous reviews"/);
  assert.match(h, /aria-label="Next reviews"/);
});

test('New Jersey area links point at the one Northern New Jersey page', () => {
  const T = '/northern-new-jersey/';
  for (const p of ['/best-computer-repair-pompton-lakes-nj/', '/pc-repair-service-wyckoff-new-jersey/', '/wyckoff-nj-antivirus/', '/wireless-networking-pequannock-township/', '/pc-repair-passaic-county/']) assert.strictEqual(I.njTarget(p), T, p);
  for (const p of ['/northern-new-jersey/', '/pc-repair-service-chester-virginia/', '/networking/', '/about/', '/', '/wp-content/uploads/nj.jpg']) assert.strictEqual(I.njTarget(p), null, p);
});

test('the cryptocurrency widget script is recognised and blocked', () => {
  assert.strictEqual(I.isBlockedScript('https://files.coinmarketcap.com/static/widget/currency.js'), true);
  assert.strictEqual(I.isBlockedScript('https://cdn.jsdelivr.net/gh/x/btg.js'), false);
  assert.match(js, /javascript\/blocked/);
});

test('request-a-visit link names the service and lands on the contact form', () => {
  assert.strictEqual(I.requestHref('Hardware Repair & Upgrades'), '/contact-2/?service=Hardware%20Repair%20%26%20Upgrades#btg-request');
});

test('every main page has a 110–160 character description', () => {
  for (const p of ['/', '/about/', '/services-2/', '/contact-2/', '/testimonials/', '/gallery/', '/networking/', '/anti-virus/', '/computer-tune-up/', '/northern-new-jersey/', '/customer-log-in/', '/search/']) {
    const d = I.DESCRIPTIONS[p];
    assert.ok(d && d.length >= 110 && d.length <= 160, p + ' ' + (d && d.length));
  }
});

test('styles: reviews band, request button, old share buttons hidden', () => {
  assert.match(css, /\.btg-rv \{/);
  assert.match(css, /\.btg-rv-track \{[^}]*scroll-snap-type: x mandatory;/);
  assert.match(css, /\.btg-request-btn \{/);
  assert.match(css, /\.fusion-sharing-box \{ display: none !important; \}/);
});

test('home section titles become h2 but keep their old 34px look', () => {
  assert.match(css, /\.home \.fusion-title-size-two h2\.title-heading-left \{ font-size: 34px !important; line-height: 48px !important; font-weight: 300 !important;/);
});
