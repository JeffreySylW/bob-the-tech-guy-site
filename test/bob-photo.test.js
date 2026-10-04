// test/bob-photo.test.js — run: node --test test/bob-photo.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../dist/btg.js');
const B = window.BTGBob;
const A = require('../tools/about-photo.js');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');
const PORT = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.5.9/dist/brand/bob-portrait.jpg';

test('the cropped portrait is a small JPEG in the design files', () => {
  const f = fs.readFileSync(path.join(__dirname, '../dist/brand/bob-portrait.jpg'));
  assert.deepStrictEqual([...f.slice(0, 3)], [0xff, 0xd8, 0xff]);
  assert.ok(f.length < 60000);
});

test('faceHtml(): round face with a name for screen readers and fixed size (no layout jump)', () => {
  const h = B.faceHtml();
  assert.match(h, /^<img class="btg-hero-face" src="/);
  assert.ok(h.includes('src="' + PORT + '"'));
  assert.match(h, /alt="Bob Dyer, Bob the Tech Guy" width="88" height="88">$/);
});

function fakeDoc() {
  const hero = { html: '', querySelector(s) { return s === '.btg-hero-face' && this.html ? {} : null; }, insertAdjacentHTML(where, h) { assert.strictEqual(where, 'afterbegin'); this.html += h; } };
  return { hero, doc: { querySelector: (s) => (s === '.btg-hero' ? hero : null) } };
}
test('initHero() adds the face on the home page, contact and service pages only', () => {
  for (const p of ['/', '/contact-2/', '/networking/', '/anti-virus/', '/software-installation-and-configuration/']) {
    const f = fakeDoc();
    assert.strictEqual(B.initHero(f.doc, { location: { pathname: p } }), true, p);
    assert.match(f.hero.html, /btg-hero-face/);
  }
  for (const p of ['/about/', '/gallery/', '/testimonials/', '/search/', '/customer-log-in/', '/pc-repair-service-wyckoff-new-jersey/']) {
    const f = fakeDoc();
    assert.strictEqual(B.initHero(f.doc, { location: { pathname: p } }), false, p);
    assert.strictEqual(f.hero.html, '');
  }
});
test('initHero() does not add a second face', () => {
  const f = fakeDoc();
  B.initHero(f.doc, { location: { pathname: '/networking/' } });
  assert.strictEqual(B.initHero(f.doc, { location: { pathname: '/networking/' } }), false);
});

test('bundle runs it and styles the face and the About block', () => {
  assert.match(js, /window\.BTGBob\.initHero\(document, window\)/);
  assert.match(css, /\.btg-hero-face \{[^}]*border-radius: 50%;/);
  assert.match(css, /\.btg-bob-intro \{/);
  assert.match(css, /\.btg-bob-photo > img \{[^}]*aspect-ratio: 1;/);
});

const hero = '<section class="btg-hero">\n  <p class="btg-hero-eyebrow">About Bob</p>\n</section>\n';
const about = hero + '\nBob Dyer\'s (aka Bob the Tech Guy) interest in computers started way back in 1993.\n\nFast forwarding a bit, Bob stayed in California.\n\nMore story with <a href="https://bobthetechguy.com/services-2/">a link</a>.\n\n<!-- btg-loader v1 -->\n<link rel="stylesheet" href="x.css">\n<script src="x.js"></script>';

test('about-photo transform() puts the portrait beside the first story paragraph and changes nothing else', () => {
  const out = A.transform(about);
  assert.match(out, /<div class="btg-bob-intro"><figure class="btg-bob-photo"><img src="/);
  assert.ok(out.includes(PORT));
  assert.ok(out.indexOf('Bob Dyer\'s (aka') > out.indexOf('btg-bob-story'));
  assert.ok(out.indexOf('Fast forwarding') > out.indexOf('</div></div>'));
  assert.ok(out.endsWith(about.slice(about.indexOf('<!-- btg-loader'))));
  assert.deepStrictEqual(A.verify(about, out), []);
});
test('about-photo verify() catches lost words, changed links and a second image', () => {
  const out = A.transform(about);
  assert.ok(A.verify(about, out.replace('way back in 1993', 'in 1993')).some((p) => /text/i.test(p)));
  assert.ok(A.verify(about, out.replace('/services-2/', '/x/')).some((p) => /link/i.test(p)));
  assert.ok(A.verify(about, out.replace('</figure>', '<img src="https://elsewhere.example/a.jpg" alt=""></figure>')).some((p) => /image|markup/i.test(p)));
});
test('about-photo transform() refuses a page that already has the portrait', () => {
  assert.throws(() => A.transform(A.transform(about)), /Already/);
});
