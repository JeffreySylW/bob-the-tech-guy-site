// test/v1.7.2.test.js — run: node --test test/v1.7.2.test.js
// Veteran-owned badge: a card in the site's style with the VeteranOwnedBusiness.com logo, linking to Bob's VOB listing.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../dist/btg.js');
const V = window.BTGVet;
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');

test('the badge links to Bob\'s VOB listing (the page the old flag image opened)', () => {
  const h = V.badgeHtml(false);
  assert.match(h, /^<a class="btg-vet" href="https:\/\/www\.veteranownedbusiness\.com\/business\/24505\/bob-the-tech-guy" target="_blank" rel="noopener"/);
  assert.match(h, /aria-label="Veteran-owned business: Bob The Tech Guy on VeteranOwnedBusiness\.com"/);
  assert.match(h, /<b>Veteran-Owned Business<\/b><small>U\.S\. Marine Corps veteran<\/small>/);
  assert.match(h, /Verified member/);
});

test('it shows the VOB logo from this repo, pinned to a release', () => {
  assert.match(V.LOGO, /^https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v1\.7\.2\/dist\/brand\/vob-logo\.png$/);
  assert.ok(fs.existsSync(path.join(__dirname, '../dist/brand/vob-logo.png')));
  assert.ok(V.badgeHtml(false).includes('<img src="' + V.LOGO + '" alt="VeteranOwnedBusiness.com" width="150" height="32" loading="lazy">'));
});

test('dark variant for the footer', () => {
  assert.match(V.badgeHtml(true), /^<a class="btg-vet btg-vet--dark"/);
  assert.match(css, /\.btg-vet--dark \{/);
});
