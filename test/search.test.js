// test/search.test.js — run: node --test test/search.test.js
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const S = window.BTGSearch;
const P = [
  { title: 'Computer Tune Up', url: 'u1', type: 'SERVICE', icon: 'gauge', keywords: ['slow', 'speed', 'cleanup'] },
  { title: 'Memory Install', url: 'u2', type: 'SERVICE', icon: 'chip', keywords: ['ram', 'slow', 'upgrade'] },
  { title: 'Anti-Virus', url: 'u3', type: 'SERVICE', icon: 'shield', keywords: ['virus', 'malware'] },
  { title: 'PC Repair Service Chester Virginia', url: 'u4', type: 'AREA', icon: 'pin', keywords: ['repair'] },
  { title: 'Best Computer Repair Chesterfield VA', url: 'u5', type: 'AREA', icon: 'pin', keywords: ['repair'] },
  { title: 'Networking', url: 'u6', type: 'SERVICE', icon: 'wifi', keywords: ['wifi', 'router'] },
];

test('norm() lowercases, strips accents and punctuation', () => {
  assert.strictEqual(S.norm('  Wi-Fi  Résumé!! '), 'wi fi resume');
  assert.strictEqual(S.norm('Hardware Repair &amp; Upgrades'), 'hardware repair & upgrades');
});

test('rank() needs at least 2 characters and returns [] for no match', () => {
  assert.deepStrictEqual(S.rank('m', P), []);
  assert.deepStrictEqual(S.rank('zzzz', P), []);
});

test('rank() puts title-prefix matches first', () => {
  assert.strictEqual(S.rank('memo', P)[0].url, 'u2');
  assert.strictEqual(S.rank('NETWORK', P)[0].url, 'u6');
  assert.strictEqual(S.rank('virus', P)[0].url, 'u3');
});

test('rank() matches keywords and sums words: "slow computer" → Tune Up first, Memory Install included', () => {
  const r = S.rank('slow computer', P).map((p) => p.url);
  assert.strictEqual(r[0], 'u1');
  assert.ok(r.includes('u2'));
});

test('rank() keeps list order on ties and respects the limit', () => {
  assert.deepStrictEqual(S.rank('chester', P).map((p) => p.url), ['u4', 'u5']);
  assert.strictEqual(S.rank('repair', P, 1).length, 1);
});

test('esc() escapes HTML', () => {
  assert.strictEqual(S.esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});
