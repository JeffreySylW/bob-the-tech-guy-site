// test/cards-transform.test.js — run: node --test test/cards-transform.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../tools/cards-transform.js');
const fx = (id) => fs.readFileSync(path.join(__dirname, 'fixtures', id + '.html'), 'utf8');

test('text() strips tags and normalizes entities and curly quotes', () => {
  assert.strictEqual(C.text('<p>you&#8217;re <strong>ready</strong> &amp; set</p>'), "you're ready & set");
  assert.strictEqual(C.text('<p>you’re here</p>'), "you're here");
});

test('split() covers the whole fixture with top-level blocks', () => {
  for (const id of ['28873', '28867']) {
    const html = fx(id);
    const els = C.split(html);
    assert.strictEqual(els.map((e) => e.html).join('').replace(/\s/g, ''), html.replace(/\s/g, ''));
    assert.ok(els.some((e) => e.tag === 'section' && /class="btg-hero"/.test(e.html)));
  }
});

test('split() throws on stray top-level text', () => {
  assert.throws(() => C.split('<p>ok</p>\nstray words\n<p>ok</p>'), /Unexpected content/);
});

test('splitFirstSentence() keeps inline tags and curly apostrophes', () => {
  const r = C.splitFirstSentence('<p>So you&#8217;re <strong>ready</strong> now. Second part here.</p>');
  assert.strictEqual(r.sentence, 'So you&#8217;re <strong>ready</strong> now.');
  assert.strictEqual(r.restHtml, '<p>Second part here.</p>');
});

test('splitFirstSentence() with a single sentence leaves no rest', () => {
  const r = C.splitFirstSentence('<p>Have you lost your data?</p>');
  assert.strictEqual(r.sentence, 'Have you lost your data?');
  assert.strictEqual(r.restHtml, '');
});

test('splitFirstSentence() refuses a cut inside an inline tag', () => {
  assert.throws(() => C.splitFirstSentence('<p><strong>One. Two.</strong></p>'), /unbalanced/i);
});
