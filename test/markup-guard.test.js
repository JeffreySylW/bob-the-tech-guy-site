// test/markup-guard.test.js — run: node --test test/markup-guard.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const G = require('../tools/markup-guard.js');
const HR = require('../tools/home-rebuild.js');
const reorder = require('../tools/home-reorder.js');
const T = require('../tools/testimonials-rebuild.js');
const live = reorder.reorderHome(fs.readFileSync(path.join(__dirname, 'fixtures', '2318.html'), 'utf8'));
const tRaw = fs.readFileSync(path.join(__dirname, '..', 'backups', '2026-09-28-testimonials-3754.html'), 'utf8');

test('markupProblems() accepts our markup and rejects ways to hide or restyle content', () => {
  assert.deepStrictEqual(G.markupProblems('<div class="btg-home-grid"><a class="btg-home-svc btg-card--box" href="/x/"><strong>A</strong> <span>b</span></a></div>'), []);
  for (const bad of ['<p HIDDEN>x</p>', '<p hidden>x</p>', '<p aria-hidden="true">x</p>', '<p style="display:none">x</p>',
    '<template><p>x</p></template>', '<details><p>x</p></details>', '<noscript>x</noscript>', '<p class="screen-reader-text">x</p>', '<!-- x -->']) {
    assert.ok(G.markupProblems(bad).length > 0, bad);
  }
});

test('verifyHomeRebuild() catches two service cards trading links', () => {
  const out = HR.buildHome(live);
  const swapped = out.replace('href="https://bobthetechguy.com/anti-virus/"', 'href="TMP"').replace('href="https://bobthetechguy.com/networking/"', 'href="https://bobthetechguy.com/anti-virus/"').replace('href="TMP"', 'href="https://bobthetechguy.com/networking/"');
  assert.notStrictEqual(swapped, out);
  assert.ok(HR.verifyHomeRebuild(live, swapped).some((p) => /link/i.test(p)));
});

test('verifyHomeRebuild() catches hidden content the old regex missed', () => {
  const out = HR.buildHome(live);
  for (const bad of [out.replace('<section class="btg-home-why">', '<section class="btg-home-why screen-reader-text">'),
    out.replace('<p class="btg-home-rating">', '<p HIDDEN class="btg-home-rating">'),
    out.replace(/(<div class="btg-home-quotes">)/, '<details>$1').replace('<p class="btg-home-more">', '</details><p class="btg-home-more">')]) {
    assert.ok(HR.verifyHomeRebuild(live, bad).length > 0);
  }
});

test('verifyHomeRebuild() reports a before-page without builder content', () => {
  assert.ok(HR.verifyHomeRebuild('<p>x</p>', '<p>x</p>').length > 0);
});

test('Testimonials verify() catches an added link, a removed reviews link and hidden markup', () => {
  const out = T.rebuild(tRaw);
  assert.deepStrictEqual(T.verify(tRaw, out), []);
  assert.ok(T.verify(tRaw, out.replace('Simply The Best!!!', '<a href="https://x.example">Simply The Best!!!</a>')).length > 0);
  assert.ok(T.verify(tRaw, out.replace(/<p class="btg-home-more">[\s\S]*?<\/p>/, '')).length > 0);
  assert.ok(T.verify(tRaw, out.replace('<div class="btg-home-quotes">', '<div class="btg-home-quotes"><template>').replace('</div>\n<p class="btg-home-more">', '</template></div>\n<p class="btg-home-more">')).length > 0);
});
