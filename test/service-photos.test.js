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
const BASE = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.5.10/dist/brand/photos/';

test('photoFor(): only the four approved pages get a photo', () => {
  const want = { '/hardware-repair-upgrades/': 'bob-repairing-pc.jpg', '/hardware-install/': 'graphics-card.jpg', '/memory-install/': 'motherboard-memory.jpg', '/operating-system-install/': 'os-install.jpg' };
  for (const [p, f] of Object.entries(want)) {
    const x = B.photoFor(p);
    assert.strictEqual(x.src, BASE + f, p);
    assert.ok(x.alt.length > 10 && x.width > 0 && x.height > 0);
    assert.ok(fs.existsSync(path.join(__dirname, '../dist/brand/photos/' + f)), f);
  }
  for (const p of ['/', '/computer-tune-up/', '/data-recovery-service/', '/networking/', '/about/', '/pc-repair-service-wyckoff-new-jersey/']) assert.strictEqual(B.photoFor(p), null, p);
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
