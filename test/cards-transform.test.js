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

const TITLES = ['Virus &amp; Malware Removal', 'New Computer Setup', 'Internet &amp; Home Wi-Fi',
  'Home &amp; Small-Office Networks', 'Tune-Ups &amp; Maintenance', 'Data Recovery'];

test('transform() builds 6 cards in order on Chester', () => {
  const out = C.transform(fx('28873'));
  const titles = [...out.matchAll(/<h3 class="btg-card-title">([^<]*)<\/h3>/g)].map((m) => m[1]);
  assert.deepStrictEqual(titles, TITLES);
  assert.strictEqual((out.match(/<details><summary>Read more<\/summary>/g) || []).length, 6);
  const summaries = [...out.matchAll(/<p class="btg-card-summary">([\s\S]*?)<\/p>/g)].map((m) => C.text(m[1]));
  assert.match(summaries[0], /^Computers and the threats .*sophisticated\.$/);
  assert.match(summaries[5], /^Have you lost your data .*\?$/);
});

test('transform() moves the call-to-action pair right after the grid', () => {
  const out = C.transform(fx('28873'));
  assert.match(out, /<\/article><\/div>\s*<div class="btg-cards-cta"><p><strong>Have any questions\?[\s\S]*?<\/p><p><strong>844-TEKGUY-0<\/strong><\/p><\/div>/);
});

test('transform() removes only the replaced subheadings', () => {
  const out = C.transform(fx('28873'));
  const heads = C.split(out).filter((e) => /^h[2-4]$/.test(e.tag)).map((e) => e.text);
  assert.ok(!heads.some((h) => C.REMOVABLE.test(h)), heads.join(' | '));
  assert.ok(heads.some((h) => h.indexOf('Proudly Serving') === 0));
});

test('transform() keeps hero and Proudly Serving tail byte-identical', () => {
  const before = fx('28873');
  const out = C.transform(before);
  const hero = (h) => C.split(h).find((e) => e.tag === 'section').html;
  assert.strictEqual(hero(out), hero(before));
  const tail = (h) => h.slice(h.lastIndexOf('<h', h.indexOf('Proudly Serving')));
  assert.strictEqual(tail(out), tail(before));
});

test('transform() handles Chesterfield (extra paragraph, different headings)', () => {
  const out = C.transform(fx('28867'));
  const net = out.split('btg-card--network')[1].split('</article>')[0];
  assert.match(C.text(net), /There are multiple ways/);
});

test('transform() refuses to run twice', () => {
  assert.throws(() => C.transform(C.transform(fx('28873'))), /Already transformed/);
});

test('transform() fails loudly on a missing anchor', () => {
  const html = fx('28873').replace(/<p>Your computer, like any machine[\s\S]*?<\/p>/, '');
  assert.throws(() => C.transform(html), /Your computer, like any machine/);
});

test('transform() fails loudly on unmapped content', () => {
  const html = fx('28873').replace(/(<\/section>)/, '$1\n\n<p>Surprise paragraph nobody mapped.</p>');
  assert.throws(() => C.transform(html), /Unmapped content: Surprise paragraph/);
});

test('transform() on a block-editor post keeps blocks valid', () => {
  const out = C.transform(fx('28867'));
  // grid + CTA become one Custom HTML block
  assert.match(out, /<\/section>\s*<!-- wp:html -->\s*<div class="btg-cards">[\s\S]*<div class="btg-cards-cta">[\s\S]*?<\/div>\s*<!-- \/wp:html -->/);
  // every block opener still has a matching closer
  const opens = (out.match(/<!-- wp:[a-z]/g) || []).length;
  const closes = (out.match(/<!-- \/wp:[a-z]/g) || []).length;
  assert.strictEqual(opens, closes);
  // the Proudly Serving heading keeps its own block opener
  assert.match(out, /<!-- wp:heading[^>]*-->\s*<h3[^>]*>Proudly Serving/);
});

test('transform() on a classic post adds no block comments', () => {
  assert.doesNotMatch(C.transform(fx('28873')), /<!-- \/?wp:/);
});

test('transform() leaves no block delimiters inside the Custom HTML block', () => {
  const out = C.transform(fx('28867'));
  const inner = out.split('<!-- wp:html -->')[1].split('<!-- /wp:html -->')[0];
  assert.doesNotMatch(inner, /<!-- \/?wp:/);
});
