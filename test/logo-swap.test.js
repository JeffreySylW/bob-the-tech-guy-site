// test/logo-swap.test.js — run: node --test test/logo-swap.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../tools/logo-swap.js');
const fx = (f) => fs.readFileSync(path.join(__dirname, '..', 'backups', '2026-09-26', f), 'utf8');
const OLD = 'https://bobthetechguy.com/wp-content/uploads/2015/12/Bob-The-Tech-Guy-3.jpg';

test('swapLogo() replaces the linked old logo with the new image, both markup variants', () => {
  for (const f of ['2.html', '11802.html']) {
    const before = fx(f);
    const after = L.swapLogo(before, 'v1.3.2');
    assert.ok(!after.includes('Bob-The-Tech-Guy'), f);
    assert.strictEqual((after.match(/<img [^>]*btg-content-logo[^>]*>/g) || []).length, 1, f);
    assert.match(after, /<img class="alignnone btg-content-logo" src="https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v1\.3\.2\/dist\/logo\.png" alt="Bob The Tech Guy" width="282" height="80">/);
  }
});

test('swapLogo() changes nothing else on the page', () => {
  const before = fx('2.html');
  const after = L.swapLogo(before, 'v1.3.2');
  const snippet = before.match(L.OLD_LOGO)[0];
  assert.strictEqual(after, before.replace(snippet, L.newLogo('v1.3.2')));
});

test('swapLogo() refuses a page without exactly one old logo', () => {
  assert.throws(() => L.swapLogo('<p>no logo</p>', 'v1.3.2'), /exactly one/);
  const two = fx('2.html') + '\n' + fx('2.html').match(L.OLD_LOGO)[0];
  assert.throws(() => L.swapLogo(two, 'v1.3.2'), /exactly one/);
});

test('swapLogo() refuses an old logo it cannot fully replace (e.g. a bare image)', () => {
  const bare = '<p><img src="' + OLD + '" alt="x"></p>';
  assert.throws(() => L.swapLogo(bare, 'v1.3.2'), /exactly one/);
  const mixed = fx('2.html') + '<img src="' + OLD + '">';
  assert.throws(() => L.swapLogo(mixed, 'v1.3.2'), /still references/);
});

test('dist/logo.png exists at 2x of the 282x80 slot', () => {
  const buf = fs.readFileSync(path.join(__dirname, '..', 'dist', 'logo.png'));
  assert.strictEqual(buf.readUInt32BE(16), 564);
  assert.strictEqual(buf.readUInt32BE(20), 160);
});
