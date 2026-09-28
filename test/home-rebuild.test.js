// test/home-rebuild.test.js — run: node --test test/home-rebuild.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const HR = require('../tools/home-rebuild.js');
const reorder = require('../tools/home-reorder.js');
// The live homepage = the saved snapshot after the (live) reorder.
const live = reorder.reorderHome(fs.readFileSync(path.join(__dirname, 'fixtures', '2318.html'), 'utf8'));

test('buildHome() keeps the hero and the loader tail byte-identical', () => {
  const out = HR.buildHome(live);
  const heroEnd = live.indexOf('[tagline_box');
  assert.ok(out.startsWith(live.slice(0, heroEnd)));
  assert.ok(out.endsWith(live.slice(live.indexOf('<!-- btg-loader'))));
});

test('buildHome() removes every builder shortcode from the rebuilt body', () => {
  const out = HR.buildHome(live);
  const body = out.slice(out.indexOf('</section>'), out.indexOf('<!-- btg-loader'));
  assert.doesNotMatch(body, /\[\/?[a-z_]+[\s\]]/);
});

test('buildHome() builds the sections in order with the right counts', () => {
  const out = HR.buildHome(live);
  const at = (s) => out.indexOf(s);
  assert.ok(at('class="btg-home-announce"') < at('class="btg-home-services"'));
  assert.ok(at('class="btg-home-services"') < at('class="btg-home-why"'));
  assert.ok(at('class="btg-home-why"') < at('class="btg-home-reviews"'));
  assert.ok(at('class="btg-home-reviews"') < at('class="btg-home-about"'));
  assert.ok(at('class="btg-home-about"') < at('class="btg-home-cta"'));
  assert.ok(at('class="btg-home-cta"') < at('class="btg-home-badges"'));
  assert.strictEqual((out.match(/<a class="btg-home-svc /g) || []).length, 4);
  assert.strictEqual((out.match(/<div class="btg-home-reason /g) || []).length, 4);
  assert.strictEqual((out.match(/<figure class="btg-home-quote">/g) || []).length, 6);
  assert.strictEqual((out.match(/<h1\b/g) || []).length, 1, 'only the hero h1 remains');
});

test('buildHome() output has no blank lines inside the rebuilt body (WordPress would add <p>/<br>)', () => {
  const out = HR.buildHome(live);
  const body = out.slice(out.indexOf('</section>') + 10, out.indexOf('<!-- btg-loader')).trim();
  assert.doesNotMatch(body, /\n\s*\n/);
});

test('verifyHomeRebuild() passes the real build', () => {
  assert.deepStrictEqual(HR.verifyHomeRebuild(live, HR.buildHome(live)), []);
});

test('verifyHomeRebuild() catches an edited word, a dropped review, a moved section and a changed link', () => {
  const out = HR.buildHome(live);
  assert.ok(HR.verifyHomeRebuild(live, out.replace('military discipline', 'discipline')).length > 0);
  assert.ok(HR.verifyHomeRebuild(live, out.replace(/<figure class="btg-home-quote">[\s\S]*?<\/figure>/, '')).length > 0);
  const why = out.match(/<section class="btg-home-why">[\s\S]*?<\/section>/)[0];
  assert.ok(HR.verifyHomeRebuild(live, out.replace(why, '').replace('<div class="btg-home-cta">', why + '<div class="btg-home-cta">')).length > 0);
  assert.ok(HR.verifyHomeRebuild(live, out.replace('href="https://bobthetechguy.com/anti-virus/"', 'href="https://bobthetechguy.com/"')).length > 0);
  assert.ok(HR.verifyHomeRebuild(live, out.replace('<img ', '<img hidden ')).length > 0);
});

test('buildHome() refuses an already rebuilt page and unexpected content', () => {
  assert.throws(() => HR.buildHome(HR.buildHome(live)), /Already rebuilt/);
  assert.throws(() => HR.buildHome(live.replace('[title size="1"', '[fusion_text]Surprise text[/fusion_text][title size="1"')), /Unmapped/);
});
