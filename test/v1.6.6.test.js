// test/v1.6.6.test.js — run: node --test test/v1.6.6.test.js
// Northern New Jersey area map in the footer and on the Northern New Jersey page (area view, never the business pin).
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const F = window.BTGFooter;
const nj = require('../tools/nj-page.js')('v1.6.6');

const AREA = 'https://maps.google.com/maps?q=Pompton%20Lakes%2C%20NJ&amp;z=10&amp;output=embed';

test('footer contact block ends with the NJ area map', () => {
  const h = F.contactHtml();
  assert.ok(h.includes('<iframe class="btg-foot-map" src="' + AREA + '"'), h);
  assert.match(h, /title="Map of our northern New Jersey service area" loading="lazy"/);
  assert.doesNotMatch(h, /Bob\+The\+Tech\+Guy|0xad47b350a040c358/);
});

test('Northern New Jersey page shows the same area map after the towns', () => {
  assert.ok(nj.includes('<iframe class="btg-nj-map" src="' + AREA + '"'));
  assert.ok(nj.indexOf('btg-nj-map') > nj.indexOf('btg-nj-towns'));
  assert.ok(nj.indexOf('btg-nj-map') < nj.indexOf('btg-cta-block'));
});
