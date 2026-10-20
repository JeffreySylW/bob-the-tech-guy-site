// test/v1.8.23.test.js — run: node --test test/v1.8.23.test.js
// Speed (audit 2026-10-19 item 10): the head field fetches btg.js at high priority. The LCP element is our
// H1.btg-hero-title, which btg.js builds at DOMContentLoaded, and browsers fetch defer scripts at Low priority.
// Lab method and numbers: test/e2e/perf-lab.mjs, vault Decisions 2026-10-20 (v1.8.23).
const test = require('node:test');
const assert = require('node:assert');
const L = require('../tools/loader.js');

test('headBlock(): btg.js is still deferred (same run order), now with fetchpriority="high", exactly once', () => {
  const block = L.headBlock('v1.8.23');
  assert.match(block, /<script defer fetchpriority="high" src="https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v1\.8\.23\/dist\/btg\.js"><\/script>\n/);
  assert.strictEqual(block.split('fetchpriority').length - 1, 1);
});

test('headBlock(): no font preload (rejected: the hero font was already loaded, and Google serves Windows another file)', () => {
  assert.doesNotMatch(L.headBlock('v1.8.23'), /rel="preload"/);
});
