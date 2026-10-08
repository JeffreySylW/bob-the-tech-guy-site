// test/v1.6.5.test.js — run: node --test test/v1.6.5.test.js
// Footer additions: contact block, quick links, Google rating badge, hours (staged until Bob sends them).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
global.window = global;
require('../dist/btg.js');
const F = window.BTGFooter;
const css = fs.readFileSync(require('node:path').join(__dirname, '../dist/btg.css'), 'utf8');

test('contact details: both numbers, email, Virginia service area, NJ link, no street address', () => {
  const h = F.regionHtml('va') + F.regionHtml('nj'); // v1.8.0: one block per region
  assert.match(h, /href="tel:8448354890"[^>]*>844-TEKGUY-0/);
  assert.match(h, /href="tel:8622105656"[^>]*>\(862\) 210-5656/);
  assert.match(h, /href="mailto:info@bobthetechguy\.com"/);
  assert.match(h, /Chesterfield &amp; Greater Richmond, VA/);
  assert.match(h, /href="https:\/\/bobthetechguy\.com\/northern-new-jersey\/"/);
  assert.doesNotMatch(h, /Broadway|Pompton Lakes, NJ/);
});

test('quick links match the main menu pages', () => {
  const h = F.linksHtml();
  assert.doesNotMatch(h, /customer-log-in|Log In/);
  for (const p of ['/services-2/', '/about/', '/gallery/', '/testimonials/', '/contact-2/']) assert.ok(h.includes('href="https://bobthetechguy.com' + p + '"'), p);
});

test('rating badge links to the Google listing; hours stay hidden until set', () => {
  const h = F.ratingHtml(window.BTGReviews.GOOGLE);
  assert.match(h, /5\.0/);
  assert.match(h, /28 Google reviews/);
  assert.match(h, /href="https:\/\/maps\.google\.com\/\?cid=12486145650775343960"[^>]*rel="noopener"/);
  assert.strictEqual(F.hoursHtml([]), '');
  assert.match(F.hoursHtml([['Mon–Fri', '9–6']]), /<dt>Mon–Fri<\/dt><dd>9–6<\/dd>/);

});

test('footer styles exist', () => {
  assert.match(css, /\.btg-foot-rating \{/);
  assert.match(css, /\.btg-foot-links \{/);
});
