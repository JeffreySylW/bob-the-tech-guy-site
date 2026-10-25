// test/helper.test.js — run: node --test test/helper.test.js
// Bob's helper, phase 1 (vault "AI Helper", 2026-10-24): chips -> service cards -> request form -> CF7 form 16906.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
global.window = global;
require('../dist/btg.js');
const H = window.BTGHelper;
const SRC = fs.readFileSync(__dirname + '/../dist/btg.js', 'utf8');
// The privacy line's "within 30 days" is about deletion, not turnaround, so the guard reads the source without it.
const helperSrc = SRC.slice(SRC.indexOf('window.BTGHelper = '), SRC.indexOf('\n})();', SRC.indexOf('window.BTGHelper = ')))
  .replace(H.PRIVACY, '');

test('starter chips are the six agreed topics', () => {
  assert.deepStrictEqual(H.TOPICS.map((t) => t.chip), ["It's running slow", 'Virus or pop-ups', "Won't turn on", 'Wi-Fi trouble', 'Lost files', 'Cracked screen']);
});

test('every topic leads to real service cards worded with the site DESCRIPTIONS', () => {
  H.TOPICS.forEach((t) => {
    const cards = H.cardsFor(t.key);
    assert.strictEqual(cards.length, t.slugs.length, t.key);
    cards.forEach((c) => {
      assert.strictEqual(c.desc, window.BTGInit.DESCRIPTIONS[c.href]);
      assert.match(c.href, /^\/[a-z-]+\/$/);
      assert.ok(c.title && c.icon);
    });
  });
});

test('validate(): name, area and summary required, plus a phone or an email', () => {
  const ok = { name: 'Jane', phone: '', email: 'jane@example.com', area: 'va', summary: 'Slow' };
  assert.deepStrictEqual(H.validate(ok), {});
  assert.deepStrictEqual(H.validate({ ...ok, email: '', phone: '(804) 555-0100' }), {});
  assert.deepStrictEqual(Object.keys(H.validate({ ...ok, email: '' })), ['contact']);
  assert.ok(H.validate({ ...ok, email: 'nope' }).email);
  assert.ok(H.validate({ ...ok, email: '', phone: '555-01' }).phone);
  assert.ok(H.validate({ ...ok, name: '  ' }).name);
  assert.ok(H.validate({ ...ok, area: '' }).area);
  assert.ok(H.validate({ ...ok, summary: '' }).summary);
});

test('buildFields(): maps to your-name / your-email / your-subject / your-message', () => {
  const f = H.buildFields({ name: ' Jane Sample ', phone: '804-555-0100', email: 'jane@example.com', area: 'nj', summary: 'Computer running slow.', topic: 'slow', service: 'Computer Tune Up' });
  assert.deepStrictEqual(Object.keys(f), ['your-name', 'your-email', 'your-subject', 'your-message']);
  assert.strictEqual(f['your-name'], 'Jane Sample');
  assert.strictEqual(f['your-email'], 'jane@example.com');
  assert.strictEqual(f['your-subject'], 'Helper request: Computer Tune Up (NJ)');
  assert.match(f['your-message'], /^Name: Jane Sample\nPhone: 804-555-0100\nEmail: jane@example.com\nArea: Northern New Jersey\nService: Computer Tune Up\n/);
  assert.match(f['your-message'], /\n\nComputer running slow\.$/);
});

test('buildFields(): a phone-only request uses Bob\'s own address (the form requires an email) and says to call', () => {
  const f = H.buildFields({ name: 'Al', phone: '8045550100', email: '', area: 'va', summary: 'Help', topic: 'wifi' });
  assert.strictEqual(f['your-email'], 'info@bobthetechguy.com');
  assert.strictEqual(f['your-subject'], 'Helper request: Wi-Fi or internet trouble (VA) - no email, please call');
  assert.match(f['your-message'], /Email: not given, please call/);
});

test('buildFields(): your-message never passes the form\'s 2,000-character limit', () => {
  const f = H.buildFields({ name: 'A'.repeat(100), phone: '8045550100', email: 'a@b.co', area: 'va', summary: 'x'.repeat(5000), service: 'Networking' });
  assert.strictEqual(f['your-message'].length, 2000);
});

test('confirmHtml(): in hours says Bob will reply; out of hours gives the business hours', () => {
  const open = new Date('2026-10-27T15:00:00Z'); // Tue 11 AM ET
  const closed = new Date('2026-10-26T15:00:00Z'); // Mon, closed
  assert.match(H.confirmHtml('Jane Sample', open), /Thanks, Jane\. Your request is with Bob\./);
  assert.doesNotMatch(H.confirmHtml('Jane', open), /business hours/);
  const c = H.confirmHtml('Jane', closed);
  assert.match(c, /replies during business hours \(Eastern Time\): Tue 9:30 AM–7 PM, Wed–Fri 9:30 AM–5 PM, Sat 12–3 PM\./);
  assert.match(c, /844-TEKGUY-0/); assert.match(c, /\(862\) 210-5656/);
  assert.match(H.confirmHtml('<b>x</b>', open), /&lt;b&gt;x&lt;\/b&gt;/);
});

test('posts to CF7 form 16906\'s REST feedback endpoint with the Contact page\'s hidden fields', () => {
  assert.strictEqual(H.ENDPOINT, '/wp-json/contact-form-7/v1/contact-forms/16906/feedback');
  assert.strictEqual(H.CF7_HIDDEN._wpcf7, '16906');
  assert.strictEqual(H.CF7_HIDDEN._wpcf7_unit_tag, 'wpcf7-f16906-p11802-o1');
  assert.strictEqual(H.CF7_HIDDEN._wpcf7_container_post, '11802');
});

test('privacy line is the agreed wording', () => {
  assert.strictEqual(H.PRIVACY, 'Chats are answered by an AI service and deleted within 30 days.');
});

test('never-say guard: no prices, turnaround, warranty, street address, competitors or analytics in the helper', () => {
  assert.doesNotMatch(helperSrc, /\$\d|price is|costs? \$|free (estimate|quote)/i);
  assert.doesNotMatch(helperSrc, /same[- ]day|within \d+ (hour|minute|day)s?|24 hours|guarantee|warrant/i);
  assert.doesNotMatch(helperSrc, /\b(recovery|recover) (is|are) (always|guaranteed)|100%/i);
  assert.doesNotMatch(helperSrc, /Midlothian Tpke|Turnpike|\b\d{3,5} [A-Z][a-z]+ (Rd|Road|St|Street|Ave|Blvd|Pkwy)\b/);
  assert.doesNotMatch(helperSrc, /gtag|google-analytics|googletagmanager|clarity|fbq|sendBeacon|localStorage|document\.cookie/i);
  assert.doesNotMatch(helperSrc, /geek squad|best buy|staples|ubreakifix|asurion/i);
});
