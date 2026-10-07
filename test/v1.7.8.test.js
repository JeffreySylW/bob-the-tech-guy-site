// test/v1.7.8.test.js — run: node --test test/v1.7.8.test.js
// SEO pass 2 (Editor-access items): related-services links, Service/LocalBusiness schema, noindex on the search page,
// titles and descriptions for the Support and Tech Certificates pages.
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const I = window.BTGInit, S = window.BTGSchema, B = window.BTGBob;
const T = (u) => 'https://bobthetechguy.com' + u;

test('related services: the next three in the same Services group, wrapping around, never the page itself', () => {
  const r = (p) => I.relatedServices(p).map((x) => x.url.replace('https://bobthetechguy.com', ''));
  assert.deepStrictEqual(r('/hardware-repair-upgrades/'), ['/screen-replacement/', '/memory-install/', '/hardware-install/']);
  assert.deepStrictEqual(r('/data-recovery-service/'), ['/hardware-repair-upgrades/', '/screen-replacement/', '/memory-install/']);
  assert.deepStrictEqual(r('/email-setup/'), ['/computer-set-up/', '/operating-system-install/', '/software-installation-and-configuration/']);
  assert.deepStrictEqual(r('/parental-controls/'), ['/networking/', '/anti-virus/', '/backup-solutions/']);
  for (const p of ['/networking/', '/anti-virus/', '/backup-solutions/', '/printer-solutions/']) assert.ok(!r(p).includes(p), p);
  assert.deepStrictEqual(I.relatedServices('/about/'), []);
  assert.deepStrictEqual(I.relatedServices('/'), []);
});

test('related services row: heading, three icon links, a link to every service, built from page data only', () => {
  const h = I.relatedHtml('/memory-install/');
  assert.match(h, /^<section class="btg-related" aria-label="Related services"><h2 class="btg-related-h">Related services<\/h2>/);
  assert.strictEqual((h.match(/class="btg-related-link /g) || []).length, 3);
  assert.match(h, /href="https:\/\/bobthetechguy\.com\/hardware-install\/"/);
  assert.match(h, /<a class="btg-related-all" href="https:\/\/bobthetechguy\.com\/services-2\/">See all services/);
  assert.strictEqual(I.relatedHtml('/about/'), '');
});

test('LocalBusiness schema gains an @id, an image and the founder, and still no address', () => {
  const s = S.buildLocalBusiness(I.SCHEMA);
  assert.strictEqual(s['@id'], T('/#business'));
  assert.strictEqual(s.image, B.PORTRAIT);
  assert.deepStrictEqual(s.founder, { '@type': 'Person', name: 'Bob Dyer' });
  assert.strictEqual(s.address, undefined);
  assert.doesNotMatch(JSON.stringify(s), /Broadway|streetAddress/);
});

test('Service schema on service pages only, tied to the business by @id', () => {
  const s = I.serviceSchema('/networking/');
  assert.strictEqual(s['@type'], 'Service');
  assert.strictEqual(s.name, 'Networking');
  assert.strictEqual(s.url, T('/networking/'));
  assert.deepStrictEqual(s.provider, { '@id': T('/#business') });
  assert.ok(s.areaServed.includes('Chesterfield VA'));
  assert.strictEqual(s.address, undefined);
  for (const p of ['/', '/about/', '/contact-2/', '/northern-new-jersey/', '/best-computer-repair-chesterfield-va/']) assert.strictEqual(I.serviceSchema(p), null, p);
});

test('the search results page asks not to be indexed; real pages do not', () => {
  assert.strictEqual(I.robotsFor('/search/'), 'noindex, follow');
  for (const p of ['/', '/about/', '/networking/', '/best-computer-repair-chesterfield-va/', '/support/']) assert.strictEqual(I.robotsFor(p), null, p);
});

test('Support and Tech Certificates get accurate titles and 110-160 character descriptions', () => {
  assert.strictEqual(I.pageTitle('/support/'), 'Support App Download | Bob The Tech Guy');
  assert.strictEqual(I.pageTitle('/tech-certificates/'), 'Tech Gift Certificates | Bob The Tech Guy');
  for (const p of ['/support/', '/tech-certificates/']) { const d = I.DESCRIPTIONS[p]; assert.ok(d && d.length >= 110 && d.length <= 160, p + ' ' + (d && d.length)); }
});
