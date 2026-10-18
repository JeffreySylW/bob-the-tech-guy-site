// test/service-photos.test.js — run: node --test test/service-photos.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../dist/btg.js');
const B = window.BTGBob;
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');
// The tag pin moves with each photo release (test/e2e/home-rig.e2e.mjs checks the exact tag); here only the folder matters.
const BASE = js.match(/var PHOTO_BASE = '(https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v[0-9.]+\/dist\/brand\/photos\/)'/)[1];

// 2026-10-17: Jeff approved Bob's newer photos for six service pages (Hardware Repair keeps Bob's own photo).
test('photoFor(): only the six approved service pages get a photo', () => {
  const want = { '/hardware-repair-upgrades/': 'bob-repairing-pc.jpg', '/hardware-install/': 'psu-install.jpg', '/memory-install/': 'memory-ram.jpg', '/operating-system-install/': 'system-error.jpg', '/screen-replacement/': 'broken-screen.jpg', '/computer-tune-up/': 'laptop-fan.jpg' };
  for (const [p, f] of Object.entries(want)) {
    const x = B.photoFor(p);
    assert.strictEqual(x.src, BASE + f, p);
    assert.ok(x.alt.length > 10 && x.width > 0 && x.height > 0);
    assert.ok(fs.existsSync(path.join(__dirname, '../dist/brand/photos/' + f)), f);
  }
  for (const p of ['/', '/data-recovery-service/', '/networking/', '/about/', '/pc-repair-service-wyckoff-new-jersey/']) assert.strictEqual(B.photoFor(p), null, p);
});
test('photoFor() ignores a missing trailing slash', () => {
  assert.ok(B.photoFor('/memory-install'));
});
test('the photos are small enough for a phone connection', () => {
  for (const f of fs.readdirSync(path.join(__dirname, '../dist/brand/photos'))) assert.ok(fs.statSync(path.join(__dirname, '../dist/brand/photos/' + f)).size < 100000, f);
});
test('bundle runs it and styles the photo row', () => {
  assert.match(js, /window\.BTGBob\.initPhoto\(document, window\)/);
  assert.match(css, /\.btg-photo-row \{[^}]*display: grid;/);
  assert.match(css, /\.btg-photo-fig img \{/);
});

test('split-layout pages get the photo inside the text column, not a third column', () => {
  assert.match(js, /btg-split-text/);
  assert.match(css, /\.btg-split-text \.btg-photo-fig \{/);
  assert.match(css, /\.btg-photo-fig--wrap \{[^}]*float: right;/);
});

test('on the two-column pages the photo floats inside the intro text (placed first so the text wraps)', () => {
  assert.match(js, /text\.insertBefore\(fig, text\.firstChild\)/);
  assert.match(css, /\.btg-split:not\(\.btg-split--stacked\) \.btg-split-text \.btg-photo-fig \{[^}]*float: right;[^}]*width: 160px;/);
});

// initPhoto() on a tiny fake page: hero, then the split block (className as given), with an intro text column.
function fakePage(splitClass) {
  const el = (cls) => ({ className: cls, children: [], innerHTML: '', parentNode: null,
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    insertBefore(c, ref) { c.parentNode = this; const i = this.children.indexOf(ref); this.children.splice(i < 0 ? this.children.length : i, 0, c); return c; },
    get firstChild() { return this.children[0] || null; },
    querySelector(sel) { for (const c of this.children) { if (c.className.split(' ').includes(sel.slice(1))) return c; const d = c.querySelector(sel); if (d) return d; } return null; } });
  const body = el('post-content'), hero = el('btg-hero'), split = el(splitClass), text = el('btg-split-text');
  text.appendChild(el('intro-p'));
  split.appendChild(text); body.appendChild(hero); body.appendChild(split);
  hero.nextElementSibling = split;
  const doc = { createElement: () => el(''), querySelector: (s) => body.querySelector(s) };
  return { doc, text, body };
}
for (const [cls, where, figClass] of [
  ['btg-split', 'first', 'btg-photo-fig'],
  ['btg-split btg-split--stacked', 'last', 'btg-photo-fig btg-photo-fig--wrap']
]) {
  test(`initPhoto() puts the photo inside the intro text on a "${cls}" page`, () => {
    const { doc, text, body } = fakePage(cls);
    assert.strictEqual(B.initPhoto(doc, { location: { pathname: '/hardware-install/' } }), true);
    assert.strictEqual(body.querySelector('.btg-photo-row'), null, 'no side photo row');
    const fig = text.children[where === 'first' ? 0 : text.children.length - 1];
    assert.strictEqual(fig.className, figClass);
  });
}

// The declared width/height are what the browser reserves space with; they must be the file's real size (no layout jump).
function jpegSize(file) {
  const b = fs.readFileSync(file);
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error('no size in ' + file);
}
test('every photo declares the real size of its file', () => {
  for (const p of ['/hardware-repair-upgrades/', '/hardware-install/', '/memory-install/', '/operating-system-install/', '/screen-replacement/', '/computer-tune-up/']) {
    const x = B.photoFor(p);
    const f = path.join(__dirname, '../dist/brand/photos/' + x.src.split('/').pop());
    assert.deepStrictEqual(jpegSize(f), [x.width, x.height], p);
  }
});
