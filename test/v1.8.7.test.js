// test/v1.8.7.test.js — run: node --test test/v1.8.7.test.js
// SEO audit fixes (2026-10-13): richer business schema (logo, email, service area as places), a proper search page title.
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const S = window.BTGSchema, I = window.BTGInit;

test('LocalBusiness schema: logo and email, still no address of any kind', () => {
  const s = S.buildLocalBusiness(I.SCHEMA);
  assert.strictEqual(s.logo, 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.8.6/dist/brand/logo-564x160.png');
  assert.strictEqual(s.email, 'info@bobthetechguy.com');
  assert.deepStrictEqual(s.address, { '@type': 'PostalAddress', addressLocality: 'Chesterfield', addressRegion: 'VA', addressCountry: 'US' }); // locality only since v1.8.22
  assert.doesNotMatch(JSON.stringify(s), /Broadway|streetAddress/);
});

test('LocalBusiness schema: service area as City places with their state', () => {
  const s = S.buildLocalBusiness(I.SCHEMA);
  assert.deepStrictEqual(s.areaServed[0], { '@type': 'City', name: 'Chesterfield', containedInPlace: { '@type': 'State', name: 'Virginia' } });
  assert.deepStrictEqual(s.areaServed[s.areaServed.length - 1], { '@type': 'City', name: 'Pompton Lakes', containedInPlace: { '@type': 'State', name: 'New Jersey' } });
  assert.strictEqual(s.areaServed.length, 10);
});

test('search page gets its own title instead of the WordPress default', () => {
  assert.strictEqual(I.pageTitle('/search/'), 'Search Services | Bob The Tech Guy');
});
