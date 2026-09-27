// test/service-cards.test.js — run: node --test test/service-cards.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../tools/service-cards.js');
const fx = (id) => fs.readFileSync(path.join(__dirname, 'fixtures', id + '.html'), 'utf8');

test('chunks() splits classic content into paragraphs and block headings, keeping the style tail', () => {
  const c = S.chunks(fx('11857'));
  assert.ok(c.tail.startsWith('<style>/* btg-styles */'));
  assert.ok(c.tail.endsWith('</style>'));
  const kinds = c.blocks.map((b) => b.kind + (b.tag ? ':' + b.tag : ''));
  assert.deepStrictEqual(kinds.slice(0, 2), ['p', 'block:h2']);
  assert.ok(c.blocks.some((b) => b.kind === 'block' && b.tag === 'h3' && /Have any questions\?/.test(b.text)));
});

test('chunks() rebuilt from blocks covers the whole input', () => {
  for (const id of ['11981', '11804', '11863', '11976', '11971', '11857']) {
    const html = fx(id);
    const c = S.chunks(html);
    assert.strictEqual(c.blocks.map((b) => b.html).join('').replace(/\s/g, '') + c.tail.replace(/\s/g, ''), html.replace(/\s/g, ''));
  }
});

test('chunks() refuses a paragraph containing a single newline', () => {
  assert.throws(() => S.chunks('one line\nsecond line\n\n<style>/* btg-styles */</style>'), /single newline/);
});

test('itemHtml() drops strong wrappers and bullet glyphs, keeps words', () => {
  assert.strictEqual(S.itemHtml('<strong>* Update router firmware (if needed)</strong>'), 'Update router firmware (if needed)');
  assert.strictEqual(S.itemHtml('<strong>• Repairing issues and blue&nbsp;</strong><strong>screens.</strong>'), 'Repairing issues and blue&nbsp;screens.');
  assert.strictEqual(S.itemHtml('<strong><span style="color:#54aa47" aria-hidden="true">&#10003;</span> Wireless networking setup</strong>'), 'Wireless networking setup');
});

test('addLoader() appends the loader once', () => {
  const out = S.addLoader('<p>x</p>', 'v1.1.0');
  assert.match(out, /<!-- btg-loader v1 -->\n<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v1\.1\.0\/dist\/btg\.css">\n<script src="https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v1\.1\.0\/dist\/btg\.js"><\/script>$/);
  assert.ok(out.startsWith('<p>x</p>'));
  assert.throws(() => S.addLoader(out, 'v1.1.0'), /already has a loader/);
});
