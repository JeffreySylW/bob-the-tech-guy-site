// test/nj-page.test.js — run: node --test test/nj-page.test.js
const test = require('node:test');
const assert = require('node:assert');
const N = require('../tools/nj-page.js');
const G = require('../tools/markup-guard.js');
const html = N('v1.6.0');

test('Northern New Jersey page: hero with the NJ phone line, one h1', () => {
  assert.ok(html.startsWith('<section class="btg-hero">'));
  assert.strictEqual((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /href="tel:8622105656"/);
  assert.match(html, /Continuing to serve our northern New Jersey customers\./);
});
test('links every service page and lists the towns served', () => {
  assert.strictEqual((html.match(/class="btg-sr-item /g) || []).length, 15);
  for (const t of ['Pompton Lakes', 'Wyckoff', 'Ramsey', 'Mahwah', 'Wayne', 'Ridgewood', 'Bergen County', 'Passaic County']) assert.ok(html.includes('<li>' + t + '</li>'), t);
});
test('has no reviews band (home page only), a call box with both numbers, and ends with the standard loader', () => {
  assert.doesNotMatch(html, /btg-rv-slot|What customers say/);
  assert.match(html, /<div class="btg-cta-block">[\s\S]*844-TEKGUY-0[\s\S]*\(862\) 210-5656/);
  assert.ok(html.endsWith(require('../tools/loader.js').loaderBlock('v1.6.0')));
});
test('body markup stays inside the safe allowlist', () => {
  const body = html.slice(html.indexOf('</section>') + 10, html.indexOf('<!-- btg-loader'));
  // The one allowed embed: the Google Maps area view (v1.6.6).
  const rest = body.replace(/<iframe class="btg-nj-map" src="https:\/\/maps\.google\.com\/maps\?[^"]*" [^>]*><\/iframe>/, '');
  assert.strictEqual((body.match(/<iframe/g) || []).length, 1);
  assert.deepStrictEqual(G.markupProblems(rest), []);
});
