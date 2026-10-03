// test/v1.6.2.test.js — run: node --test test/v1.6.2.test.js
// Login menu fix, contact privacy note, quiet footer, NJ line on home. DOM behaviour is covered by test/e2e/grok-fixes.e2e.mjs.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../dist/btg.js');
const I = window.BTGInit;
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');

test('PRIVACY_NOTE says what we do with the data and links the mailto address', () => {
  assert.ok(I.PRIVACY_NOTE.includes("We use your name, email and message only to reply about your repair. We don't sell this information."));
  assert.ok(I.PRIVACY_NOTE.includes('<a href="mailto:info@bobthetechguy.com">info@bobthetechguy.com</a>'));
  assert.ok(I.PRIVACY_NOTE.includes('class="btg-privacy-note"'));
});

test('new functions are exported and wired into run()', () => {
  ['fixLoginMenu', 'addPrivacyNote', 'quietFooter', 'addNjLine'].forEach((f) => assert.strictEqual(typeof I[f], 'function', f));
  ['window.BTGInit.fixLoginMenu(document)', 'addPrivacyNote(document)', 'quietFooter(document)', 'addNjLine(document, window)']
    .forEach((s) => assert.ok(js.includes(s), s));
  assert.ok(js.indexOf('addHeroTrust(document)') < js.indexOf('addNjLine(document, window)'), 'NJ line runs after the trust line');
});

test('login menu and footer are re-run on window load', () => {
  const i = js.lastIndexOf("window.addEventListener('load', function () {");
  assert.ok(i > 0);
  const block = js.slice(i, i + 300);
  assert.ok(block.includes('fixLoginMenu') && block.includes('quietFooter'));
});

test('addNjLine does nothing off the home page', () => {
  assert.doesNotThrow(() => I.addNjLine({ querySelector() { throw new Error('touched'); } }, { location: { pathname: '/about/' } }));
});

test('CSS rules exist', () => {
  assert.ok(css.includes('.btg-privacy-note {'));
  assert.ok(css.includes('.btg-hero-alt {'));
  assert.ok(css.includes('#8bd17c'));
  assert.ok(css.includes('#38792f'));
});
