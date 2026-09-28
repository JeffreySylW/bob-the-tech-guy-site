// test/testimonials.test.js — run: node --test test/testimonials.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const T = require('../tools/testimonials-rebuild.js');
const raw = fs.readFileSync(path.join(__dirname, '..', 'backups', '2026-09-26', '3754.html'), 'utf8');
const live = raw + '\n<!-- btg-loader v1 -->\n<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.4.1/dist/btg.css">\n<script src="https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.4.1/dist/btg.js"></script>';

test('parse() finds the five testimonials with name/place and quote', () => {
  const items = T.parse(live).items;
  assert.strictEqual(items.length, 5);
  assert.match(items[0].who, /Drew C\. , Pompton Lakes, NJ/);
  assert.match(items[4].who, /Cassie F\. , Pompton Lakes, NJ/);
  assert.match(items[3].quote, /^" If you need any computer repair/);
});

test('rebuild() adds the hero, quote cards and the reviews link; keeps the tail', () => {
  const out = T.rebuild(live);
  assert.ok(out.startsWith('<section class="btg-hero">'));
  assert.strictEqual((out.match(/<figure class="btg-home-quote">/g) || []).length, 5);
  assert.match(out, /<p class="btg-home-more"><a href="https:\/\/bobthetechguy\.com\/reviews\/">Read all of our customer reviews »<\/a><\/p>/);
  assert.ok(out.endsWith(live.slice(live.search(/<style>\/\* btg-styles/))));
  const body = out.slice(out.indexOf('</section>') + 10, out.search(/<style>\/\* btg-styles/)).trim();
  assert.doesNotMatch(body, /\n\s*\n/);
});

test('verify() passes the real rebuild and catches changes', () => {
  const out = T.rebuild(live);
  assert.deepStrictEqual(T.verify(live, out), []);
  assert.ok(T.verify(live, out.replace('Simply The Best', 'Simply the best')).length > 0);
  assert.ok(T.verify(live, out.replace(/<figure class="btg-home-quote">[\s\S]*?<\/figure>/, '')).length > 0);
  assert.ok(T.verify(live, out.replace('<figure class="btg-home-quote">', '<figure class="btg-home-quote" hidden>')).length > 0);
});

test('rebuild() refuses to run twice or on a page with unexpected text', () => {
  assert.throws(() => T.rebuild(T.rebuild(live)), /Already rebuilt/);
  assert.throws(() => T.rebuild(live.replace('&nbsp;', 'Surprise paragraph.')), /Unmapped/);
});
