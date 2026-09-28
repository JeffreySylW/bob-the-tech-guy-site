// test/search-page.test.js — run: node --test test/search-page.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../dist/btg.js');
const S = window.BTGSearch;
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');

test('resultsHtml() lists matching pages as links with their type', () => {
  const h = S.resultsHtml('virus');
  assert.match(h, /<a class="btg-sr-item btg-card--shield" href="https:\/\/bobthetechguy\.com\/anti-virus\/">/);
  assert.match(h, /class="btg-sr-count"/);
  assert.match(h, /Search the full site text/);
});

test('resultsHtml() with no match says so, offers current service pages, a call link and the full-text search', () => {
  const h = S.resultsHtml('zzqxv');
  assert.match(h, /No pages match/);
  assert.match(h, /zzqxv/);
  for (const slug of ['networking', 'anti-virus', 'computer-tune-up', 'data-recovery-service', 'email-setup']) assert.ok(h.includes('bobthetechguy.com/' + slug + '/'), slug);
  assert.match(h, /href="tel:8448354890"/);
  assert.match(h, /href="https:\/\/bobthetechguy\.com\/\?s=zzqxv"/);
  assert.doesNotMatch(h, /cart|checkout|my-account|activity|shop/i);
});

test('resultsHtml() escapes the query and needs 2+ characters', () => {
  const h = S.resultsHtml('<img src=x onerror=1>');
  assert.doesNotMatch(h, /<img src=x/);
  assert.match(S.resultsHtml('a'), /Browse all services/);
  assert.doesNotMatch(S.resultsHtml('a'), /No pages match/);
});

test('header search box submits to the bundle search page, not the theme results page', () => {
  assert.match(js, /action="\/search\/" method="get"/);
  assert.match(js, /name="q" placeholder="Search"/);
  assert.match(js, /window\.BTGSearch\.initPage\(document, window\)/);
});

test('search page styles exist', () => {
  assert.match(css, /\.btg-sr-item \{/);
  assert.match(css, /\.btg-sr-list \{/);
});
