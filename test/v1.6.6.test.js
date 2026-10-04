// test/v1.6.6.test.js — run: node --test test/v1.6.6.test.js
// Northern New Jersey area map in the footer and on the Northern New Jersey page (area view, never the business pin).
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const F = window.BTGFooter;
const nj = require('../tools/nj-page.js')('v1.6.6');

// v1.6.7: Bob's Google listing pin (the NJ address may show; the Virginia address never does).
const AREA = 'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d12042.5344460568!2d-74.288835!3d41.0113919!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0xad47b350a040c358!2sBob+The+Tech+Guy!5e0!3m2!1sen!2sus!4v1453449210878';

test('footer contact block ends with the NJ area map', () => {
  const h = F.contactHtml();
  assert.ok(h.includes('<iframe class="btg-foot-map" src="' + AREA + '"'), h);
  assert.match(h, /title="Bob The Tech Guy on Google Maps" loading="lazy"/);
});

test('Northern New Jersey page shows the same area map after the towns', () => {
  assert.ok(nj.includes('<iframe class="btg-nj-map" src="' + AREA + '"'));
  assert.ok(nj.indexOf('btg-nj-map') > nj.indexOf('btg-nj-towns'));
  assert.ok(nj.indexOf('btg-nj-map') < nj.indexOf('btg-cta-block'));
});
