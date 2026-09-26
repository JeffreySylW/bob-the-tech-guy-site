// Run: node --test test/v1.0.7.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

global.window = global;
require('../dist/btg.js');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');

test('addCtaDigits appends the dialable number under a vanity CTA', () => {
  const appended = [];
  const cta = {
    textContent: '844-TEKGUY-0',
    getAttribute: () => 'tel:8448354890',
    appendChild: (el) => appended.push(el),
  };
  const doc = {
    querySelector: () => cta,
    createElement: () => ({}),
  };

  window.BTGInit.addCtaDigits(doc);

  assert.strictEqual(appended.length, 1);
  assert.strictEqual(appended[0].className, 'btg-hero-cta-digits');
  assert.strictEqual(appended[0].textContent, '(844) 835-4890');
});

test('addCtaDigits leaves an already-numeric CTA alone', () => {
  const appended = [];
  const cta = { textContent: '(844) 835-4890', getAttribute: () => 'tel:8448354890', appendChild: (el) => appended.push(el) };
  window.BTGInit.addCtaDigits({ querySelector: () => cta, createElement: () => ({}) });
  assert.strictEqual(appended.length, 0);
});

test('public admin bar hidden for logged-out visitors only', () => {
  assert.match(css, /body:not\(\.logged-in\) #wpadminbar\s*\{[^}]*display:\s*none/);
  assert.match(css, /html:has\(body:not\(\.logged-in\)\)\s*\{[^}]*margin-top:\s*0 !important/);
});

test('no white gap between the nav and the hero band', () => {
  assert.match(css, /#main:has\(\.btg-hero\)\s*\{[^}]*padding-top:\s*0/);
});

test('addHeroTrust adds one accessible trust line after the hero CTA', () => {
  const inserted = [];
  const cta = { parentNode: { insertBefore: (el, ref) => inserted.push([el, ref]) }, nextSibling: 'NEXT' };
  const hero = { querySelector: (sel) => (sel === '.btg-hero-trust' ? null : cta) };
  const doc = { querySelector: () => hero, createElement: () => ({ setAttribute(k, v) { this[k] = v; } }) };

  window.BTGInit.addHeroTrust(doc);

  assert.strictEqual(inserted.length, 1);
  const [el, ref] = inserted[0];
  assert.strictEqual(ref, 'NEXT');
  assert.strictEqual(el.className, 'btg-hero-trust');
  assert.match(el.textContent, /5-star rated · Veteran-owned & operated/);
  assert.strictEqual(el['aria-label'], '5-star rated. Veteran-owned and operated.');
});

test('addHeroTrust is idempotent', () => {
  const inserted = [];
  const hero = { querySelector: (sel) => (sel === '.btg-hero-trust' ? {} : { parentNode: { insertBefore: () => inserted.push(1) } }) };
  window.BTGInit.addHeroTrust({ querySelector: () => hero, createElement: () => ({}) });
  assert.strictEqual(inserted.length, 0);
});
