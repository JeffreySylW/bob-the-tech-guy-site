// test/account.test.js — run: node --test test/account.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
global.window = global;
require('../dist/btg.js');
const A = window.BTGAccount;
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');

test('loginHtml(): a real WordPress login form with the right field names', () => {
  const h = A.loginHtml('/customer-log-in/');
  assert.match(h, /<form class="btg-acct-form" action="\/wp-login\.php" method="post">/);
  assert.match(h, /name="log" type="text" autocomplete="username"/);
  assert.match(h, /name="pwd" type="password" autocomplete="current-password"/);
  assert.match(h, /name="rememberme" type="checkbox" value="forever"/);
  assert.match(h, /name="redirect_to" value="\/customer-log-in\/"/);
  assert.match(h, /href="\/wp-login\.php\?action=lostpassword"/);
  assert.doesNotMatch(h, /register|Create an account/i); // v1.6.6: no new accounts; customers just call or request a visit
  assert.match(h, /href="\/contact-2\/#btg-request"/);
  assert.match(h, /href="tel:8448354890"/);
});

test('loginHtml() escapes the return address', () => {
  assert.doesNotMatch(A.loginHtml('"><script>x</script>'), /<script>/);
});

test('every login field has a label', () => {
  const h = A.loginHtml('/');
  for (const id of ['btg-log', 'btg-pwd']) { assert.ok(h.includes('for="' + id + '"') && h.includes('id="' + id + '"'), id); }
});

test('hubHtml(): signed-in customers get profile, edit, settings and log out', () => {
  const h = A.hubHtml();
  for (const href of ['/members/me/profile/', '/members/me/profile/edit/', '/members/me/settings/', '/wp-login.php?action=logout']) assert.ok(h.includes('href="' + href + '"'), href);
  assert.doesNotMatch(h, /<form/);
});

test('initAccount() shows the hub when the page body says logged-in, the login form otherwise', () => {
  const mk = (cls) => { const box = { attrs: {}, getAttribute(k) { return this.attrs[k] || null; }, setAttribute(k, v) { this.attrs[k] = v; }, innerHTML: '' }; return { doc: { body: { className: cls }, querySelector: (s) => (s === '.btg-account' ? box : null) }, box }; };
  const out = mk('page logged-in'), inn = mk('page');
  assert.strictEqual(A.init(out.doc, { location: { pathname: '/customer-log-in/' } }), true);
  assert.match(out.box.innerHTML, /Log out/);
  A.init(inn.doc, { location: { pathname: '/my-account/' } });
  assert.match(inn.box.innerHTML, /name="pwd"/);
  assert.match(inn.box.innerHTML, /name="redirect_to" value="\/my-account\/"/);
});

test('bundle runs the account page and styles it', () => {
  assert.match(js, /window\.BTGAccount\.init\(document, window\)/);
  assert.match(css, /\.btg-acct-card \{/);
  assert.match(css, /\.btg-acct-go \{/);
  assert.match(css, /\.btg-acct-form input:focus \{[^}]*border-color: #38792f/);
});
