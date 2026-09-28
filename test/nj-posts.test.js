// test/nj-posts.test.js — run: node --test test/nj-posts.test.js
const test = require('node:test');
const assert = require('node:assert');
const N = require('../tools/nj-posts.js');
const img = (n) => '<a href="https://bobthetechguy.com/wp-content/uploads/2017/06/' + n + '-15.jpg"><img class="alignnone size-full wp-image-1' + n + '" src="https://bobthetechguy.com/wp-content/uploads/2017/06/' + n + '-15.jpg" alt="PC Repair Service Upper Saddle River New Jersey" width="641" height="364" /></a>';
const post = 'As computers have become more sophisticated, so have viruses.\r\n\r\n' + img(1) + '\r\n\r\nSome security problems are due to factors out of your control. <a href="https://bobthetechguy.com/anti-virus/">Anti-virus</a> helps.\r\n\r\n' + img(2) + '\r\n\r\n• Recovering lost files.\r\n\r\n' + img(3) + '\r\n\r\n' + img(4);

test('transform() removes the banner images (with their links) and adds the loader', () => {
  const out = N.transform(post, 'v1.5.7');
  assert.doesNotMatch(out, /<img/);
  assert.doesNotMatch(out, /uploads/);
  assert.match(out, /href="https:\/\/bobthetechguy\.com\/anti-virus\/">Anti-virus<\/a>/);
  assert.match(out, /Recovering lost files\./);
  assert.ok(out.endsWith('<script src="https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.5.7/dist/btg.js"></script>'));
  assert.doesNotMatch(out, /(\r?\n){3,}/);
});

test('transform() refuses a post that already has the loader or has an image it does not know', () => {
  assert.throws(() => N.transform(post + '<!-- btg-loader v1 -->', 'v1.5.7'), /Already/);
  assert.throws(() => N.transform('x <img src="https://elsewhere.example/a.png" alt=""> y', 'v1.5.7'), /Unexpected image/);
  assert.throws(() => N.transform('x <a href="/a/"><img src="https://bobthetechguy.com/wp-content/uploads/2017/06/1-15.jpg"> text</a>', 'v1.5.7'), /Unexpected image/);
});

test('a post with no images just gets the loader', () => {
  const out = N.transform('Plain text only.', 'v1.5.7');
  assert.ok(out.startsWith('Plain text only.'));
  assert.match(out, /btg-loader/);
});

test('verify() accepts the transform and catches lost words, changed links and a missing loader', () => {
  const out = N.transform(post, 'v1.5.7');
  assert.deepStrictEqual(N.verify(post, out, 'v1.5.7'), []);
  assert.ok(N.verify(post, out.replace('Recovering lost files.', 'Recovering files.'), 'v1.5.7').some((p) => /text/i.test(p)));
  assert.ok(N.verify(post, out.replace('/anti-virus/', '/networking/'), 'v1.5.7').some((p) => /link/i.test(p)));
  assert.ok(N.verify(post, out.replace('<!-- btg-loader v1 -->', ''), 'v1.5.7').some((p) => /loader/i.test(p)));
  assert.ok(N.verify(post, out.replace('Some security', '<p hidden>Some security</p>'), 'v1.5.7').some((p) => /tag|markup/i.test(p)));
});

test('transform() also collapses the blank / &nbsp; spacer lines the banners leave behind', () => {
  const p = 'First paragraph.\r\n\r\n&nbsp;\r\n\r\n' + img(1) + '\r\n\r\n&nbsp;\r\n\r\n&nbsp;\r\n\r\nHave any questions?';
  const out = N.transform(p, 'v1.5.7');
  assert.doesNotMatch(out.split('<!-- btg-loader')[0], /&nbsp;/);
  assert.ok(out.startsWith('First paragraph.\r\n\r\nHave any questions?'));
  assert.deepStrictEqual(N.verify(p, out, 'v1.5.7'), []);
});
