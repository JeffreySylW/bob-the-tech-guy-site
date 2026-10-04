// test/v1.7.1.test.js — run: node --test test/v1.7.1.test.js
// Hours: one weekly schedule drives the home status pill, the contact hours card and the footer list.
// Virginia service zone: a rounded area around the towns Bob covers (no address, no pin).
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const H = window.BTGHours, Z = window.BTGZone;
// Times given in UTC; October is EDT (UTC-4).
const at = (iso) => new Date(iso);

test('status pill text follows Eastern Time', () => {
  assert.strictEqual(H.status(at('2026-10-04T14:00:00Z')), 'Closed today · Opens Tuesday 9:30 AM');   // Sun 10:00
  assert.strictEqual(H.status(at('2026-10-05T14:00:00Z')), 'Closed today · Opens tomorrow 9:30 AM');  // Mon 10:00
  assert.strictEqual(H.status(at('2026-10-06T12:00:00Z')), 'Opens today at 9:30 AM');                 // Tue 8:00
  assert.strictEqual(H.status(at('2026-10-06T14:00:00Z')), 'Open now · until 7 PM');                  // Tue 10:00
  assert.strictEqual(H.status(at('2026-10-06T23:30:00Z')), 'Closed now · Opens tomorrow 9:30 AM');    // Tue 19:30
  assert.strictEqual(H.status(at('2026-10-10T17:00:00Z')), 'Open now · until 3 PM');                  // Sat 13:00
  assert.strictEqual(H.status(at('2026-10-10T20:00:00Z')), 'Closed now · Opens Tuesday 9:30 AM');     // Sat 16:00
  assert.strictEqual(H.status(at('2026-10-04T04:30:00Z')), 'Closed today · Opens Tuesday 9:30 AM');   // Sun 00:30 (just after midnight)
  assert.ok(H.isOpen(at('2026-10-06T14:00:00Z')) && !H.isOpen(at('2026-10-04T14:00:00Z')));
});

test('footer rows are grouped from the same weekly schedule', () => {
  assert.deepStrictEqual(H.footerRows(), [['Tue', '9:30 AM–7 PM'], ['Wed–Fri', '9:30 AM–5 PM'], ['Sat', '12–3 PM'], ['Sun–Mon', 'Closed']]);
  assert.deepStrictEqual(window.BTGFooter.HOURS, H.footerRows());
});

test('weekly card lists Mon–Sun and marks today', () => {
  const h = H.weekHtml(at('2026-10-06T14:00:00Z')); // Tuesday
  assert.strictEqual((h.match(/<dt/g) || []).length, 7);
  assert.match(h, /<dt class="is-today">Tue<\/dt><dd class="is-today">9:30 AM – 7 PM<\/dd>/);
  assert.match(h, /<dt>Sun<\/dt><dd>Closed<\/dd>/);
});

test('service zone: rounded outline that contains every town, no street address anywhere', () => {
  const ring = Z.zone();
  assert.ok(ring.length >= 24, 'rounded, many points');
  const inside = (p) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const a = ring[i], b = ring[j];
    if ((a[0] > p[0]) !== (b[0] > p[0]) && p[1] < ((b[1] - a[1]) * (p[0] - a[0])) / (b[0] - a[0]) + a[1]) c = !c; } return c; };
  for (const t of Z.TOWNS) assert.ok(inside([t[1], t[2]]), t[0]);
  assert.ok(Z.TOWNS.length >= 9);
  assert.doesNotMatch(JSON.stringify(Z.TOWNS), /\d+ [A-Z][a-z]+ (St|Rd|Ave|Dr|Ln|Ct)/);
});

test('Leaflet loads from cdnjs with integrity hashes, only when a map is about to show', () => {
  assert.match(Z.LEAFLET.js, /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet\/1\.9\.4\/leaflet\.min\.js$/);
  assert.match(Z.LEAFLET.jsSri, /^sha512-/);
  assert.match(Z.LEAFLET.cssSri, /^sha512-/);
});
