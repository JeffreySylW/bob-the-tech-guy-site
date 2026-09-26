# Town Page Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the walls of text on the 9 Virginia town posts into 6 summary cards with native "Read more" expanders, without changing any of the existing words.

**Architecture:** A pure string→string transform (`tools/cards-transform.js`, UMD so it runs under `node --test` and in the browser) regroups each post's flat HTML into a card grid and a `verify()` function enforces the no-rewrite rule. Card styling ships in the jsDelivr bundle as v1.0.9. Because the browser extension will not return raw post HTML to the session, the transform runs in the signed-in WordPress tab against the live raw HTML, loaded from the tagged repo, and only saves when `verify()` returns no problems.

**Tech Stack:** Plain ES5-compatible JavaScript, `node:test` + `node:assert` (Node 24), CSS, WordPress REST API (`/wp-json/wp/v2/posts/<id>`, nonce from `/wp-admin/admin-ajax.php?action=rest-nonce`), jsDelivr (`cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@<tag>/…`), headless Edge for render checks.

**Spec:** `docs/superpowers/specs/2026-09-25-town-page-cards-design.md`

## Global Constraints

- Scope: posts 28867, 28872, 28873, 28874, 28875, 28876, 28877, 28878, 28879 only.
- Re-skin, don't rewrite: no words added, removed or changed except the 6 card headings and the "Read more" label. Moving and splitting existing text is allowed.
- Card titles, in order: "Virus & Malware Removal", "New Computer Setup", "Internet & Home Wi-Fi", "Home & Small-Office Networks", "Tune-Ups & Maintenance", "Data Recovery".
- Hero `<section class="btg-hero">…</section>`, the "Proudly Serving [Town]…" heading and paragraph, and the loader `<link>`/`<script>` lines stay byte-for-byte identical.
- No street address anywhere, ever.
- Brand green stays the accent; use existing `--btg-*` tokens.
- No analytics or tracking.
- Grid: 3 columns desktop, 2 below 900px, 1 below 600px, `align-items: start`.
- Every live write (git push of a tag, WordPress POST) requires the session to be out of auto mode; stop and ask if a write is denied.

## Review Focus

- **WordPress auto-formatting (wpautop) on render** may inject `<p>`/`<br />` into the card markup — the user expects clean cards; Task 7 checks the public HTML of the first saved post before any other post is touched.
- **A post edited between read and save** (Bob or another editor) — the user expects that edit not to be overwritten; the runner in Task 6 re-reads the raw content right before each POST and aborts that post if it changed.
- **Chesterfield's different headings and extra paragraph** — the user expects Chesterfield to transform like the others; Task 3 has a Chesterfield fixture test.
- **Sentence splitting with inline tags or curly apostrophes** ("you’re", `<strong>`) — the user expects the summary to be the whole first sentence with tags intact; Task 2 tests both.
- **Running the transform twice** — the user expects no double-wrapped cards; Task 3 tests that a second run throws "Already transformed".

---

## File Structure

| File | Responsibility |
|---|---|
| `tools/cards-transform.js` (create) | `text`, `split`, `splitFirstSentence`, `transform`, `verify` — all pure, UMD export `BTGCards` |
| `test/cards-transform.test.js` (create) | Unit tests for the above, using fixtures |
| `test/fixtures/28873.html`, `test/fixtures/28867.html` (create) | Raw post HTML for Chester and Chesterfield (from Task 1 snapshot) |
| `backups/2026-09-25/<id>.html` (create ×9) | Pre-change raw HTML of each post, for rollback |
| `dist/btg.css` (modify) | Card styles, icon tiles, checklist ticks, post-title hide |
| `test/v1.0.9.test.js` (create) | CSS assertions for the card styles |
| `docs/superpowers/reports/2026-09-25-walls-of-text-sweep.md` (create, Task 9) | Read-only sweep of remaining pages |

---

### Task 1: Snapshot the 9 posts (backups + fixtures)

**Files:**
- Create: `backups/2026-09-25/<id>.html` ×9, `test/fixtures/28873.html`, `test/fixtures/28867.html`

**Interfaces:**
- Produces: fixture files used by Tasks 2–4; backups used for rollback in Tasks 7–8.

- [ ] **Step 1: Ask the user to approve one download**

Ask in chat: "OK to download `bob-posts-raw-2026-09-25.json` (~80 KB, generated in your signed-in WordPress tab from the 9 town posts' raw content) to your Downloads folder?" Wait for a clear yes.

- [ ] **Step 2: Generate the download in the signed-in Chrome tab** (any `https://bobthetechguy.com/wp-admin/…` page)

```js
const ids = [28867, 28872, 28873, 28874, 28875, 28876, 28877, 28878, 28879];
const n = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce').then(r => r.text());
const data = {};
for (const id of ids) {
  data[id] = (await fetch(`/wp-json/wp/v2/posts/${id}?context=edit&_fields=content`, { headers: { 'X-WP-Nonce': n } }).then(r => r.json())).content.raw;
}
const a = document.createElement('a');
a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
a.download = 'bob-posts-raw-2026-09-25.json';
document.body.append(a); a.click(); a.remove();
`${Object.keys(data).length} posts, ${JSON.stringify(data).length} bytes`
```

Expected: `9 posts, ~70000–90000 bytes`.

- [ ] **Step 3: Split into backups and fixtures**

```bash
cd /c/Users/there/Projects/bob-the-tech-guy-site
node -e "
const fs=require('fs');
const d=JSON.parse(fs.readFileSync(process.env.USERPROFILE+'/Downloads/bob-posts-raw-2026-09-25.json','utf8'));
fs.mkdirSync('backups/2026-09-25',{recursive:true}); fs.mkdirSync('test/fixtures',{recursive:true});
for (const [id,html] of Object.entries(d)) fs.writeFileSync('backups/2026-09-25/'+id+'.html',html);
fs.copyFileSync('backups/2026-09-25/28873.html','test/fixtures/28873.html');
fs.copyFileSync('backups/2026-09-25/28867.html','test/fixtures/28867.html');
console.log(Object.keys(d).length,'written');"
```

Expected: `9 written`.

- [ ] **Step 4: Sanity-check the snapshot**

```bash
grep -c 'class="btg-hero"' backups/2026-09-25/*.html
grep -L 'Proudly Serving' backups/2026-09-25/*.html
```

Expected: every file `1`; the second command prints nothing.

- [ ] **Step 5: Commit**

```bash
git add backups test/fixtures
git commit -m "Snapshot 9 town posts' raw HTML (backups + test fixtures)"
```

---

### Task 2: HTML splitting, text normalizing, first-sentence split

**Files:**
- Create: `tools/cards-transform.js`
- Test: `test/cards-transform.test.js`

**Interfaces:**
- Produces: `BTGCards.text(html) → string`, `BTGCards.split(html) → Array<{tag, html, start, end, text}>`, `BTGCards.splitFirstSentence(pHtml) → {sentence, restHtml}`.

- [ ] **Step 1: Write the failing tests**

```js
// test/cards-transform.test.js — run: node --test test/cards-transform.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../tools/cards-transform.js');
const fx = (id) => fs.readFileSync(path.join(__dirname, 'fixtures', id + '.html'), 'utf8');

test('text() strips tags and normalizes entities and curly quotes', () => {
  assert.strictEqual(C.text('<p>you&#8217;re <strong>ready</strong> &amp; set</p>'), "you're ready & set");
  assert.strictEqual(C.text('<p>you\u2019re here</p>'), "you're here");
});

test('split() covers the whole fixture with top-level blocks', () => {
  for (const id of ['28873', '28867']) {
    const html = fx(id);
    const els = C.split(html);
    assert.strictEqual(els.map((e) => e.html).join('').replace(/\s/g, ''), html.replace(/\s/g, ''));
    assert.ok(els.some((e) => e.tag === 'section' && /class="btg-hero"/.test(e.html)));
  }
});

test('split() throws on stray top-level text', () => {
  assert.throws(() => C.split('<p>ok</p>\nstray words\n<p>ok</p>'), /Unexpected content/);
});

test('splitFirstSentence() keeps inline tags and curly apostrophes', () => {
  const r = C.splitFirstSentence('<p>So you&#8217;re <strong>ready</strong> now. Second part here.</p>');
  assert.strictEqual(r.sentence, 'So you&#8217;re <strong>ready</strong> now.');
  assert.strictEqual(r.restHtml, '<p>Second part here.</p>');
});

test('splitFirstSentence() with a single sentence leaves no rest', () => {
  const r = C.splitFirstSentence('<p>Have you lost your data?</p>');
  assert.strictEqual(r.sentence, 'Have you lost your data?');
  assert.strictEqual(r.restHtml, '');
});

test('splitFirstSentence() refuses a cut inside an inline tag', () => {
  assert.throws(() => C.splitFirstSentence('<p><strong>One. Two.</strong></p>'), /unbalanced/i);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/cards-transform.test.js`
Expected: FAIL — `Cannot find module '../tools/cards-transform.js'`.

- [ ] **Step 3: Implement**

```js
// tools/cards-transform.js
// Regroups a town post's walls of text into summary cards.
// Spec: docs/superpowers/specs/2026-09-25-town-page-cards-design.md
// Pure string in, string out. Runs under node --test and in the browser
// (loaded from jsDelivr into the signed-in WP tab as window.BTGCards).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BTGCards = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ENTITIES = {
    '&amp;': '&', '&#038;': '&', '&nbsp;': ' ', '&quot;': '"',
    '&#8217;': "'", '&rsquo;': "'", '&#8216;': "'", '&lsquo;': "'",
    '&#8220;': '"', '&#8221;': '"', '&ldquo;': '"', '&rdquo;': '"',
    '&#8211;': '-', '&ndash;': '-', '&#8212;': '-', '&mdash;': '-'
  };

  function text(html) {
    return html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[#\w]+;/g, function (e) { return ENTITIES[e] || ' '; })
      .replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[\u2013\u2014]/g, '-')
      .replace(/\s+/g, ' ').trim();
  }

  // Top-level blocks of a flat post body. Anything else at top level is an
  // error: the transform must never silently skip content.
  var BLOCK = /<(section|p|h[1-6]|ul|ol|div|blockquote|script|style|details)\b[^>]*>[\s\S]*?<\/\1\s*>|<link\b[^>]*>|<hr\b[^>]*>/y;

  function split(html) {
    var out = [];
    var pos = 0;
    var ws = /\s*/y;
    while (true) {
      ws.lastIndex = pos; ws.exec(html); pos = ws.lastIndex;
      if (pos >= html.length) break;
      BLOCK.lastIndex = pos;
      var m = BLOCK.exec(html);
      if (!m) throw new Error('Unexpected content at ' + pos + ': ' + html.slice(pos, pos + 60));
      out.push({
        tag: (m[1] || m[0].match(/^<(\w+)/)[1]).toLowerCase(),
        html: m[0], start: pos, end: BLOCK.lastIndex, text: text(m[0])
      });
      pos = BLOCK.lastIndex;
    }
    return out;
  }

  function splitFirstSentence(pHtml) {
    var m = /^<p\b([^>]*)>([\s\S]*)<\/p\s*>$/.exec(pHtml.trim());
    if (!m) throw new Error('Not a paragraph: ' + pHtml.slice(0, 60));
    var attrs = m[1], inner = m[2], inTag = false, cut = inner.length;
    for (var i = 0; i < inner.length; i++) {
      var ch = inner[i];
      if (ch === '<') inTag = true;
      else if (ch === '>') inTag = false;
      else if (!inTag && /[.!?]/.test(ch) && (i + 1 === inner.length || /\s/.test(inner[i + 1]))) { cut = i + 1; break; }
    }
    var sentence = inner.slice(0, cut).trim();
    var open = (sentence.match(/<[a-z][^>]*>/gi) || []).length;
    var close = (sentence.match(/<\/[a-z][^>]*>/gi) || []).length;
    if (open !== close) throw new Error('First sentence has unbalanced tags: ' + sentence.slice(0, 60));
    var rest = inner.slice(cut).trim();
    return { sentence: sentence, restHtml: rest ? '<p' + attrs + '>' + rest + '</p>' : '' };
  }

  return { text: text, split: split, splitFirstSentence: splitFirstSentence };
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/cards-transform.test.js`
Expected: PASS, 6 tests. If `split() covers the whole fixture` fails with `Unexpected content`, print the reported snippet and extend `BLOCK` only with the tag it names — never with a catch-all.

- [ ] **Step 5: Commit**

```bash
git add tools/cards-transform.js test/cards-transform.test.js
git commit -m "Add cards-transform parsing helpers (split, text, first sentence)"
```

---

### Task 3: `transform()` — build the card grid

**Files:**
- Modify: `tools/cards-transform.js` (add `CARDS`, `REMOVABLE`, `transform`; export them)
- Modify: `docs/superpowers/specs/2026-09-25-town-page-cards-design.md` (add "Best Computer Repair Chesterfield VA" to the removed-subheadings list)
- Test: `test/cards-transform.test.js`

**Interfaces:**
- Consumes: `split`, `splitFirstSentence`, `text` from Task 2.
- Produces: `BTGCards.transform(html) → html` (throws on any unmapped/missing/duplicate content or if already transformed); `BTGCards.CARDS` (array of `{icon, title, paras, optional?, list?}`); `BTGCards.REMOVABLE` (RegExp).

- [ ] **Step 1: Write the failing tests** (append to `test/cards-transform.test.js`)

```js
const TITLES = ['Virus &amp; Malware Removal', 'New Computer Setup', 'Internet &amp; Home Wi-Fi',
  'Home &amp; Small-Office Networks', 'Tune-Ups &amp; Maintenance', 'Data Recovery'];

test('transform() builds 6 cards in order on Chester', () => {
  const out = C.transform(fx('28873'));
  const titles = [...out.matchAll(/<h3 class="btg-card-title">([^<]*)<\/h3>/g)].map((m) => m[1]);
  assert.deepStrictEqual(titles, TITLES);
  assert.strictEqual((out.match(/<details><summary>Read more<\/summary>/g) || []).length, 6);
  const summaries = [...out.matchAll(/<p class="btg-card-summary">([\s\S]*?)<\/p>/g)].map((m) => C.text(m[1]));
  assert.match(summaries[0], /^Computers and the threats .*sophisticated\.$/);
  assert.match(summaries[5], /^Have you lost your data .*\?$/);
});

test('transform() moves the call-to-action pair right after the grid', () => {
  const out = C.transform(fx('28873'));
  assert.match(out, /<\/article><\/div>\s*<div class="btg-cards-cta"><p><strong>Have any questions\?[\s\S]*?<\/p><p><strong>844-TEKGUY-0<\/strong><\/p><\/div>/);
});

test('transform() removes only the replaced subheadings', () => {
  const out = C.transform(fx('28873'));
  const heads = C.split(out).filter((e) => /^h[2-4]$/.test(e.tag)).map((e) => e.text);
  assert.ok(!heads.some((h) => C.REMOVABLE.test(h)), heads.join(' | '));
  assert.ok(heads.some((h) => h.indexOf('Proudly Serving') === 0));
});

test('transform() keeps hero and Proudly Serving tail byte-identical', () => {
  const before = fx('28873');
  const out = C.transform(before);
  const hero = (h) => C.split(h).find((e) => e.tag === 'section').html;
  assert.strictEqual(hero(out), hero(before));
  const tail = (h) => h.slice(h.lastIndexOf('<h', h.indexOf('Proudly Serving')));
  assert.strictEqual(tail(out), tail(before));
});

test('transform() handles Chesterfield (extra paragraph, different headings)', () => {
  const out = C.transform(fx('28867'));
  const net = out.split('btg-card--network')[1].split('</article>')[0];
  assert.match(C.text(net), /There are multiple ways/);
});

test('transform() refuses to run twice', () => {
  assert.throws(() => C.transform(C.transform(fx('28873'))), /Already transformed/);
});

test('transform() fails loudly on a missing anchor', () => {
  const html = fx('28873').replace(/<p>Your computer, like any machine[\s\S]*?<\/p>/, '');
  assert.throws(() => C.transform(html), /Your computer, like any machine/);
});

test('transform() fails loudly on unmapped content', () => {
  const html = fx('28873').replace(/(<\/section>)/, '$1\n\n<p>Surprise paragraph nobody mapped.</p>');
  assert.throws(() => C.transform(html), /Unmapped content: Surprise paragraph/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/cards-transform.test.js`
Expected: FAIL — `C.transform is not a function`.

- [ ] **Step 3: Implement** (insert before the `return` in `tools/cards-transform.js`, and replace the `return`)

```js
  var CARDS = [
    { icon: 'shield', title: 'Virus &amp; Malware Removal', paras: ['Computers and the threats', 'fights viruses and malware'], list: true },
    { icon: 'laptop', title: 'New Computer Setup', paras: ['So you have a new computer'], list: true },
    { icon: 'wifi', title: 'Internet &amp; Home Wi-Fi', paras: ['Whether your home internet'] },
    { icon: 'network', title: 'Home &amp; Small-Office Networks', paras: ['When asked to set up a shared', 'There are multiple ways', 'The way homes and small businesses'], optional: ['There are multiple ways'] },
    { icon: 'gauge', title: 'Tune-Ups &amp; Maintenance', paras: ['Your computer, like any machine'] },
    { icon: 'drive', title: 'Data Recovery', paras: ['Have you lost your data'], list: true }
  ];

  // Subheadings the card titles replace. Everything else in the body must be
  // claimed by a card or the CTA, or transform() throws.
  var REMOVABLE = /^(PC Repair Service .+ Virginia|Best Computer Repair Chesterfield VA|Internet, Home (&|and) Wireless Networking|Home Networking|Wireless Networking|New Computer Setup|Tune-Ups (&|and) Data Recovery)$/;

  function isHeading(e) { return /^h[2-4]$/.test(e.tag); }

  function transform(html) {
    if (html.indexOf('class="btg-cards"') !== -1) throw new Error('Already transformed');
    var els = split(html);
    var heroIdx = -1, endIdx = -1;
    els.forEach(function (e, i) {
      if (heroIdx < 0 && e.tag === 'section' && /class="btg-hero"/.test(e.html)) heroIdx = i;
      if (endIdx < 0 && isHeading(e) && e.text.indexOf('Proudly Serving') === 0) endIdx = i;
    });
    if (heroIdx < 0) throw new Error('No hero section');
    if (endIdx < 0 || endIdx < heroIdx) throw new Error('No "Proudly Serving" heading after the hero');
    var region = els.slice(heroIdx + 1, endIdx);
    var claimed = [];
    function claim(e) { if (claimed.indexOf(e) === -1) claimed.push(e); return e; }

    function findP(anchor, optional) {
      var hits = region.filter(function (e) { return e.tag === 'p' && e.text.indexOf(anchor) !== -1; });
      if (hits.length > 1) throw new Error('Anchor found ' + hits.length + ' times: "' + anchor + '"');
      if (!hits.length) { if (optional) return null; throw new Error('Missing anchor: "' + anchor + '"'); }
      return claim(hits[0]);
    }

    var cards = CARDS.map(function (c) {
      var ps = c.paras.map(function (a) { return findP(a, (c.optional || []).indexOf(a) !== -1); }).filter(Boolean);
      var parts = ps.slice();
      if (c.list) {
        var ul = null;
        for (var i = region.indexOf(ps[ps.length - 1]) + 1; i < region.length; i++) {
          if (region[i].tag === 'ul') { ul = region[i]; break; }
          if (region[i].tag === 'p') break;
        }
        if (!ul) throw new Error('No checklist after "' + c.paras[c.paras.length - 1] + '"');
        parts.push(claim(ul));
      }
      var first = splitFirstSentence(ps[0].html);
      var body = first.restHtml + parts.slice(1).map(function (e) { return e.html.trim(); }).join('');
      return '<article class="btg-card btg-card--' + c.icon + '">' +
        '<h3 class="btg-card-title">' + c.title + '</h3>' +
        '<p class="btg-card-summary">' + first.sentence + '</p>' +
        '<details><summary>Read more</summary>' + body + '</details></article>';
    });

    var q = region.filter(function (e) { return e.tag === 'p' && e.text.indexOf('Have any questions?') === 0; });
    if (q.length !== 1) throw new Error('Expected one "Have any questions?" paragraph, found ' + q.length);
    var phone = region[region.indexOf(q[0]) + 1];
    if (!phone || phone.tag !== 'p' || phone.text !== '844-TEKGUY-0') throw new Error('Phone paragraph not right after "Have any questions?"');
    var cta = '<div class="btg-cards-cta">' + claim(q[0]).html.trim() + claim(phone).html.trim() + '</div>';

    region.forEach(function (e) { if (isHeading(e) && REMOVABLE.test(e.text)) claim(e); });
    var left = region.filter(function (e) { return claimed.indexOf(e) === -1; });
    if (left.length) throw new Error('Unmapped content: ' + left.map(function (e) { return e.text.slice(0, 50); }).join(' | '));

    return html.slice(0, els[heroIdx].end) + '\n\n' +
      '<div class="btg-cards">' + cards.join('') + '</div>\n\n' +
      cta + '\n\n' + html.slice(els[endIdx].start);
  }

  return { text: text, split: split, splitFirstSentence: splitFirstSentence, CARDS: CARDS, REMOVABLE: REMOVABLE, transform: transform };
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/cards-transform.test.js`
Expected: PASS, 14 tests. If Chester or Chesterfield throws `Unmapped content: …`, read the named text: if it is a subheading the cards replace, add it to `REMOVABLE`; if it is body text, stop and ask the user which card it belongs in (do not drop it).

- [ ] **Step 5: Update the spec's removed-subheadings list**

In `docs/superpowers/specs/2026-09-25-town-page-cards-design.md`, in the "**Removed:**" bullet, change `(Chesterfield's equivalents: "New Computer Setup", …` to begin `(Chesterfield's equivalents: "Best Computer Repair Chesterfield VA", "New Computer Setup", …`.

- [ ] **Step 6: Commit**

```bash
git add tools/cards-transform.js test/cards-transform.test.js docs/superpowers/specs/2026-09-25-town-page-cards-design.md
git commit -m "Add cards transform: 6 summary cards + CTA block, fail-loud on unmapped content"
```

---

### Task 4: `verify()` — the no-rewrite safety checks

**Files:**
- Modify: `tools/cards-transform.js` (add `words`, `verify`; export `verify`)
- Test: `test/cards-transform.test.js`

**Interfaces:**
- Consumes: `split`, `text`, `CARDS`, `REMOVABLE`.
- Produces: `BTGCards.verify(before, after) → string[]` (empty array = safe to save).

- [ ] **Step 1: Write the failing tests** (append)

```js
test('verify() passes a real transform of both fixtures', () => {
  for (const id of ['28873', '28867']) {
    const before = fx(id);
    assert.deepStrictEqual(C.verify(before, C.transform(before)), []);
  }
});

test('verify() catches a changed word', () => {
  const before = fx('28873');
  const after = C.transform(before).replace('sophisticated', 'advanced');
  assert.ok(C.verify(before, after).some((p) => /sophisticated|advanced/.test(p)));
});

test('verify() catches a dropped sentence', () => {
  const before = fx('28873');
  const after = C.transform(before).replace(/<p class="btg-card-summary">[\s\S]*?<\/p>/, '<p class="btg-card-summary"></p>');
  assert.ok(C.verify(before, after).length > 0);
});

test('verify() catches a changed hero', () => {
  const before = fx('28873');
  const after = C.transform(before).replace('btg-hero-lede">', 'btg-hero-lede"> ');
  assert.ok(C.verify(before, after).includes('Hero changed'));
});

test('verify() catches a street address', () => {
  const before = fx('28873');
  const after = C.transform(before).replace('Read more</summary>', 'Read more</summary><p>123 Main Street</p>');
  assert.ok(C.verify(before, after).includes('Street-address pattern found'));
});

test('verify() catches a wrong card count', () => {
  const before = fx('28873');
  const after = C.transform(before).replace(/<article class="btg-card btg-card--drive">[\s\S]*?<\/article>/, '');
  assert.ok(C.verify(before, after).some((p) => /6 cards/.test(p)));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/cards-transform.test.js`
Expected: FAIL — `C.verify is not a function`.

- [ ] **Step 3: Implement** (insert before the `return`, and add `verify: verify` to the returned object)

```js
  var ADDED = CARDS.map(function (c) { return c.title; }).join(' ') + ' ' + new Array(CARDS.length + 1).join('Read more ');
  var ADDRESS = /\b\d{1,6}\s+(?:[A-Z][a-z]+\s+){1,3}(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pkwy|Parkway|Hwy|Highway|Tpke|Turnpike|Pike|Way|Pl|Place)\b/;

  function words(html) { return text(html).toLowerCase().split(/[^a-z0-9'\-]+/).filter(Boolean); }
  function bag(list) { var m = {}; list.forEach(function (w) { m[w] = (m[w] || 0) + 1; }); return m; }
  function count(s, re) { return (s.match(re) || []).length; }
  function heroOf(h) { var e = split(h).filter(function (x) { return x.tag === 'section' && /class="btg-hero"/.test(x.html); })[0]; return e ? e.html : null; }
  function tailOf(h) {
    var els = split(h);
    for (var i = 0; i < els.length; i++) if (isHeading(els[i]) && els[i].text.indexOf('Proudly Serving') === 0) return h.slice(els[i].start);
    return null;
  }

  function verify(before, after) {
    var problems = [];
    var removed = split(before).filter(function (e) { return isHeading(e) && REMOVABLE.test(e.text); }).map(function (e) { return e.html; }).join(' ');
    var expect = bag(words(before).concat(words(ADDED)));
    words(removed).forEach(function (w) { expect[w]--; });
    var got = bag(words(after));
    Object.keys(expect).concat(Object.keys(got)).forEach(function (w) {
      var e = expect[w] || 0, g = got[w] || 0;
      if (e !== g) problems.push('Word "' + w + '" expected ' + e + ' times, found ' + g);
    });
    if (heroOf(after) === null || heroOf(after) !== heroOf(before)) problems.push('Hero changed');
    if (tailOf(after) === null || tailOf(after) !== tailOf(before)) problems.push('Proudly Serving / loader section changed');
    if (ADDRESS.test(text(after))) problems.push('Street-address pattern found');
    var n = count(after, /<article class="btg-card btg-card--/g);
    if (n !== 6 || count(after, /<h3 class="btg-card-title">/g) !== 6 || count(after, /<p class="btg-card-summary">/g) !== 6 || count(after, /<details><summary>Read more<\/summary>/g) !== 6) {
      problems.push('Expected 6 cards with title, summary and Read more; found ' + n + ' cards');
    }
    return problems;
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/cards-transform.test.js`
Expected: PASS, 20 tests. If "verify() passes a real transform" reports a word mismatch on a word like `&` or a hyphenated form, fix `words()` normalization (both sides go through it) — never loosen the equality check.

- [ ] **Step 5: Run the transform on all 9 backups as an offline dry run**

```bash
node -e "
const C=require('./tools/cards-transform.js'),fs=require('fs');
for (const f of fs.readdirSync('backups/2026-09-25')) {
  const b=fs.readFileSync('backups/2026-09-25/'+f,'utf8');
  try { const a=C.transform(b); const p=C.verify(b,a); console.log(f, p.length?'FAIL '+p.join('; '):'OK'); }
  catch(e){ console.log(f,'ERROR',e.message); }
}"
```

Expected: 9 lines, all `OK`. Any `ERROR`/`FAIL`: fix per Task 3 Step 4 guidance, add a regression test for it, re-run.

- [ ] **Step 6: Commit**

```bash
git add tools/cards-transform.js test/cards-transform.test.js
git commit -m "Add verify(): word conservation, protected hero/tail, address guard, card structure"
```

---

### Task 5: Card styles — bundle v1.0.9

**Files:**
- Modify: `dist/btg.css` (tokens + new `06-cards.css` section at end)
- Test: `test/v1.0.9.test.js`
- Also committed here: the already-written, uncommitted v1.0.8 trust-line changes in `dist/btg.js`, `dist/btg.css`, `test/v1.0.7.test.js`.

**Interfaces:**
- Produces: CSS classes `.btg-cards`, `.btg-card`, `.btg-card--{shield,laptop,wifi,network,gauge,drive}`, `.btg-card-title`, `.btg-card-summary`, `.btg-cards-cta` — exactly the class names `transform()` emits.

- [ ] **Step 1: Write the failing test**

```js
// test/v1.0.9.test.js — run: node --test test/v1.0.9.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const C = require('../tools/cards-transform.js');

test('card grid: 3 / 2 / 1 columns, top-aligned', () => {
  assert.match(css, /\.btg-cards \{[^}]*grid-template-columns: repeat\(3, 1fr\);[^}]*align-items: start;/);
  assert.match(css, /@media \(max-width: 900px\) \{\s*\.btg-cards \{ grid-template-columns: repeat\(2, 1fr\); \}/);
  assert.match(css, /@media \(max-width: 600px\) \{\s*\.btg-cards \{ grid-template-columns: 1fr; \}/);
});

test('every card icon the transform emits has a style', () => {
  for (const c of C.CARDS) assert.match(css, new RegExp('\\.btg-card--' + c.icon + '::before \\{'));
});

test('Read more uses the AA-safe link green and has a visible focus ring', () => {
  assert.match(css, /\.btg-card summary \{[^}]*color: var\(--btg-green-link\);/);
  assert.match(css, /\.btg-card summary:focus-visible \{[^}]*outline: 3px solid/);
});

test('posts with a hero hide the duplicate title and prev/next nav', () => {
  assert.match(css, /body\.single-post:has\(\.btg-hero\) h2\.entry-title,\s*body\.single-post:has\(\.btg-hero\) \.single-navigation \{\s*display: none !important;/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/v1.0.9.test.js`
Expected: FAIL on all 4 (no card styles yet).

- [ ] **Step 3: Implement** — add `--btg-green-tint: #e3f1df;` under the green scale in `:root`, then append to `dist/btg.css`:

```css
/* 06-cards.css — town page summary cards (spec 2026-09-25-town-page-cards) */
.btg-cards { display: grid; grid-template-columns: repeat(3, 1fr); align-items: start; gap: var(--btg-space-4); margin: var(--btg-space-2) 0 var(--btg-space-5); }
@media (max-width: 900px) {
  .btg-cards { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .btg-cards { grid-template-columns: 1fr; }
}
.btg-card { background: var(--btg-card-bg); border: 1px solid var(--btg-card-border); border-top: 3px solid var(--btg-green); border-radius: var(--btg-radius-md); padding: 22px 22px 16px; }
.btg-card::before { content: ""; display: block; width: 34px; height: 34px; border-radius: 8px; background: var(--btg-green-tint) center / 22px no-repeat; }
.btg-card--shield::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z'/%3E%3Cpath d='M9 12l2 2 4-4'/%3E%3C/svg%3E"); }
.btg-card--laptop::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='4' y='5' width='16' height='11' rx='1'/%3E%3Cpath d='M2 19h20'/%3E%3C/svg%3E"); }
.btg-card--wifi::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 9a15 15 0 0 1 20 0'/%3E%3Cpath d='M5 12.5a10 10 0 0 1 14 0'/%3E%3Cpath d='M8.5 16a5 5 0 0 1 7 0'/%3E%3Ccircle cx='12' cy='19.5' r='1'/%3E%3C/svg%3E"); }
.btg-card--network::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='2' width='6' height='5' rx='1'/%3E%3Crect x='2' y='17' width='6' height='5' rx='1'/%3E%3Crect x='16' y='17' width='6' height='5' rx='1'/%3E%3Cpath d='M12 7v5M5 17v-3h14v3'/%3E%3C/svg%3E"); }
.btg-card--gauge::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 18a8 8 0 1 1 16 0'/%3E%3Cpath d='M12 18l4-6'/%3E%3C/svg%3E"); }
.btg-card--drive::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='16' rx='2'/%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Ccircle cx='12' cy='12' r='1'/%3E%3C/svg%3E"); }
.btg-card-title { font-family: var(--btg-font-head) !important; font-size: 19px !important; line-height: 1.3 !important; margin: var(--btg-space-3) 0 6px !important; color: var(--btg-text) !important; }
.btg-card-summary, .btg-card details p, .btg-card details li { color: var(--btg-text-muted); font-size: 15px; line-height: 1.55; }
.btg-card-summary { margin: 0 0 10px !important; }
.btg-card summary { cursor: pointer; color: var(--btg-green-link); font-weight: 700; font-size: 14px; list-style: none; }
.btg-card summary::-webkit-details-marker { display: none; }
.btg-card summary::after { content: " +"; }
.btg-card details[open] > summary::after { content: " \2013"; }
.btg-card details[open] > summary { margin-bottom: 10px; }
.btg-card summary:focus-visible { outline: 3px solid var(--btg-green-lighter); outline-offset: 2px; border-radius: 2px; }
.btg-card details ul { list-style: none; margin: 0 !important; padding: 0 !important; }
.btg-card details li { position: relative; padding-left: 22px; margin-bottom: 6px; }
.btg-card details li::before { content: ""; position: absolute; left: 2px; top: 0.4em; width: 10px; height: 5px; border-left: 2px solid var(--btg-green); border-bottom: 2px solid var(--btg-green); transform: rotate(-45deg); }
.btg-cards-cta { text-align: center; margin-bottom: var(--btg-space-5); }
body.single-post:has(.btg-hero) h2.entry-title,
body.single-post:has(.btg-hero) .single-navigation {
  display: none !important;
}
```

- [ ] **Step 4: Run all tests**

Run: `node --test test/`
Expected: PASS — all files (v1.0.6, v1.0.7 incl. trust-line tests, v1.0.9, cards-transform).

- [ ] **Step 5: Render check on the Chester backup, offline**

Build a local page from the live Chester HTML with the Chester body replaced by `transform(backups/2026-09-25/28873.html)` rendered through the page shell, the new `dist/btg.css` inlined, and screenshot at 1440 and 500 widths with headless Edge (same recipe used for v1.0.6–v1.0.8 checks). Expected: matches the approved mockup — 3 columns / 1 column, icons in green tiles, "Read more +" in link green, checklist ticks, no title/prev-next above the hero, hero call button visible.

- [ ] **Step 6: Commit**

```bash
git add dist test
git commit -m "v1.0.9: card grid styles, icon tiles, checklist ticks, hide duplicate post title (+ v1.0.8 hero trust line)"
```

- [ ] **Step 7: Tag and push (live-write gate)**

```bash
git tag v1.0.9 && git push origin HEAD v1.0.9
curl -s https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.0.9/dist/btg.css | grep -c 'btg-card--drive'
curl -s https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.0.9/tools/cards-transform.js | grep -c 'function verify'
```

Expected: `1` and `1`. If the push is denied by auto mode: stop and ask the user to switch permission mode.

---

### Task 6: Browser dry run on all 9 live posts (no writes)

**Files:** none (runs in the signed-in Chrome tab).

**Interfaces:**
- Consumes: `BTGCards.transform`, `BTGCards.verify` from jsDelivr `@v1.0.9`.
- Produces: `window.__cards.run(ids, write)` used by Tasks 7–8.

- [ ] **Step 1: Load the tool and define the runner** (open a light admin page, e.g. `/wp-admin/profile.php`)

```js
await new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.0.9/tools/cards-transform.js'; s.onload = ok; s.onerror = bad; document.head.append(s); });
const n = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce').then((r) => r.text());
const H = { 'X-WP-Nonce': n, 'Content-Type': 'application/json' };
const get = (id) => fetch(`/wp-json/wp/v2/posts/${id}?context=edit&_fields=content`, { headers: H }).then((r) => r.json()).then((p) => p.content.raw);
window.__cards = { run: async (ids, write) => {
  const out = [];
  for (const id of ids) {
    try {
      const before = await get(id);
      const after = BTGCards.transform(before);
      const probs = BTGCards.verify(before, after);
      if (probs.length) { out.push(`${id} FAIL ${probs.join('; ')}`); continue; }
      if (!write) { out.push(`${id} OK (dry run) ${before.length} -> ${after.length}`); continue; }
      if ((await get(id)) !== before) { out.push(`${id} ABORT: post changed since read`); continue; }
      const r = await fetch(`/wp-json/wp/v2/posts/${id}?context=edit&_fields=content`, { method: 'POST', headers: H, body: JSON.stringify({ content: after }) });
      const saved = r.ok ? (await r.json()).content.raw : '';
      out.push(`${id} HTTP ${r.status} saved=${saved === after}`);
    } catch (e) { out.push(`${id} ERROR ${e.message}`); }
  }
  return out.join('\n');
} };
await window.__cards.run([28867, 28872, 28873, 28874, 28875, 28876, 28877, 28878, 28879], false)
```

Expected: 9 lines `OK (dry run)`. Any `FAIL`/`ERROR`: the live raw differs from the Task 1 snapshot — re-run Task 1, add the case as a fixture test, fix, re-tag as v1.0.10 (never move a tag).

---

### Task 7: Save Chester only, then verify the live page

**Files:** none.

- [ ] **Step 1: Save Chester (live-write gate)**

```js
await window.__cards.run([28873], true)
```

Expected: `28873 HTTP 200 saved=true`.

- [ ] **Step 2: Bump Chester's loader to v1.0.9**

```js
const n = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce').then((r) => r.text());
const H = { 'X-WP-Nonce': n, 'Content-Type': 'application/json' };
const b = (await fetch('/wp-json/wp/v2/posts/28873?context=edit&_fields=content', { headers: H }).then((r) => r.json())).content.raw;
const a = b.replace(/bob-the-tech-guy-site@v1\.0\.\d+\//g, 'bob-the-tech-guy-site@v1.0.9/');
const r = await fetch('/wp-json/wp/v2/posts/28873?context=edit&_fields=content', { method: 'POST', headers: H, body: JSON.stringify({ content: a }) });
`HTTP ${r.status} v109=${((await r.json()).content.raw.match(/@v1\.0\.9\//g) || []).length}`
```

Expected: `HTTP 200 v109=2`.

- [ ] **Step 3: Check the public HTML for wpautop damage**

```bash
curl -sk "https://bobthetechguy.com/pc-repair-service-chester-virginia/?v=$RANDOM" | tr '\n' ' ' > /tmp/chester-live.html
node -e "
const h=require('fs').readFileSync('/tmp/chester-live.html','utf8');
const g=h.split('class=\"btg-cards\"')[1].split('class=\"btg-cards-cta\"')[0];
console.log('cards',(g.match(/<article class=\"btg-card /g)||[]).length,'details',(g.match(/<details>/g)||[]).length,'stray <br>',(g.match(/<br\s*\/?>/g)||[]).length,'empty <p>',(g.match(/<p>\s*<\/p>/g)||[]).length,'p-wrapped article',(g.match(/<p>\s*<article/g)||[]).length);"
```

Expected: `cards 6 details 6 stray <br> 0 empty <p> 0 p-wrapped article 0`. Anything else: roll back Chester from `backups/2026-09-25/28873.html` (POST it as content), debug with superpowers:systematic-debugging, and do not continue to Task 8.

- [ ] **Step 4: Visual check** — headless Edge screenshots of the live Chester page at 1440 and 500 widths; compare with the approved mockup. Send both to the user and wait for an OK before Task 8.

---

### Task 8: Save the other 8 posts and bump all loaders

**Files:** none.

- [ ] **Step 1: Save the remaining 8 (live-write gate)**

```js
await window.__cards.run([28867, 28872, 28874, 28875, 28876, 28877, 28878, 28879], true)
```

Expected: 8 lines `HTTP 200 saved=true`.

- [ ] **Step 2: Bump all 15 loaders to v1.0.9**

```js
const n = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce').then((r) => r.text());
const H = { 'X-WP-Nonce': n, 'Content-Type': 'application/json' };
const items = [['pages', [12166, 11802, 11653, 11649, 2, 2318]], ['posts', [28867, 28872, 28873, 28874, 28875, 28876, 28877, 28878, 28879]]];
const out = [];
for (const [type, ids] of items) for (const id of ids) {
  const b = (await fetch(`/wp-json/wp/v2/${type}/${id}?context=edit&_fields=content`, { headers: H }).then((r) => r.json())).content.raw;
  const a = b.replace(/bob-the-tech-guy-site@v1\.0\.\d+\//g, 'bob-the-tech-guy-site@v1.0.9/');
  if (a === b) { out.push(`${id} already v1.0.9`); continue; }
  const r = await fetch(`/wp-json/wp/v2/${type}/${id}?context=edit&_fields=content`, { method: 'POST', headers: H, body: JSON.stringify({ content: a }) });
  out.push(`${id} HTTP ${r.status} v109=${((await r.json()).content.raw.match(/@v1\.0\.9\//g) || []).length}`);
}
out.join('\n')
```

Expected: 15 lines, each `HTTP 200 v109=2` or `already v1.0.9`.

- [ ] **Step 3: Verify every page publicly**

```bash
for u in / /about/ /services-2/ /contact-2/ /gallery/ /reviews/ /best-computer-repair-chesterfield-va/ /pc-repair-service-bon-air-virginia/ /pc-repair-service-brandermill-virginia/ /pc-repair-service-chester-virginia/ /pc-repair-service-colonial-heights-virginia/ /pc-repair-service-midlothian-virginia/ /pc-repair-service-moseley-virginia/ /pc-repair-service-richmond-virginia/ /pc-repair-service-woodlake-virginia/; do
  h=$(curl -sk "https://bobthetechguy.com$u?v=$RANDOM" | tr '\n' ' ')
  printf "%-46s %s cards=%s\n" "$u" "$(echo "$h" | grep -o 'site@v[0-9.]*' | sort -u | tr '\n' ' ')" "$(echo "$h" | grep -o '<article class="btg-card ' | wc -l)"
done
```

Expected: all 15 on `site@v1.0.9`; the 9 town pages `cards=6`, the 6 main pages `cards=0`.

- [ ] **Step 4: Update memory** — in `C:\Users\there\.claude\projects\C--Users-there-doomscroll-tycoon\memory\bob-website-client.md`, note v1.0.9 live (cards on 9 town posts), the `tools/cards-transform.js` runner, and `backups/2026-09-25/`.

- [ ] **Step 5: Commit and push repo state**

```bash
git push origin HEAD
```

---

### Task 9: Follow-up sweep of the remaining pages (read-only)

**Files:**
- Create: `docs/superpowers/reports/2026-09-25-walls-of-text-sweep.md`

- [ ] **Step 1: Measure every nav page** — for Home, About, Reviews, Testimonials, Contact, Gallery, Services and all 14 Services subpages: word count, number of blocks over 60 words, whether the page has the redesign hero, and the text of each wall's first 8 words (same method as the 2026-09-25 measurement).

- [ ] **Step 2: Write the report** — a table sorted by walls (desc), then per page a one-line recommendation: `cards` (several subtopics, like Networking), `checklist grid` (single topic with a long list), `leave as is` (story or under 150 words), plus a note where the page first needs the redesign hero.

- [ ] **Step 3: Commit and share**

```bash
git add docs/superpowers/reports
git commit -m "Walls-of-text sweep report for remaining pages"
```

Share the table with the user and ask which pages to take into the next brainstorm.
