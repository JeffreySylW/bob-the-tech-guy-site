// test/v1.8.21.test.js — run: node --test test/v1.8.21.test.js
// SEO audit 2026-10-19 fixes: business JSON-LD in the raw <head> (btg.js skips its copy), landmark/anchor fixes,
// VOB logo as a 2x WebP, a srcset for the home rig cut-out.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../dist/btg.js');
const L = require('../tools/loader.js');
const S = window.BTGSchema, I = window.BTGInit;

const ldOf = (block) => JSON.parse(/<script type="application\/ld\+json">([^<]*)<\/script>/.exec(block)[1]);

test('headBlock(): carries the LocalBusiness JSON-LD after the bundle, exactly what btg.js would build', () => {
  const block = L.headBlock('v1.8.21');
  assert.ok(block.endsWith(L.businessJsonLd() + '\n'));
  assert.ok(block.indexOf('btg.js"></script>\n<script type="application/ld+json">') > 0);
  assert.deepStrictEqual(ldOf(block), JSON.parse(JSON.stringify(S.buildLocalBusiness(I.SCHEMA))));
});

test('head JSON-LD: the business @id, hours and service area are filled in (not left to runtime getters)', () => {
  const j = ldOf(L.headBlock('v1.8.21'));
  assert.strictEqual(j['@type'], 'LocalBusiness');
  assert.strictEqual(j['@id'], 'https://bobthetechguy.com/#business');
  assert.strictEqual(j.openingHoursSpecification.length, 3);
  assert.strictEqual(j.areaServed.length, 10);
  assert.match(j.image, /bob-portrait\.jpg$/);
  assert.strictEqual(j.telephone, '+18448354890');
});

test('head JSON-LD: still no address of any kind (Rules: never the VA street; locality-only not approved)', () => {
  const block = L.headBlock('v1.8.21');
  assert.strictEqual(ldOf(block).address, undefined);
  assert.doesNotMatch(block, /address|streetAddress|PostalAddress|Broadway|postalCode/i);
});

test('head JSON-LD: nothing in it can close the script tag early', () => {
  assert.doesNotMatch(L.businessJsonLd().slice('<script type="application/ld+json">'.length, -'</script>'.length), /</);
});

// A fake <head> holding JSON-LD scripts, enough for hasId()/inject().
function fakeDoc(blocks) {
  const added = [];
  return {
    added,
    querySelectorAll: (sel) => (sel === 'script[type="application/ld+json"]' ? blocks.concat(added).map((t) => ({ textContent: t })) : []),
    createElement: () => ({}),
    head: { appendChild: (s) => added.push(s.textContent) },
  };
}

test('hasId(): matches the business by @id only, not any LocalBusiness, and survives bad JSON', () => {
  const ours = JSON.stringify({ '@id': 'https://bobthetechguy.com/#business', '@type': 'LocalBusiness' });
  const plugin = JSON.stringify({ '@type': 'LocalBusiness', name: 'Bob The Tech Guy' });
  assert.strictEqual(S.hasId(fakeDoc([plugin, '{not json']), 'https://bobthetechguy.com/#business'), false);
  assert.strictEqual(S.hasId(fakeDoc(['{not json', ours]), 'https://bobthetechguy.com/#business'), true);
});

test('inject(): skips the business block when the head field already printed it; adds it otherwise', () => {
  const head = L.businessJsonLd().replace(/^<script[^>]*>|<\/script>$/g, '');
  global.document = fakeDoc([head]);
  assert.strictEqual(S.inject(I.SCHEMA), false);
  assert.strictEqual(document.added.length, 0);
  global.document = fakeDoc([]);
  assert.strictEqual(S.inject(I.SCHEMA), true);
  assert.strictEqual(document.added.length, 1);
  delete global.document;
});

// Elements by selector, as fixLandmarks() asks for them.
function el(attrs = {}) {
  return { a: Object.assign({}, attrs), hasAttribute(k) { return k in this.a; }, setAttribute(k, v) { this.a[k] = v; } };
}
function landmarkDoc(map, hasMain) {
  return { querySelectorAll: (sel) => map[sel] || [], querySelector: (sel) => (sel === 'main, [role="main"]' && hasMain ? {} : null) };
}

test('fixLandmarks(): names the menu link, makes the search icon a named button, hides the empty page-load link, marks #main', () => {
  const bars = el({ href: '#', class: 'fusion-icon fusion-icon-bars' }), search = el(), load = el(), main = el({ id: 'main' });
  I.fixLandmarks(landmarkDoc({
    'a.fusion-icon-bars': [bars], 'a.fusion-main-menu-icon:not([href])': [search],
    'a.fusion-one-page-text-link:not([href])': [load], '#main': [main],
  }, false));
  assert.deepStrictEqual(bars.a, { href: '#', class: 'fusion-icon fusion-icon-bars', 'aria-label': 'Menu' });
  assert.deepStrictEqual(search.a, { role: 'button', 'aria-label': 'Search' });
  assert.deepStrictEqual(load.a, { role: 'presentation', 'aria-hidden': 'true' });
  assert.deepStrictEqual(main.a, { id: 'main', role: 'main' });
});

test('fixLandmarks(): never overwrites existing attributes and adds no second main landmark', () => {
  const bars = el({ 'aria-label': 'Open menu' }), main = el({ id: 'main' });
  I.fixLandmarks(landmarkDoc({ 'a.fusion-icon-bars': [bars], '#main': [main] }, true));
  assert.strictEqual(bars.a['aria-label'], 'Open menu');
  assert.strictEqual(main.a.role, undefined);
});

test('VOB logo: a 300x64 WebP (2x for its 150x32 box), same alt and size in the badge', () => {
  assert.match(window.BTGVet.LOGO, /@v1\.8\.21\/dist\/brand\/vob-logo-300x64\.webp$/);
  const f = fs.readFileSync(path.join(__dirname, '../dist/brand/vob-logo-300x64.webp'));
  assert.strictEqual(f.toString('ascii', 8, 12), 'WEBP');
  assert.ok(f.length < 20000, f.length + ' bytes');
  assert.ok(window.BTGVet.badgeHtml(true).includes('alt="VeteranOwnedBusiness.com" width="150" height="32"'));
});

test('rig cut-out: 360/540/720 srcset from the pinned photo folder, files present and smaller', () => {
  const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');
  const base = js.match(/var PHOTO_BASE = '([^']+)'/)[1];
  assert.strictEqual(base, 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.8.21/dist/brand/photos/');
  const dir = path.join(__dirname, '../dist/brand/photos/');
  const size = (f) => fs.statSync(dir + f).size;
  assert.ok(size('gaming-rig-cutout-360.webp') < size('gaming-rig-cutout-540.webp'));
  assert.ok(size('gaming-rig-cutout-540.webp') < size('gaming-rig-cutout.webp'));
  // Run initRig on a fake home page and read the <img> it builds.
  let html = '';
  const box = { parentNode: { insertBefore: (n) => { html = n.innerHTML; } }, nextSibling: null };
  const doc = {
    querySelector: (s) => (/fusion-reading-box-container/.test(s) ? box : null),
    querySelectorAll: () => [],
    createElement: () => ({ style: { setProperty() {} }, setAttribute() {} }),
  };
  window.BTGBob.initRig(doc, { location: { pathname: '/' } });
  assert.match(html, new RegExp('srcset="' + base + 'gaming-rig-cutout-360\\.webp 360w, ' + base + 'gaming-rig-cutout-540\\.webp 540w, ' + base + 'gaming-rig-cutout\\.webp 720w"'));
  assert.match(html, /sizes="\(max-width: 1000px\) min\(86vw, 420px\), 360px"/);
  assert.match(html, new RegExp('src="' + base + 'gaming-rig-cutout\\.webp"'));
});
