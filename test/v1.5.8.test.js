// test/v1.5.8.test.js — run: node --test test/v1.5.8.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../tools/loader.js');
const N = require('../tools/nj-posts.js');
const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');

test('loaderBlock(): hides the old header and page until the bundle is ready, with a CSS-only fail-safe', () => {
  const b = L.loaderBlock('v1.5.8');
  assert.ok(b.indexOf('<style>') < b.indexOf('<link rel="stylesheet"') && b.indexOf('<link rel="stylesheet"') < b.indexOf('<script'));
  assert.match(b, /html:not\(\.btg-ready\) \.fusion-header-wrapper,html:not\(\.btg-ready\) #main\{visibility:hidden;animation:btg-reveal 0s 1\.5s forwards\}/);
  assert.match(b, /@keyframes btg-reveal\{to\{visibility:visible\}\}/);
  assert.match(b, /@v1\.5\.8\/dist\/btg\.css/);
  assert.doesNotMatch(/<style>([\s\S]*?)<\/style>/.exec(b)[1], /\n/, 'style stays on one line so wpautop cannot break it');
});

test('loaderBlock() is what the page tools append', () => {
  assert.ok(N.loader('v1.5.8').endsWith(L.loaderBlock('v1.5.8')));
  for (const f of ['account-page', 'search-page']) assert.ok(require('../tools/' + f + '.js')('v1.5.8').endsWith(L.loaderBlock('v1.5.8')), f);
});

test('bundle marks the page ready once the header, search and page modules have run', () => {
  const run = js.slice(js.indexOf('function run()'), js.indexOf('if (document.readyState'));
  assert.ok(run.indexOf("classList.add('btg-ready')") > run.indexOf('BTGAccount.init'));
});

test('addPrehide() upgrades an existing loader in place and only that', () => {
  const old = 'Body text.\n\n<!-- btg-loader v1 -->\n<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.5.7/dist/btg.css">\n<script src="https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.5.7/dist/btg.js"></script>';
  const up = L.upgrade(old, 'v1.5.7', 'v1.5.8');
  assert.ok(up.startsWith(L.EARLY + 'Body text.\n\n'));
  assert.ok(up.endsWith(L.loaderBlock('v1.5.8')));
  assert.strictEqual(L.upgrade(up, 'v1.5.8', 'v1.5.8'), up, 'idempotent');
  assert.throws(() => L.upgrade('no loader here', 'v1.5.7', 'v1.5.8'), /loader/);
});
