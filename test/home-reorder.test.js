// test/home-reorder.test.js — run: node --test test/home-reorder.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../tools/home-reorder.js');
const home = fs.readFileSync(path.join(__dirname, 'fixtures', '2318.html'), 'utf8');

test('reorderHome() puts the cert and SEO blocks right before the quote box', () => {
  const out = H.reorderHome(home);
  const cert = out.indexOf('<strong>Certified Computer Repair Services.');
  const seo = out.indexOf('[fusion_text]So you have a new computer');
  const quote = out.indexOf('title="Need Computer Repair Services? Need A Quote? "');
  assert.ok(cert > out.indexOf('Read all of our customer reviews') && cert < seo && seo < quote);
  assert.ok(out.indexOf('Why Choose Bob?') < cert);
});

test('reorderHome() renames only the Services button', () => {
  const out = H.reorderHome(home);
  assert.strictEqual((out.match(/<span style="color:#ffffff">All Services<\/span>\[\/button\]/g) || []).length, 1);
  assert.match(out, /<span style="color:#ffffff">PC Repair<\/span>\[\/button\]/);
  assert.strictEqual(out.length, home.length + 4);
});

test('verifyHome() passes the real reorder and catches changes', () => {
  const out = H.reorderHome(home);
  assert.deepStrictEqual(H.verifyHome(home, out), []);
  assert.ok(H.verifyHome(home, out.replace('custom setup!', 'custom set-up!')).length > 0);
  assert.ok(H.verifyHome(home, out.replace('All Services', 'Every Service')).length > 0);
  assert.ok(H.verifyHome(home, home).length > 0);
});

test('reorderHome() refuses a changed or already-reordered page', () => {
  assert.throws(() => H.reorderHome(H.reorderHome(home)), /Already reordered/);
  assert.throws(() => H.reorderHome(home.replace('So you have a new computer', 'You have a new computer')), /SEO block/);
  const twice = home.replace('[fusion_text]<strong>Certified Computer Repair', '[fusion_text]<strong>Certified Computer Repair Services.</strong>[/fusion_text][fusion_text]<strong>Certified Computer Repair');
  assert.throws(() => H.reorderHome(twice), /Certified/);
});

test('verifyHome() catches reworded or reordered words inside a block (same characters)', () => {
  const out = H.reorderHome(home);
  const swapped = out.replace('custom setup!', 'setup custom!');
  assert.notStrictEqual(swapped, out);
  assert.ok(H.verifyHome(home, swapped).length > 0);
});
