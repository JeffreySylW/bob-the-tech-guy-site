// test/services-index.test.js — run: node --test test/services-index.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const I = require('../tools/services-index.js');
const fx = (f) => fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8');
const menu = I.parseServicesMenu(fx('menu.html'));

test('parseServicesMenu() reads the 15 Services submenu pages', () => {
  assert.strictEqual(menu.length, 15);
  assert.deepStrictEqual(menu[0], { slug: 'networking', url: 'https://bobthetechguy.com/networking/', title: 'Networking' });
  assert.ok(menu.some((m) => m.slug === 'computer-tune-up'));
  assert.ok(menu.some((m) => m.slug === 'hardware-repair-upgrades' && m.title === 'Hardware Repair &amp; Upgrades'));
});

test('GROUPS cover exactly the menu pages, 6 + 5 + 4', () => {
  assert.deepStrictEqual(I.GROUPS.map((g) => g.items.length), [6, 5, 4]);
  assert.deepStrictEqual(I.GROUPS.flatMap((g) => g.items.map((i) => i[0])).sort(), menu.map((m) => m.slug).sort());
});

test('buildIndex() replaces the 10 h1 links with three panels of 15 links', () => {
  const out = I.buildIndex(fx('11653.html'), menu);
  assert.doesNotMatch(out, /<h1 class="entry-title"/);
  assert.strictEqual((out.match(/<section class="btg-panel">/g) || []).length, 3);
  assert.strictEqual((out.match(/<a class="btg-panel-link btg-card--/g) || []).length, 15);
  assert.match(out, /<h2 class="btg-panel-title">Repairs &amp; Upgrades<\/h2>/);
  assert.match(out, /href="https:\/\/bobthetechguy\.com\/screen-replacement\/">Screen Replacement<\/a>/);
  assert.doesNotMatch(out, /Laptop Screen Replacement/);
  assert.ok(out.startsWith('<section class="btg-hero">'));
  assert.ok(out.endsWith(fx('11653.html').slice(fx('11653.html').indexOf('<!-- btg-loader'))));
});

test('buildIndex() refuses a menu that does not match the groups', () => {
  assert.throws(() => I.buildIndex(fx('11653.html'), menu.slice(1)), /menu does not match.*networking/i);
  assert.throws(() => I.buildIndex(fx('11653.html'), menu.concat([{ slug: 'drone-repair', url: 'https://bobthetechguy.com/drone-repair/', title: 'Drone Repair' }])), /drone-repair/);
});

test('buildIndex() refuses to run twice', () => {
  assert.throws(() => I.buildIndex(I.buildIndex(fx('11653.html'), menu), menu), /Already transformed|No service link list/);
});

test('verifyIndex() passes the real build and catches tampering', () => {
  const before = fx('11653.html');
  const out = I.buildIndex(before, menu);
  assert.deepStrictEqual(I.verifyIndex(before, out, menu), []);
  assert.ok(I.verifyIndex(before, out.replace('provide a wide range', 'provides a wide range'), menu).length > 0);
  assert.ok(I.verifyIndex(before, out.replace(/<li><a class="btg-panel-link btg-card--lock"[^<]*<\/a><\/li>/, ''), menu).length > 0);
  assert.ok(I.verifyIndex(before, out.replace('>Networking<', '>Networks<'), menu).length > 0);
  assert.ok(I.verifyIndex(before, out.replace('<section class="btg-panel">', '<section class="btg-panel" style="display:none">'), menu).length > 0);
  assert.ok(I.verifyIndex(before, out.replace('</section>\n', '</section>\n<h1>Extra</h1>\n'), menu).length > 0);
});

test('parseServicesMenu() ignores other links to /services-2/ before the menu (canonical, admin bar)', () => {
  const page = '<link rel="canonical" href="https://bobthetechguy.com/services-2/" />' +
    '<a href="https://bobthetechguy.com/services-2/">Services</a>' +
    '<li><a  href="https://bobthetechguy.com/about/"><span class="menu-text">About</span></a><ul class="sub-menu"><li><a  href="https://bobthetechguy.com/reviews/"><span class="">Reviews</span></a></li></ul></li>' +
    fx('menu.html');
  assert.deepStrictEqual(I.parseServicesMenu(page), menu);
});

test('parseServicesMenu() throws on a Services submenu link it cannot read', () => {
  const src = fx('menu.html');
  const at = src.indexOf('<ul class="sub-menu">', src.indexOf('menu-text">Services<')) + '<ul class="sub-menu">'.length;
  const odd = src.slice(0, at) + '<li><a  href="https://bobthetechguy.com/services-2/virus-removal/"><span class="">Virus Removal</span></a></li>' + src.slice(at);
  assert.throws(() => I.parseServicesMenu(odd), /could be read/i);
});
