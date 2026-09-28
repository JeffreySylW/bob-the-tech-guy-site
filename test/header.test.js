// test/header.test.js — run: node --test test/header.test.js
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const H = window.BTGHeader;
const I = require('../tools/services-index.js');
const B = 'https://bobthetechguy.com/';

test('GROUPS in the bundle equal the Services index groups', () => {
  assert.deepStrictEqual(H.GROUPS, I.GROUPS);
});

test('LOGO_SVG: wordmark text, decorative to screen readers, pulsing pad class', () => {
  assert.match(H.LOGO_SVG, /^<svg class="btg-logo"[^>]*aria-hidden="true"[^>]*focusable="false"/);
  assert.match(H.LOGO_SVG, />BOB THE</);
  assert.match(H.LOGO_SVG, />Tech <tspan[^>]*>Guy<\/tspan></);
  assert.match(H.LOGO_SVG, /class="btg-logo-pad"/);
  assert.match(H.ICON_SVG, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});

test('groupLinks() files menu links into the three groups in group order', () => {
  const links = [['networking', 'Networking'], ['memory-install', 'Memory Install'], ['computer-set-up', 'Computer Set Up']]
    .map(([s, t]) => ({ href: B + s + '/', text: t }));
  const g = H.groupLinks(links);
  assert.deepStrictEqual(g.map((x) => x.name), ['Repairs &amp; Upgrades', 'Setup &amp; Software', 'Security &amp; Networking']);
  assert.deepStrictEqual(g[0].items, [{ href: B + 'memory-install/', text: 'Memory Install', icon: 'chip' }]);
});

test('groupLinks() drops empty groups and puts unknown links in "More"', () => {
  const g = H.groupLinks([{ href: B + 'drone-repair/', text: 'Drone Repair' }, { href: B + 'networking/', text: 'Networking' }]);
  assert.deepStrictEqual(g.map((x) => x.name), ['Security &amp; Networking', 'More']);
  assert.deepStrictEqual(g[1].items, [{ href: B + 'drone-repair/', text: 'Drone Repair', icon: 'page' }]);
});

test('panelsHtml() escapes link text and uses the index panel classes', () => {
  const html = H.panelsHtml([{ name: 'More', items: [{ href: B + 'x/', text: 'A <b>&', icon: 'page' }] }]);
  assert.match(html, /^<div class="btg-panels"><section class="btg-panel"><h2 class="btg-panel-title">More<\/h2><ul class="btg-panel-list"><li><a class="btg-panel-link btg-card--page" href="https:\/\/bobthetechguy\.com\/x\/">A &lt;b&gt;&amp;<\/a><\/li><\/ul><\/section><\/div>$/);
});
