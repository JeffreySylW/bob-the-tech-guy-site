// test/remote-support.test.js — run: node --test test/remote-support.test.js
// The Remote Support service (Bob's request, 2026-10-17) must appear everywhere the other 15 services do.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../dist/btg.js');
const I = window.BTGInit, H = window.BTGHeader, S = window.BTGSearch;
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const SLUG = 'remote-support';
const URL = 'https://bobthetechguy.com/remote-support/';

test('Remote Support is the last item of the "Setup & Software" menu group, with its own icon', () => {
  const g = H.GROUPS.find((x) => /Setup/.test(x.name));
  assert.deepStrictEqual(g.items[g.items.length - 1], [SLUG, 'remote']);
  assert.strictEqual(H.GROUPS.flatMap((x) => x.items).length, 16);
});

test('the Services index uses the same groups as the header (test/header.test.js keeps them equal)', () => {
  const idx = require('../tools/services-index.js');
  assert.deepStrictEqual(idx.GROUPS, H.GROUPS);
});

test('search knows the page: a service, with everyday words for it, and 16 services in all', () => {
  const p = S.PAGES.find((x) => x.url === URL);
  assert.ok(p, 'in search data');
  assert.strictEqual(p.type, 'SERVICE');
  assert.strictEqual(p.title, 'Remote Support');
  assert.strictEqual(p.icon, 'remote');
  for (const w of ['remote', 'online', 'internet']) assert.ok(p.keywords.includes(w), w);
  assert.strictEqual(S.PAGES.filter((x) => x.type === 'SERVICE').length, 16);
});

test('the source list for the search data has it too (so the next rebuild keeps it)', () => {
  const src = require('../tools/search-pages.js');
  assert.ok(src.some((x) => x.url === URL && x.type === 'SERVICE'));
});

test('related services: its neighbours link to it and it links back to its own group', () => {
  const rel = (p) => I.relatedServices(p).map((x) => x.url.replace('https://bobthetechguy.com/', ''));
  assert.ok(rel('/email-setup/').includes('remote-support/'), 'email setup -> remote support');
  const mine = rel('/remote-support/');
  assert.ok(mine.length >= 3 && !mine.includes('remote-support/'), 'three neighbours, never itself');
  assert.ok(mine.includes('computer-set-up/'));
});

test('title, description and service schema', () => {
  assert.strictEqual(I.pageTitle('/remote-support/'), 'Remote Computer Support | Bob The Tech Guy');
  const d = I.DESCRIPTIONS['/remote-support/'];
  assert.ok(d && d.length >= 110 && d.length <= 160, 'description length ' + (d && d.length));
  assert.match(d, /remote/i);
  const s = I.serviceSchema('/remote-support/');
  assert.strictEqual(s['@type'], 'Service');
  assert.strictEqual(s.name, 'Remote Support');
  assert.strictEqual(s.url, URL);
});

test('the icon exists in the stylesheet, for the menu, the index, search and the page card', () => {
  assert.match(css, /\.btg-card--remote::before \{[^}]*background-image: url\("data:image\/svg\+xml/);
});

// The live pages that list every service as static content get the new card by a small, strict edit (tools/add-service-item.js).
// The proof that the edit is right: it gives exactly what the official generators give for a page that already has the card.
const A = require('../tools/add-service-item.js');
const REMOTE_SR = /<li><a class="btg-sr-item btg-card--remote"[\s\S]*?<\/a><\/li>/;
const REMOTE_PANEL = /<li><a class="btg-panel-link btg-card--remote"[\s\S]*?<\/a><\/li>/;

// (The search page stores no list: the bundle draws it from the search data, which test 3 above covers.)
for (const [name, mod] of [['Virginia', '../tools/va-page.js'], ['northern New Jersey', '../tools/nj-page.js']]) {
  test(`${name} page: the new card goes last in the service list, exactly where the generator puts it`, () => {
    const whole = require(mod)('v1.8.10');
    assert.match(whole, REMOTE_SR, 'the generator lists it');
    const without = whole.replace(REMOTE_SR, '');
    assert.doesNotMatch(without, /remote-support/);
    assert.strictEqual(A.addToSrList(without), whole);
  });
}

test('Services index: the new card goes last in "Setup & Software", exactly where buildIndex puts it', () => {
  const idx = require('../tools/services-index.js');
  const menu = idx.parseServicesMenu(fs.readFileSync(path.join(__dirname, 'fixtures/menu.html'), 'utf8'));
  const whole = idx.buildIndex(fs.readFileSync(path.join(__dirname, 'fixtures/11653.html'), 'utf8'), menu);
  assert.match(whole, REMOTE_PANEL);
  const without = whole.replace(REMOTE_PANEL, '');
  assert.strictEqual(A.addToIndex(without), whole);
});

test('the edit refuses to run twice or on a page without the list (so a wrong page is never saved)', () => {
  const whole = require('../tools/va-page.js')('v1.8.10');
  assert.throws(() => A.addToSrList(whole), /Already/);
  assert.throws(() => A.addToSrList('<p>No list here</p>'), /list/i);
  assert.throws(() => A.addToIndex('<p>No panels here</p>'), /panel/i);
});
