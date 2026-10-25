// test/helper-knowledge.test.js — run: node --test test/helper-knowledge.test.js
// worker/src/knowledge.js must equal what tools/build-helper-knowledge.js builds from docs/llms.txt and dist/btg.js.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const K = require('../tools/build-helper-knowledge.js');

test('worker/src/knowledge.js is up to date (else run: node tools/build-helper-knowledge.js)', () => {
  assert.strictEqual(fs.readFileSync(K.OUT, 'utf8').replace(/\r\n/g, '\n'), K.build());
});

test('the helper knows every service page the widget can show as a card', () => {
  const slugs = JSON.parse(/SERVICE_SLUGS = (\[.*\]);/.exec(K.build())[1]);
  window.BTGHelper.TOPICS.forEach((t) => t.slugs.forEach((s) => assert.ok(slugs.includes(s), s)));
  assert.strictEqual(slugs.length, 16);
});
