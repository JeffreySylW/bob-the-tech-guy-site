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

const R = require('../tools/service-recipes.js');
const C = require('../tools/cards-transform.js');
const IDS = ['11981', '11804', '11863', '11976', '11971', '11857'];
const titles = (out) => [...out.matchAll(/<h3 class="btg-card-title">([^<]*)<\/h3>/g)].map((m) => m[1]);

test('transformService() builds the approved cards on every page', () => {
  const expected = {
    11981: ['Internet &amp; Broadband', 'Home Networking', 'Wireless Networking'],
    11804: ['Today&#8217;s Threats', 'Virus &amp; Malware Removal'],
    11863: ['Why Back Up', 'Cloud-Based Backup'],
    11976: ['Hardware Repair &amp; Upgrades'],
    11971: ['Email Setup'],
    11857: ['Parental Controls']
  };
  for (const id of IDS) assert.deepStrictEqual(titles(S.transformService(fx(id), R[id])), expected[id], id);
});

test('transformService() puts the hero first and keeps the style tail byte-identical', () => {
  for (const id of IDS) {
    const before = fx(id);
    const out = S.transformService(before, R[id]);
    assert.ok(out.startsWith('<section class="btg-hero">'), id);
    assert.match(out, /<a class="btg-hero-cta" href="tel:8448354890">844-TEKGUY-0<\/a>/);
    assert.ok(out.endsWith(S.chunks(before).tail), id);
  }
});

test('transformService() turns Networking bullets into one 9-item checklist with the wrapped item merged', () => {
  const out = S.transformService(fx('11981'), R['11981']);
  const lists = [...out.matchAll(/<ul class="btg-checklist">([\s\S]*?)<\/ul>/g)].map((m) => (m[1].match(/<li>/g) || []).length);
  assert.deepStrictEqual(lists, [3, 9]);
  assert.match(out, /<li>Enable wireless encryption on network to safeguard your personal information and secure your broadband signal from use by others<\/li>/);
  assert.doesNotMatch(out, /<li>\s*(\*|•)/);
});

test('transformService() fixes only the mislabeled CTAs', () => {
  assert.match(S.transformService(fx('11981'), R['11981']), /Need a quote for Networking Services\?/);
  assert.match(S.transformService(fx('11976'), R['11976']), /Need a quote for Hardware Repair &amp; Upgrades Services\?/);
  assert.match(S.transformService(fx('11971'), R['11971']), /Need a quote for Email Setup Services\?/);
  for (const id of IDS) assert.match(S.transformService(fx(id), R[id]), /<div class="btg-cta-block"><h3[^>]*>Have any questions\?[\s\S]*?Call Today![\s\S]*?\(862\)210-5656[\s\S]*?<\/div>/, id);
});

test('transformService() keeps Backup\'s top heading and closing line', () => {
  const out = S.transformService(fx('11863'), R['11863']);
  assert.ok(out.indexOf('Automated On-Site and Cloud-based Backup') < out.indexOf('btg-cards'));
  assert.ok(out.indexOf('Also, keep your data secure') > out.indexOf('btg-checklist'));
});

test('transformService() refuses to run twice', () => {
  assert.throws(() => S.transformService(S.transformService(fx('11857'), R['11857']), R['11857']), /Already transformed/);
});

test('transformService() fails loudly on a missing anchor', () => {
  const html = fx('11857').replace(/If you(&#8217;|')re concerned[^\n]*/, 'Something else entirely.');
  assert.throws(() => S.transformService(html, R['11857']), /concerned about the content your children/);
});

test('transformService() fails loudly on unmapped content', () => {
  const html = fx('11857').replace('<h2', '\n\nA surprise paragraph nobody mapped.\n\n<h2');
  assert.throws(() => S.transformService(html, R['11857']), /Unmapped content: A surprise paragraph/);
});

test('transformService() output has no blank lines inside the rebuilt body', () => {
  for (const id of IDS) {
    const out = S.transformService(fx(id), R[id]);
    const body = out.slice(out.indexOf('</section>') + 10, out.indexOf('<style>/* btg-styles */'));
    assert.doesNotMatch(body.trim(), /\n\s*\n/, id);
  }
});

test('verifyService() passes the real transform of all 6 pages', () => {
  for (const id of IDS) {
    const before = fx(id);
    assert.deepStrictEqual(S.verifyService(before, S.transformService(before, R[id]), R[id]), [], id);
  }
});

test('verifyService() catches an edited word', () => {
  const before = fx('11804');
  const after = S.transformService(before, R['11804']).replace('rootkits', 'rootkit');
  assert.ok(S.verifyService(before, after, R['11804']).length > 0);
});

test('verifyService() catches a sentence moved to another card', () => {
  const before = fx('11863');
  let after = S.transformService(before, R['11863']);
  const s = 'Losing your data!';
  assert.ok(after.includes(s));
  after = after.replace(s + ' ', '').replace('Cloud-based backup uses', s + ' Cloud-based backup uses');
  assert.ok(S.verifyService(before, after, R['11863']).some((p) => /card/i.test(p)));
});

test('verifyService() catches a dropped list item', () => {
  const before = fx('11857');
  const after = S.transformService(before, R['11857']).replace(/<li>Installation and configuration[^<]*<\/li>/, '');
  assert.ok(S.verifyService(before, after, R['11857']).length > 0);
});

test('verifyService() catches hidden text and a changed style tail', () => {
  const before = fx('11857');
  const out = S.transformService(before, R['11857']);
  assert.ok(S.verifyService(before, out.replace('<details>', '<details style="display:none">'), R['11857']).some((p) => /hidden|style/i.test(p)));
  assert.ok(S.verifyService(before, out.replace('font-size:16.5px', 'font-size:17px'), R['11857']).some((p) => /tail/i.test(p)));
});
