// test/head-loader.test.js — run: node --test test/head-loader.test.js
// The site-wide loader that Avada prints in <head>, and retiring the per-page loaders it replaces (issue #3).
const test = require('node:test');
const assert = require('node:assert');
const L = require('../tools/loader.js');

const CDN = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@';

test('headBlock(): pre-hide style, stylesheet, deferred script pinned to one tag, then the business JSON-LD', () => {
  assert.strictEqual(L.headBlock('v1.8.5'),
    '<!-- btg-head v1 -->\n' +
    '<style>html:not(.btg-ready) .fusion-header-wrapper,html:not(.btg-ready) #main{visibility:hidden;animation:btg-reveal 0s 1.5s forwards}@keyframes btg-reveal{to{visibility:visible}}</style>\n' +
    '<link rel="stylesheet" href="' + CDN + 'v1.8.5/dist/btg.css">\n' +
    '<script defer src="' + CDN + 'v1.8.5/dist/btg.js"></script>\n' +
    L.businessJsonLd() + '\n'); // since v1.8.21, see test/v1.8.21.test.js
});

// A published page as the re-pin script leaves it: early pre-hide copy, Bob's content, then the v1 loader.
const PAGE = '<!-- btg-early -->\n' +
  '<style>html:not(.btg-ready) .fusion-header-wrapper,html:not(.btg-ready) #main{visibility:hidden;animation:btg-reveal 0s 1.5s forwards}@keyframes btg-reveal{to{visibility:visible}}</style>\n' +
  '<h2>Networking</h2>\n<p>Bob sets up home and office networks.</p>' +
  '\n\n<!-- btg-loader v1 -->\n' +
  '<style>html:not(.btg-ready) .fusion-header-wrapper,html:not(.btg-ready) #main{visibility:hidden;animation:btg-reveal 0s 1.5s forwards}@keyframes btg-reveal{to{visibility:visible}}</style>\n' +
  '<link rel="stylesheet" href="' + CDN + 'v1.8.4/dist/btg.css">\n' +
  '<script src="' + CDN + 'v1.8.4/dist/btg.js"></script>';

test('strip(): removes the early pre-hide copy and the per-page loader, leaving the content exactly', () => {
  assert.strictEqual(L.strip(PAGE), '<h2>Networking</h2>\n<p>Bob sets up home and office networks.</p>');
});

test('strip(): refuses a page without a standard loader at its end, so the REST script never saves it', () => {
  assert.throws(() => L.strip('<p>A page someone edited by hand.</p>'), /loader/);
  assert.throws(() => L.strip(PAGE + '\n<p>Text added after the loader.</p>'), /loader/);
});

// Live pages (checked read-only, all 27, 2026-10-12): the loader follows the page's own btg-styles block after ONE newline.
test('strip(): handles the real page shape — styles block, single newline, loader — and keeps the styles', () => {
  const styles = '<style>/* btg-styles */ .btg-hero { color: #222; }</style>';
  const real = '<!-- btg-early -->\n' +
    '<style>html:not(.btg-ready) .fusion-header-wrapper,html:not(.btg-ready) #main{visibility:hidden;animation:btg-reveal 0s 1.5s forwards}@keyframes btg-reveal{to{visibility:visible}}</style>\n' +
    '<h2>Networking</h2>\n' + styles + '\n<!-- btg-loader v1 -->\n' +
    '<style>html:not(.btg-ready) .fusion-header-wrapper,html:not(.btg-ready) #main{visibility:hidden;animation:btg-reveal 0s 1.5s forwards}@keyframes btg-reveal{to{visibility:visible}}</style>\n' +
    '<link rel="stylesheet" href="' + CDN + 'v1.8.6/dist/btg.css">\n' +
    '<script src="' + CDN + 'v1.8.6/dist/btg.js"></script>';
  assert.strictEqual(L.strip(real), '<h2>Networking</h2>\n' + styles);
});
