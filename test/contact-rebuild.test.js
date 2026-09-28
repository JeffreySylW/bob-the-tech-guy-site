// test/contact-rebuild.test.js — run: node --test test/contact-rebuild.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const CR = require('../tools/contact-rebuild.js');
const L = require('../tools/logo-swap.js');
// Live Contact page = 2026-09-26 snapshot, logo swapped then removed, loader pinned.
const snap = fs.readFileSync(path.join(__dirname, '..', 'backups', '2026-09-26', '11802.html'), 'utf8');
const live = L.removeLogo(L.swapLogo(snap, 'v1.4.1')).replace(/site@v1\.\d+\.\d+\/dist/g, 'site@v1.5.2/dist');

test('rebuild() makes two location cards with their phone numbers, then the lead line and the form', () => {
  const out = CR.rebuild(live);
  const at = (s) => out.indexOf(s);
  assert.strictEqual((out.match(/<div class="btg-location">/g) || []).length, 2);
  assert.ok(at('Virginia &mdash; Greater Richmond Area') < at('href="tel:844-TEKGUY-0"'));
  assert.ok(at('href="tel:844-TEKGUY-0"') < at('New Jersey Location'));
  assert.ok(at('New Jersey Location') < at('href="tel:(862)210-5656"'));
  assert.ok(at('href="tel:(862)210-5656"') < at('Call or use the form below'));
  assert.ok(at('Call or use the form below') < at('[contact-form-7 id="16906"'));
  assert.ok(out.startsWith(live.slice(0, live.indexOf('</section>') + 10)));
  assert.ok(out.endsWith(live.slice(live.indexOf('<!-- btg-loader'))));
  const body = out.slice(out.indexOf('</section>') + 10, out.indexOf('[contact-form-7')).trim();
  assert.doesNotMatch(body, /\n\s*\n/);
});

test('verify() passes the real rebuild and catches a dropped or edited sentence, a changed link, a lost form', () => {
  const out = CR.rebuild(live);
  assert.deepStrictEqual(CR.verify(live, out), []);
  assert.ok(CR.verify(live, out.replace('Continuing to serve our northern New Jersey customers.', '')).length > 0);
  assert.ok(CR.verify(live, out.replace('homes and small businesses', 'homes and businesses')).length > 0);
  assert.ok(CR.verify(live, out.replace('tel:(862)210-5656', 'tel:5555555555')).length > 0);
  assert.ok(CR.verify(live, out.replace('[contact-form-7 id="16906" title="Contact form 1"]', '')).length > 0);
});

test('rebuild() refuses to run twice or on unexpected content', () => {
  assert.throws(() => CR.rebuild(CR.rebuild(live)), /Already rebuilt/);
  assert.throws(() => CR.rebuild(live.replace('<h3>New Jersey Location</h3>', '<h3>New Jersey Location</h3>\n<p>A new paragraph.</p>')), /Unmapped/);
});
