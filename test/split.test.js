// test/split.test.js — run: node --test test/split.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../tools/service-cards.js');
const R = require('../tools/service-recipes.js');
const fx = (id) => fs.readFileSync(path.join(__dirname, 'fixtures', id + '.html'), 'utf8');
const SPLIT = ['11806', '11867', '11869', '11973', '11978', '11861', '11859', '11853', '11855'];
const items = (out) => (out.match(/<ul class="btg-checklist">([\s\S]*?)<\/ul>/)[1].match(/<li>/g) || []).length;

test('every split page has an approved recipe', () => {
  for (const id of SPLIT) assert.strictEqual(R[id].layout, 'split', id);
});

test('transformSplit() builds hero, split, include card and CTA block in order', () => {
  for (const id of SPLIT) {
    const out = S.transformSplit(fx(id), R[id]);
    const at = (s) => out.indexOf(s);
    assert.ok(out.startsWith('<section class="btg-hero">'), id);
    assert.ok(at('class="btg-split') > at('</section>'), id);
    assert.ok(at('class="btg-include-card btg-card--' + R[id].icon + '"') > at('class="btg-split-text"'), id);
    assert.ok(at('class="btg-cta-block"') > at('class="btg-include-card'), id);
    assert.match(out, /<div class="btg-cta-block"><h3[^>]*>Have any questions\?[\s\S]*?Call Today![\s\S]*?\(862\)210-5656[\s\S]*?<\/div>/, id);
  }
});

test('transformSplit() turns every fake bullet into a checklist item, words unchanged', () => {
  const want = { 11806: 14, 11867: 12, 11869: 6, 11973: 5, 11978: 3, 11861: 5, 11859: 4, 11853: 2, 11855: 6 };
  for (const id of SPLIT) {
    const out = S.transformSplit(fx(id), R[id]);
    assert.strictEqual(items(out), want[id], id);
    assert.doesNotMatch(out, /<li>\s*(\*|•|&bull;)/, id);
  }
  assert.match(S.transformSplit(fx('11978'), R['11978']), /<li>Verify RAM is recognized in BIOS and operating system<\/li>/);
});

test('transformSplit() stacks the two long lists only', () => {
  for (const id of SPLIT) {
    const stacked = /class="btg-split btg-split--stacked"/.test(S.transformSplit(fx(id), R[id]));
    assert.strictEqual(stacked, id === '11806' || id === '11867', id);
  }
});

test('transformSplit() keeps the Set Up banner and the Software note', () => {
  const setup = S.transformSplit(fx('11806'), R['11806']);
  assert.ok(setup.indexOf('<p class="btg-banner"><a href="https://bobthetechguy.com/wp-content/uploads/2015/12/computer_setup.png"') < setup.indexOf('class="btg-split'));
  const sw = S.transformSplit(fx('11855'), R['11855']);
  assert.match(sw, /<p class="btg-note">(<(em|strong)>)*Bob the Tech Guy also provides hands-on software training[^<]*(<\/(em|strong)>)*<\/p>/);
  assert.ok(sw.indexOf('btg-note') > sw.indexOf('btg-include-card') && sw.indexOf('btg-note') < sw.indexOf('btg-cta-block'));
});

test('transformSplit() keeps the tail byte-identical and has no blank lines inside the body', () => {
  for (const id of SPLIT) {
    const before = fx(id);
    const out = S.transformSplit(before, R[id]);
    assert.ok(out.endsWith(S.chunks(before).tail), id);
    const body = out.slice(out.indexOf('</section>') + 10, S.tailStart(out));
    assert.doesNotMatch(body.trim(), /\n\s*\n/, id);
  }
});

test('transformSplit() works on a page with no tail at all', () => {
  const noTail = fx('11978').replace(/<style>\/\* btg-styles \*\/[\s\S]*$/, '').replace(/<!-- btg-loader[\s\S]*$/, '');
  const out = S.transformSplit(noTail, R['11978']);
  assert.strictEqual(S.tailStart(noTail), noTail.length);
  assert.match(out, /<\/div>\s*$/);
});

test('transformSplit() refuses to run twice, and throws on a stray line inside the list', () => {
  assert.throws(() => S.transformSplit(S.transformSplit(fx('11978'), R['11978']), R['11978']), /Already transformed/);
  const stray = fx('11978').replace('* Verify RAM', 'A stray remark.\n\n* Verify RAM');
  assert.throws(() => S.transformSplit(stray, R['11978']), /List item after a note/);
});

test('transformSplit() throws on a missing list heading or unmapped content', () => {
  assert.throws(() => S.transformSplit(fx('11978').replace('Memory Install Services Include:', 'Something else'), R['11978']), /Memory Install Services Include:/);
  const extra = fx('11978').replace('Call Today!', 'Call Today!\n\nAn unexpected closing line.');
  assert.throws(() => S.transformSplit(extra, R['11978']), /Unmapped content: An unexpected closing line/);
});
