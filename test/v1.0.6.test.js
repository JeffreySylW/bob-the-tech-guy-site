// Run: node --test test/
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

global.window = global;
require('../dist/btg.js');

test('fixTelLinks rewrites vanity letters to keypad digits', () => {
  const links = [
    { href: 'tel:844-TEKGUY-0' },
    { href: 'tel:8448354890' },
  ];
  links.forEach((a) => { a.getAttribute = () => a.href; a.setAttribute = (_, v) => { a.href = v; }; });
  const doc = { querySelectorAll: () => links };

  window.BTGInit.fixTelLinks(doc);

  assert.strictEqual(links[0].href, 'tel:+18448354890');
  assert.strictEqual(links[1].href, 'tel:8448354890'); // already digits: untouched
});

test('hero background bleeds full width without moving the text box', () => {
  const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
  const hero = css.match(/\.btg-hero \{[^}]*\}/)[0];
  assert.match(hero, /box-shadow:\s*0 0 0 100vmax var\(--btg-bg-0\)/);
  assert.match(hero, /clip-path:\s*inset\(0 -100vmax\)/);
  // gradient must land on bg-0 exactly at the box's sides, or the band shows a seam
  assert.match(hero, /radial-gradient\(ellipse farthest-side at 50% 0%, var\(--btg-bg-1\), var\(--btg-bg-0\)\)/);
});
