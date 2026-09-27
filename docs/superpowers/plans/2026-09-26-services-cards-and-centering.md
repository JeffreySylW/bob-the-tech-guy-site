# Services Cards, Centering & Title-Line Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Card the walls of text on 6 Services pages, give them the dark hero, center every menu page, and remove the Avada title separator lines — without changing any existing words beyond the approved additions.

**Architecture:** A new `tools/service-cards.js` (UMD, reuses `text`/`splitFirstSentence` from `tools/cards-transform.js`) parses the Services pages' *classic* raw content — bare paragraphs separated by blank lines, block headings, a trailing `<style>/* btg-styles */` block — and rebuilds each page from a per-page recipe in `tools/service-recipes.js`. `verifyService()` enforces sentence-level conservation. Sitewide CSS (centering, title lines, adaptive grid, checklist, CTA block, new icons) ships in bundle v1.1.0; the town-page transform is left as is (its behaviour is already live and tested).

**Tech Stack:** ES5-compatible JS (UMD), `node:test`, CSS, WordPress REST API from the signed-in Chrome tab, jsDelivr tags, headless Edge.

**Spec:** `docs/superpowers/specs/2026-09-26-services-cards-and-centering-design.md`

## Global Constraints

- Allowed new or changed words: the approved hero copy, the approved card headings, "Read more", and the two corrected service names in the calls to action. Nothing else.
- Hero copy (verbatim): see Task 4's `service-recipes.js` — it is the spec's approved table.
- Card headings (verbatim): Internet & Broadband, Home Networking, Wireless Networking; Today's Threats, Virus & Malware Removal; Why Back Up, Cloud-Based Backup; Hardware Repair & Upgrades; Email Setup; Parental Controls.
- CTA fixes: Networking "Email Setup Services" → "Networking Services"; Hardware Repair & Upgrades "Email Setup Services" → "Hardware Repair & Upgrades Services".
- The trailing `<style>/* btg-styles */…</style>` block of every page stays byte-identical.
- The (862) 210-5656 number stays.
- No street address anywhere. Brand green; `--btg-*` tokens. No analytics.
- Bundle-loading pages after this phase: 30 (15 existing + 6 carded + 9 loader-only: Computer Set Up 11806, Data Recovery Service 11869, Hardware Install 11973, Memory Install 11978, Operating System Install 11861, Printer Solutions 11859, Screen Replacement 11853, Software Installation and Configuration 11855, Testimonials 3754).
- Every live write (tag push, WordPress POST) needs the session out of auto mode; if a write is denied, stop and ask.
- Test command (Windows needs explicit files): `node --test test/cards-transform.test.js test/service-cards.test.js test/v1.0.6.test.js test/v1.0.7.test.js test/v1.0.9.test.js test/v1.1.0.test.js`

## Review Focus

- **WordPress auto-formatting on classic pages that now contain explicit `<p>`, `<ul>` and `<div>` markup** — visitors expect clean cards and lists; Task 8 checks the first saved page's public HTML for stray `<br />`/empty `<p>` before any other page.
- **A first sentence ending in a closing quote** (Networking: `…DSL or “Cable.” While cable…`) — the summary should be exactly that sentence; Task 2 tests it.
- **A sentence moved into the wrong card or reordered** — the page should read in the original order; Task 5's card-membership check tests it.
- **A page edited between read and save** — that edit must not be overwritten; the runner in Task 7 re-reads before each POST and aborts that page.
- **A menu page whose sidebar actually has a widget** — centering must not hide it; Task 1 checks every in-scope page's sidebar publicly and stops if any is non-empty.

---

## File Structure

| File | Responsibility |
|---|---|
| `backups/2026-09-26/<id>.html` ×30 + `index.json` (already written from the approved download) | Rollback copies; `index.json` maps id → type/slug |
| `test/fixtures/<id>.html` ×6 (11981, 11804, 11863, 11976, 11971, 11857) | Test inputs |
| `tools/cards-transform.js` (modify) | `splitFirstSentence` handles closing quotes and `&nbsp;` |
| `tools/service-cards.js` (create) | `chunks`, `itemHtml`, `addLoader`, `transformService`, `verifyService` |
| `tools/service-recipes.js` (create) | The 6 approved recipes, keyed by page id |
| `test/service-cards.test.js` (create) | Tests for the above |
| `dist/btg.css`, `dist/btg.js` (modify) | v1.1.0 rules; remove `centerHeroOnPage` |
| `test/v1.0.9.test.js` (modify), `test/v1.1.0.test.js` (create) | CSS assertions |

---

### Task 1: Commit the snapshot, fixtures, and check sidebars

**Files:**
- Create: `test/fixtures/{11981,11804,11863,11976,11971,11857}.html`
- Commit: `backups/2026-09-26/*`

- [ ] **Step 1: Copy fixtures**

```bash
cd /c/Users/there/Projects/bob-the-tech-guy-site
for id in 11981 11804 11863 11976 11971 11857; do cp backups/2026-09-26/$id.html test/fixtures/$id.html; done
ls backups/2026-09-26/*.html | wc -l
```

Expected: `30`.

- [ ] **Step 2: Check every in-scope page's sidebar is empty (read-only)**

```bash
for s in / about/ services-2/ contact-2/ gallery/ reviews/ testimonials/ networking/ anti-virus/ backup-solutions/ hardware-repair-upgrades/ email-setup/ parental-controls/ computer-set-up/ data-recovery-service/ hardware-install/ memory-install/ operating-system-install/ printer-solutions/ screen-replacement/ software-installation-and-configuration/ best-computer-repair-chesterfield-va/; do
  curl -sk "https://bobthetechguy.com/$s?v=$RANDOM" | tr '\n' ' ' > "$TEMP/sb.html"
  node -e "const h=require('fs').readFileSync(process.env.TEMP+'/sb.html','utf8');const m=h.split('<div id=\"sidebar\"')[1];if(!m){console.log('$s no-sidebar');process.exit()}const inner=m.split('</div>')[0];const t=inner.replace(/<[^>]*>/g,'').replace(/&nbsp;|\s/g,'');const w=(inner.match(/<(iframe|img|a|form|ul)\b/g)||[]).length;console.log('$s',t.length||w?'NON-EMPTY '+t.slice(0,60)+' tags='+w:'empty')"
done
```

Expected: every line `empty` or `no-sidebar`. Any `NON-EMPTY`: stop and ask the user whether that widget should stay (centering would hide it).

- [ ] **Step 3: Commit**

```bash
git add backups/2026-09-26 test/fixtures
git commit -m "Snapshot 30 pages' raw HTML (backups) + 6 Services fixtures"
```

---

### Task 2: First-sentence split handles closing quotes and `&nbsp;`

**Files:**
- Modify: `tools/cards-transform.js` (`splitFirstSentence`)
- Test: `test/cards-transform.test.js`

**Interfaces:**
- Produces: `BTGCards.splitFirstSentence(pHtml)` — same signature; now cuts after `.`/`!`/`?` followed by optional closers (`" ' ” ’ )`, `&#8221;`, `&rdquo;`, `&#8217;`, `&rsquo;`) and then whitespace, `&nbsp;`, or end; the rest drops leading `&nbsp;`/whitespace.

- [ ] **Step 1: Write the failing tests** (append to `test/cards-transform.test.js`)

```js
test('splitFirstSentence() cuts after a closing curly quote', () => {
  const r = C.splitFirstSentence('<p>It is DSL or \u201CCable.\u201D While cable is faster.</p>');
  assert.strictEqual(r.sentence, 'It is DSL or \u201CCable.\u201D');
  assert.strictEqual(r.restHtml, '<p>While cable is faster.</p>');
});

test('splitFirstSentence() treats &nbsp; after the period as a break', () => {
  const r = C.splitFirstSentence('<p>First one.&nbsp;Second one.</p>');
  assert.strictEqual(r.sentence, 'First one.');
  assert.strictEqual(r.restHtml, '<p>Second one.</p>');
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/cards-transform.test.js`
Expected: 2 failures (the curly-quote case returns both sentences; the `&nbsp;` case returns the whole paragraph).

- [ ] **Step 3: Implement** — in `splitFirstSentence`, replace the loop and the `rest` line:

```js
    for (var i = 0; i < inner.length; i++) {
      var ch = inner[i];
      if (ch === '<') inTag = true;
      else if (ch === '>') inTag = false;
      else if (!inTag && /[.!?]/.test(ch)) {
        var j = i + 1, close;
        while (j < inner.length && (close = /^(["'\u201D\u2019)]|&#8221;|&rdquo;|&#8217;|&rsquo;)/.exec(inner.slice(j)))) j += close[0].length;
        if (j === inner.length || /\s/.test(inner[j]) || inner.slice(j, j + 6) === '&nbsp;') { cut = j; break; }
      }
    }
```

and

```js
    var rest = inner.slice(cut).replace(/^(\s|&nbsp;)+/, '').trim();
```

- [ ] **Step 4: Run all town tests**

Run: `node --test test/cards-transform.test.js`
Expected: PASS, 26 tests. Then re-run the town dry run to prove live town output would be unchanged:

```bash
node -e "
const C=require('./tools/cards-transform.js'),fs=require('fs');
for (const f of fs.readdirSync('backups/2026-09-25')) { const b=fs.readFileSync('backups/2026-09-25/'+f,'utf8'); console.log(f, C.verify(b,C.transform(b)).length?'FAIL':'OK'); }"
```

Expected: 9 × `OK`.

- [ ] **Step 5: Commit**

```bash
git add tools/cards-transform.js test/cards-transform.test.js
git commit -m "splitFirstSentence: cut after closing quotes and &nbsp;"
```

---

### Task 3: Classic-content parser, list items, loader

**Files:**
- Create: `tools/service-cards.js`
- Test: `test/service-cards.test.js`

**Interfaces:**
- Consumes: `BTGCards.text`, `BTGCards.splitFirstSentence`.
- Produces: `BTGServiceCards.chunks(html) → { blocks: Array<{kind:'p'|'block', tag?, html, text}>, tail: string }`; `BTGServiceCards.itemHtml(pHtml) → string` (list-item inner HTML with `<strong>` and leading `✓`/`•`/`*` glyph removed); `BTGServiceCards.addLoader(html, version) → string`.

- [ ] **Step 1: Write the failing tests**

```js
// test/service-cards.test.js — run: node --test test/service-cards.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../tools/service-cards.js');
const fx = (id) => fs.readFileSync(path.join(__dirname, 'fixtures', id + '.html'), 'utf8');

test('chunks() splits classic content into paragraphs and block headings, keeping the style tail', () => {
  const c = S.chunks(fx('11857'));
  assert.ok(c.tail.startsWith('<style>/* btg-styles */'));
  assert.ok(c.tail.endsWith('</style>'));
  const kinds = c.blocks.map((b) => b.kind + (b.tag ? ':' + b.tag : ''));
  assert.deepStrictEqual(kinds.slice(0, 2), ['p', 'block:h2']);
  assert.ok(c.blocks.some((b) => b.kind === 'block' && b.tag === 'h3' && /Have any questions\?/.test(b.text)));
});

test('chunks() rebuilt from blocks covers the whole input', () => {
  for (const id of ['11981', '11804', '11863', '11976', '11971', '11857']) {
    const html = fx(id);
    const c = S.chunks(html);
    assert.strictEqual(c.blocks.map((b) => b.html).join('').replace(/\s/g, '') + c.tail.replace(/\s/g, ''), html.replace(/\s/g, ''));
  }
});

test('chunks() refuses a paragraph containing a single newline', () => {
  assert.throws(() => S.chunks('one line\nsecond line\n\n<style>/* btg-styles */</style>'), /single newline/);
});

test('itemHtml() drops strong wrappers and bullet glyphs, keeps words', () => {
  assert.strictEqual(S.itemHtml('<strong>* Update router firmware (if needed)</strong>'), 'Update router firmware (if needed)');
  assert.strictEqual(S.itemHtml('<strong>\u2022 Repairing issues and blue&nbsp;</strong><strong>screens.</strong>'), 'Repairing issues and blue&nbsp;screens.');
  assert.strictEqual(S.itemHtml('<strong><span style="color:#54aa47" aria-hidden="true">&#10003;</span> Wireless networking setup</strong>'), 'Wireless networking setup');
});

test('addLoader() appends the loader once', () => {
  const out = S.addLoader('<p>x</p>', 'v1.1.0');
  assert.match(out, /<!-- btg-loader v1 -->\n<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v1\.1\.0\/dist\/btg\.css">\n<script src="https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v1\.1\.0\/dist\/btg\.js"><\/script>$/);
  assert.ok(out.startsWith('<p>x</p>'));
  assert.throws(() => S.addLoader(out, 'v1.1.0'), /already has a loader/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/service-cards.test.js`
Expected: FAIL — `Cannot find module '../tools/service-cards.js'`.

- [ ] **Step 3: Implement**

```js
// tools/service-cards.js
// Rebuilds a classic-content Services page (bare paragraphs, block headings,
// trailing <style>/* btg-styles */ block) into hero + summary cards +
// checklist + CTA block, from a recipe in tools/service-recipes.js.
// Spec: docs/superpowers/specs/2026-09-26-services-cards-and-centering-design.md
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards-transform.js'));
  else root.BTGServiceCards = factory(root.BTGCards);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  var CDN = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@';
  var BLOCK = /<(h[1-6]|ul|ol|section|div|blockquote|table)\b[^>]*>[\s\S]*?<\/\1\s*>/g;

  // WordPress turns blank-line-separated text into paragraphs on render;
  // this mirrors that split. The trailing style block (and anything after
  // it) is the tail and is never touched.
  function chunks(html) {
    var at = html.search(/<style>\/\* btg-styles \*\/|<!-- btg-loader/);
    var head = at < 0 ? html : html.slice(0, at);
    var tail = at < 0 ? '' : html.slice(at);
    var blocks = [], last = 0, m;
    function pushText(t) {
      t.split(/\n\s*\n/).forEach(function (p) {
        p = p.trim();
        if (!p) return;
        if (/\n/.test(p)) throw new Error('Paragraph contains a single newline (would render as <br>): ' + p.slice(0, 60));
        blocks.push({ kind: 'p', html: p, text: C.text(p) });
      });
    }
    BLOCK.lastIndex = 0;
    while ((m = BLOCK.exec(head))) {
      pushText(head.slice(last, m.index));
      blocks.push({ kind: 'block', tag: m[1].toLowerCase(), html: m[0], text: C.text(m[0]) });
      last = BLOCK.lastIndex;
    }
    pushText(head.slice(last));
    return { blocks: blocks, tail: tail };
  }

  var GLYPH = /^\s*(?:<span[^>]*>\s*&#10003;\s*<\/span>|\u2022|&bull;|\*)\s*/;

  function itemHtml(pHtml) {
    return pHtml.replace(/<\/?strong>/g, '').replace(GLYPH, '').trim();
  }

  function addLoader(html, version) {
    if (/btg-loader|bob-the-tech-guy-site@/.test(html)) throw new Error('Page already has a loader');
    return html + '\n<!-- btg-loader v1 -->\n' +
      '<link rel="stylesheet" href="' + CDN + version + '/dist/btg.css">\n' +
      '<script src="' + CDN + version + '/dist/btg.js"></script>';
  }

  return { chunks: chunks, itemHtml: itemHtml, addLoader: addLoader };
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/service-cards.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add tools/service-cards.js test/service-cards.test.js
git commit -m "Add service-cards parser for classic content, list items, loader"
```

---

### Task 4: Recipes and `transformService()`

**Files:**
- Create: `tools/service-recipes.js`
- Modify: `tools/service-cards.js` (add `transformService`, export it)
- Test: `test/service-cards.test.js`

**Interfaces:**
- Consumes: `chunks`, `itemHtml`, `BTGCards.splitFirstSentence`.
- Produces: `BTGServiceRecipes` (object keyed by page id; recipe shape `{ slug, hero:{eyebrow,title,lede}, keepBefore?:[headingText], topChecklist?:[anchor], cards:[{title, icon, anchors:[anchor]}], listHeading?:headingText, merge?:[anchor], after?:[anchor], removeSubheads?:[exactText], ctaFix?:[from,to] }`); `BTGServiceCards.transformService(html, recipe) → html` (throws on missing/duplicate anchors, unmapped content, or already transformed).

- [ ] **Step 1: Write the recipes file**

```js
// tools/service-recipes.js — approved content for the 6 carded Services pages.
// Hero copy, card titles and CTA fixes are the ONLY new words allowed
// (spec: 2026-09-26-services-cards-and-centering-design.md).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BTGServiceRecipes = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    11981: {
      slug: 'networking',
      hero: { eyebrow: 'Services &middot; Networking', title: 'Home and office networks, <strong>done right</strong>.', lede: 'Home and small business Wi-Fi and wired networks.' },
      topChecklist: ['Multiplatform network setup', 'Wireless networking setup', 'Home and Office Network Setup'],
      cards: [
        { title: 'Internet &amp; Broadband', icon: 'globe', anchors: ['For millions of residences'] },
        { title: 'Home Networking', icon: 'network', anchors: ['There are multiple ways in which your residence'] },
        { title: 'Wireless Networking', icon: 'wifi', anchors: ['There has been a dramatic shift'] }
      ],
      removeSubheads: ['Home Networking', 'Wireless Networking'],
      listHeading: 'Networking Services Include:',
      merge: ['secure your broadband signal from use by others'],
      ctaFix: ['Email Setup Services', 'Networking Services']
    },
    11804: {
      slug: 'anti-virus',
      hero: { eyebrow: 'Services &middot; Virus Removal', title: 'Viruses and malware, <strong>found and eliminated</strong>.', lede: 'Viruses, spyware and malware found and eliminated for good.' },
      cards: [
        { title: 'Today&#8217;s Threats', icon: 'alert', anchors: ['As computers and computer software'] },
        { title: 'Virus &amp; Malware Removal', icon: 'shield', anchors: ['fights viruses and malware'] }
      ],
      listHeading: 'Anti-Virus Services Include:'
    },
    11863: {
      slug: 'backup-solutions',
      hero: { eyebrow: 'Services &middot; Backup', title: 'On-site and <strong>cloud-based backup</strong>.', lede: 'Automated backup, so losing a device doesn&#8217;t mean losing your data.' },
      keepBefore: ['Automated On-Site and Cloud-based Backup'],
      cards: [
        { title: 'Why Back Up', icon: 'drive', anchors: ['as bad as losing your wallet'] },
        { title: 'Cloud-Based Backup', icon: 'cloud', anchors: ['Cloud-based backup uses an Internet connection'] }
      ],
      listHeading: 'Backup Solutions Services Include:',
      after: ['Also, keep your data secure']
    },
    11976: {
      slug: 'hardware-repair-upgrades',
      hero: { eyebrow: 'Services &middot; Hardware', title: 'Hardware repair <strong>and upgrades</strong>.', lede: 'Diagnostics, tune-ups and fixes that make your computer run like new.' },
      cards: [{ title: 'Hardware Repair &amp; Upgrades', icon: 'gauge', anchors: ['Big Box Stores'] }],
      ctaFix: ['Email Setup Services', 'Hardware Repair &amp; Upgrades Services']
    },
    11971: {
      slug: 'email-setup',
      hero: { eyebrow: 'Services &middot; Email', title: 'Email setup, <strong>done right</strong>.', lede: 'Email accounts and software, set up and working.' },
      cards: [{ title: 'Email Setup', icon: 'mail', anchors: ['There are multiple ways in which your residence'] }],
      listHeading: 'Email Setup Services Include:'
    },
    11857: {
      slug: 'parental-controls',
      hero: { eyebrow: 'Services &middot; Parental Controls', title: 'Parental controls <strong>for your family</strong>.', lede: 'Control the content your children can reach online.' },
      cards: [{ title: 'Parental Controls', icon: 'lock', anchors: ['concerned about the content your children'] }],
      listHeading: 'Parental Controls Services Include:'
    }
  };
});
```

- [ ] **Step 2: Write the failing tests** (append to `test/service-cards.test.js`)

```js
const R = require('../tools/service-recipes.js');
const C = require('../tools/cards-transform.js');
const IDS = ['11981', '11804', '11863', '11976', '11971', '11857'];
const titles = (out) => [...out.matchAll(/<h3 class="btg-card-title">([^<]*)<\/h3>/g)].map((m) => m[1]);

test('transformService() builds the approved cards on every page', () => {
  const expected = {
    11981: ['Internet &amp; Broadband', 'Home Networking', 'Wireless Networking'],
    11804: ['Today&#8217;s Threats', 'Virus &amp; Malware Removal'],
    11863: ['Why Back Up', 'Cloud-Based Backup'],
    11976: ['Hardware Repair &amp; Upgrades'],
    11971: ['Email Setup'],
    11857: ['Parental Controls']
  };
  for (const id of IDS) assert.deepStrictEqual(titles(S.transformService(fx(id), R[id])), expected[id], id);
});

test('transformService() puts the hero first and keeps the style tail byte-identical', () => {
  for (const id of IDS) {
    const before = fx(id);
    const out = S.transformService(before, R[id]);
    assert.ok(out.startsWith('<section class="btg-hero">'), id);
    assert.match(out, /<a class="btg-hero-cta" href="tel:8448354890">844-TEKGUY-0<\/a>/);
    assert.ok(out.endsWith(S.chunks(before).tail), id);
  }
});

test('transformService() turns Networking bullets into one 9-item checklist with the wrapped item merged', () => {
  const out = S.transformService(fx('11981'), R['11981']);
  const lists = [...out.matchAll(/<ul class="btg-checklist">([\s\S]*?)<\/ul>/g)].map((m) => (m[1].match(/<li>/g) || []).length);
  assert.deepStrictEqual(lists, [3, 9]);
  assert.match(out, /<li>Enable wireless encryption on network to safeguard your personal information and secure your broadband signal from use by others<\/li>/);
  assert.doesNotMatch(out, /<li>\s*(\*|\u2022)/);
});

test('transformService() fixes only the mislabeled CTAs', () => {
  assert.match(S.transformService(fx('11981'), R['11981']), /Need a quote for Networking Services\?/);
  assert.match(S.transformService(fx('11976'), R['11976']), /Need a quote for Hardware Repair &amp; Upgrades Services\?/);
  assert.match(S.transformService(fx('11971'), R['11971']), /Need a quote for Email Setup Services\?/);
  for (const id of IDS) assert.match(S.transformService(fx(id), R[id]), /<div class="btg-cta-block"><h3[^>]*>Have any questions\?[\s\S]*?Call Today![\s\S]*?\(862\)210-5656[\s\S]*?<\/div>/, id);
});

test('transformService() keeps Backup\'s top heading and closing line', () => {
  const out = S.transformService(fx('11863'), R['11863']);
  assert.ok(out.indexOf('Automated On-Site and Cloud-based Backup') < out.indexOf('btg-cards'));
  assert.ok(out.indexOf('Also, keep your data secure') > out.indexOf('btg-checklist'));
});

test('transformService() refuses to run twice', () => {
  assert.throws(() => S.transformService(S.transformService(fx('11857'), R['11857']), R['11857']), /Already transformed/);
});

test('transformService() fails loudly on a missing anchor', () => {
  const html = fx('11857').replace(/If you(&#8217;|')re concerned[^\n]*/, 'Something else entirely.');
  assert.throws(() => S.transformService(html, R['11857']), /concerned about the content your children/);
});

test('transformService() fails loudly on unmapped content', () => {
  const html = fx('11857').replace('<h2', 'A surprise paragraph nobody mapped.\n\n<h2');
  assert.throws(() => S.transformService(html, R['11857']), /Unmapped content: A surprise paragraph/);
});

test('transformService() output has no blank lines inside the rebuilt body', () => {
  for (const id of IDS) {
    const out = S.transformService(fx(id), R[id]);
    const body = out.slice(out.indexOf('</section>') + 10, out.indexOf('<style>/* btg-styles */'));
    assert.doesNotMatch(body.trim(), /\n\s*\n/, id);
  }
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `node --test test/service-cards.test.js`
Expected: FAIL — `S.transformService is not a function`.

- [ ] **Step 4: Implement** (insert before `return` in `tools/service-cards.js`, and add `transformService: transformService` to the returned object)

```js
  function heroHtml(h) {
    return '<section class="btg-hero">\n' +
      '  <p class="btg-hero-eyebrow">' + h.eyebrow + '</p>\n' +
      '  <h1 class="btg-hero-title">' + h.title + '</h1>\n' +
      '  <p class="btg-hero-lede">' + h.lede + '</p>\n' +
      '  <a class="btg-hero-cta" href="tel:8448354890">844-TEKGUY-0</a>\n' +
      '</section>';
  }

  function transformService(html, r) {
    if (html.indexOf('class="btg-cards"') !== -1) throw new Error('Already transformed');
    var c = chunks(html), blocks = c.blocks, claimed = [];
    function claim(b) { if (claimed.indexOf(b) === -1) claimed.push(b); return b; }
    function one(list, what) {
      if (list.length !== 1) throw new Error((list.length ? 'Found ' + list.length + ' times' : 'Missing anchor') + ': "' + what + '"');
      return claim(list[0]);
    }
    function findP(anchor) { return one(blocks.filter(function (b) { return b.kind === 'p' && b.text.indexOf(anchor) !== -1; }), anchor); }
    function findHeading(textStart) { return one(blocks.filter(function (b) { return b.kind === 'block' && /^h[2-4]$/.test(b.tag) && b.text.indexOf(textStart) === 0; }), textStart); }
    function list(items) { return '<ul class="btg-checklist">' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>'; }

    var out = [];
    (r.keepBefore || []).forEach(function (t) { out.push(findHeading(t).html); });
    if (r.topChecklist) out.push(list(r.topChecklist.map(function (a) { return itemHtml(findP(a).html); })));

    out.push('<div class="btg-cards">' + r.cards.map(function (cd) {
      var ps = cd.anchors.map(findP).filter(function (p, i, all) { return all.indexOf(p) === i; });
      var first = C.splitFirstSentence('<p>' + ps[0].html + '</p>');
      var body = first.restHtml + ps.slice(1).map(function (p) { return '<p>' + p.html + '</p>'; }).join('');
      return '<article class="btg-card btg-card--' + cd.icon + '">' +
        '<h3 class="btg-card-title">' + cd.title + '</h3>' +
        '<p class="btg-card-summary">' + first.sentence + '</p>' +
        '<details><summary>Read more</summary>' + body + '</details></article>';
    }).join('') + '</div>');

    var cta = findHeading('Have any questions?');
    if (r.listHeading) {
      var h = findHeading(r.listHeading);
      out.push(h.html);
      var items = [];
      for (var i = blocks.indexOf(h) + 1; i < blocks.indexOf(cta); i++) {
        var b = blocks[i];
        if (b.kind !== 'p' || !b.text) continue;
        if ((r.merge || []).some(function (m) { return b.text.indexOf(m) === 0; })) {
          if (!items.length) throw new Error('Merge target has no previous item: ' + b.text.slice(0, 40));
          items[items.length - 1] += ' ' + itemHtml(claim(b).html);
        } else if (/^(\u2022|\*)/.test(b.text)) {
          items.push(itemHtml(claim(b).html));
        }
      }
      if (!items.length) throw new Error('No list items under "' + r.listHeading + '"');
      out.push(list(items));
    }
    (r.after || []).forEach(function (a) { out.push('<p>' + findP(a).html + '</p>'); });

    var ctaHtml = cta.html;
    if (r.ctaFix) {
      if (ctaHtml.indexOf(r.ctaFix[0]) === -1) throw new Error('CTA fix target not found: ' + r.ctaFix[0]);
      ctaHtml = ctaHtml.replace(r.ctaFix[0], r.ctaFix[1]);
    }
    var call = one(blocks.filter(function (b) { return b.kind === 'p' && b.text === 'Call Today!'; }), 'Call Today!');
    var phones = findP('844-TEKGUY-0 /');
    out.push('<div class="btg-cta-block">' + ctaHtml + '<p>' + call.html + '</p><p>' + phones.html + '</p></div>');

    blocks.forEach(function (b) {
      if (b.kind === 'p' && !b.text) claim(b);
      if (b.kind === 'p' && (r.removeSubheads || []).indexOf(b.text) !== -1) claim(b);
    });
    var left = blocks.filter(function (b) { return claimed.indexOf(b) === -1; });
    if (left.length) throw new Error('Unmapped content: ' + left.map(function (b) { return b.text.slice(0, 50); }).join(' | '));

    return heroHtml(r.hero) + '\n\n' + out.join('\n') + '\n\n' + c.tail;
  }
```

- [ ] **Step 5: Run to verify it passes**

Run: `node --test test/service-cards.test.js`
Expected: PASS, 14 tests. If a page throws `Unmapped content: …`: if it is spacer or subhead text the recipe replaces, add it to that recipe's `removeSubheads`; if it is body text, stop and ask the user where it belongs.

- [ ] **Step 6: Commit**

```bash
git add tools/service-recipes.js tools/service-cards.js test/service-cards.test.js
git commit -m "Add Services recipes and transformService (hero, cards, checklist, CTA block)"
```

---

### Task 5: `verifyService()` — sentence-level safety gate

**Files:**
- Modify: `tools/service-cards.js` (add `sentences`, `units`, `verifyService`; export `verifyService`)
- Test: `test/service-cards.test.js`

**Interfaces:**
- Consumes: `chunks`, `C.text`, recipes.
- Produces: `BTGServiceCards.verifyService(before, after, recipe) → string[]` (`[]` = safe).

- [ ] **Step 1: Write the failing tests** (append)

```js
test('verifyService() passes the real transform of all 6 pages', () => {
  for (const id of IDS) {
    const before = fx(id);
    assert.deepStrictEqual(S.verifyService(before, S.transformService(before, R[id]), R[id]), [], id);
  }
});

test('verifyService() catches an edited word', () => {
  const before = fx('11804');
  const after = S.transformService(before, R['11804']).replace('rootkits', 'rootkit');
  assert.ok(S.verifyService(before, after, R['11804']).length > 0);
});

test('verifyService() catches a sentence moved to another card', () => {
  const before = fx('11863');
  let after = S.transformService(before, R['11863']);
  const s = 'Losing your data!';
  assert.ok(after.includes(s));
  after = after.replace(s + ' ', '').replace('Cloud-based backup uses', s + ' Cloud-based backup uses');
  assert.ok(S.verifyService(before, after, R['11863']).some((p) => /card/i.test(p)));
});

test('verifyService() catches a dropped list item', () => {
  const before = fx('11857');
  const after = S.transformService(before, R['11857']).replace(/<li>Installation and configuration[^<]*<\/li>/, '');
  assert.ok(S.verifyService(before, after, R['11857']).length > 0);
});

test('verifyService() catches hidden text and a changed style tail', () => {
  const before = fx('11857');
  const out = S.transformService(before, R['11857']);
  assert.ok(S.verifyService(before, out.replace('<details>', '<details style="display:none">'), R['11857']).some((p) => /hidden|style/i.test(p)));
  assert.ok(S.verifyService(before, out.replace('font-size:16.5px', 'font-size:17px'), R['11857']).some((p) => /tail/i.test(p)));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/service-cards.test.js`
Expected: FAIL — `S.verifyService is not a function`.

- [ ] **Step 3: Implement** (insert before `return`; add `verifyService: verifyService` to the export)

```js
  function norm(t) { return C.text(t).replace(GLYPH, '').replace(/^[\u2713\u2022*]\s*/, '').replace(/\s+/g, ' ').trim(); }
  function sentences(t) { return t ? t.split(/(?<=[.!?]['")]*)\s+(?=\S)/) : []; }
  function bag(list) { var m = {}; list.forEach(function (s) { m[s] = (m[s] || 0) + 1; }); return m; }

  // Text units of the explicit-markup output (p, li, headings, summary).
  function outputUnits(html) {
    var head = html.slice(0, html.indexOf('<style>/* btg-styles */'));
    var re = /<(p|li|h[1-6]|summary)\b[^>]*>([\s\S]*?)<\/\1>/g, m, out = [];
    while ((m = re.exec(head))) out.push(norm(m[2]));
    return out.filter(Boolean);
  }

  function verifyService(before, after, r) {
    var problems = [];
    var c = chunks(before);
    var units = [];
    c.blocks.forEach(function (b) {
      var t = norm(b.html);
      if (!t || (r.removeSubheads || []).indexOf(t) !== -1) return;
      if (b.kind === 'p' && (r.merge || []).some(function (m) { return t.indexOf(m) === 0; })) { units[units.length - 1] += ' ' + t; return; }
      units.push(r.ctaFix ? t.replace(norm(r.ctaFix[0]), norm(r.ctaFix[1])) : t);
    });
    var added = [r.hero.eyebrow, r.hero.title, r.hero.lede].concat(r.cards.map(function (cd) { return cd.title; }))
      .concat(r.cards.map(function () { return 'Read more'; })).map(norm);
    var expect = bag([].concat.apply([], units.concat(added).map(sentences)));
    var got = bag([].concat.apply([], outputUnits(after).map(sentences)));
    Object.keys(expect).concat(Object.keys(got)).forEach(function (s) {
      var e = expect[s] || 0, g = got[s] || 0, msg = 'Sentence "' + s.slice(0, 60) + '" expected ' + e + ', found ' + g;
      if (e !== g && problems.indexOf(msg) === -1) problems.push(msg);
    });

    // Card membership and order: each card's sentences, in order, equal its anchors' paragraphs.
    var articles = after.match(/<article class="btg-card[\s\S]*?<\/article>/g) || [];
    if (articles.length !== r.cards.length) problems.push('Expected ' + r.cards.length + ' cards, found ' + articles.length);
    r.cards.forEach(function (cd, i) {
      var src = cd.anchors.map(function (a) { return c.blocks.filter(function (b) { return b.kind === 'p' && b.text.indexOf(a) !== -1; })[0]; })
        .filter(function (p, k, all) { return p && all.indexOf(p) === k; });
      var want = [].concat.apply([], src.map(function (p) { return sentences(norm(p.html)); })).join(' | ');
      var art = articles[i] || '';
      var body = art.replace(/<h3 class="btg-card-title">[\s\S]*?<\/h3>|<summary>[\s\S]*?<\/summary>/g, '');
      var have = [].concat.apply([], (body.match(/<p\b[^>]*>[\s\S]*?<\/p>/g) || []).map(function (p) { return sentences(norm(p)); })).join(' | ');
      if (want !== have) problems.push('Card "' + cd.title + '" content differs from its source paragraphs');
    });

    var grid = (after.split('class="btg-cards"')[1] || '').split('class="btg-cta-block"')[0];
    if (/\s(hidden|style)=/.test(grid)) problems.push('Hidden or styled element inside the cards');
    if (!after.endsWith(c.tail)) problems.push('Style tail changed');
    if (/\b\d{1,6}\s+(?:[A-Z][a-z]+\s+){1,3}(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pkwy|Parkway|Hwy|Highway|Tpke|Turnpike|Pike|Way|Pl|Place)\b/.test(C.text(after))) problems.push('Street-address pattern found');
    return problems;
  }
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test test/service-cards.test.js`
Expected: PASS, 19 tests. If "passes the real transform" reports a sentence mismatch, find which side normalizes differently (both sides go through `norm`/`sentences`) and fix normalization — never loosen equality.

- [ ] **Step 5: Offline dry run on all 6 backups**

```bash
node -e "
const S=require('./tools/service-cards.js'),R=require('./tools/service-recipes.js'),fs=require('fs');
for (const id of Object.keys(R)) { const b=fs.readFileSync('backups/2026-09-26/'+id+'.html','utf8'); try { const a=S.transformService(b,R[id]); const p=S.verifyService(b,a,R[id]); console.log(id,R[id].slug,p.length?'FAIL '+p.slice(0,3).join('; '):'OK'); } catch(e){ console.log(id,'ERROR',e.message); } }"
```

Expected: 6 × `OK`.

- [ ] **Step 6: Commit**

```bash
git add tools/service-cards.js test/service-cards.test.js
git commit -m "Add verifyService: sentence conservation, card membership/order, hidden text, tail, address"
```

---

### Task 6: Bundle v1.1.0 — centering, title lines, adaptive grid, checklist, CTA block, icons

**Files:**
- Modify: `dist/btg.css`, `dist/btg.js`, `test/v1.0.9.test.js`
- Create: `test/v1.1.0.test.js`

**Interfaces:**
- Produces: CSS classes `.btg-checklist`, `.btg-cta-block`, `.btg-card--{globe,alert,cloud,mail,lock}` (used by Task 4 output); removes `BTGInit.centerHeroOnPage`.

- [ ] **Step 1: Write the failing tests**

Replace the first test in `test/v1.0.9.test.js` with:

```js
test('card grid adapts to the column: min 280px, top-aligned', () => {
  assert.match(css, /\.btg-cards \{[^}]*grid-template-columns: repeat\(auto-fill, minmax\(280px, 1fr\)\);[^}]*align-items: start;/);
  assert.doesNotMatch(css, /\.btg-cards \{ grid-template-columns: repeat\(2, 1fr\); \}/);
});
```

Create `test/v1.1.0.test.js`:

```js
// test/v1.1.0.test.js — run: node --test test/v1.1.0.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const js = fs.readFileSync(path.join(__dirname, '../dist/btg.js'), 'utf8');
const R = require('../tools/service-recipes.js');

test('title separator lines hidden, words kept', () => {
  assert.match(css, /\.fusion-title \.title-sep-container \{\s*display: none !important;/);
});

test('empty sidebar hidden and content column centered', () => {
  assert.match(css, /body\.has-sidebar #sidebar \{\s*display: none !important;/);
  assert.match(css, /body\.has-sidebar #content \{[^}]*float: none !important;[^}]*margin-left: auto !important;[^}]*margin-right: auto !important;/);
});

test('runtime hero nudge removed', () => {
  assert.doesNotMatch(js, /centerHeroOnPage/);
});

test('checklist and CTA block styles exist', () => {
  assert.match(css, /\.btg-checklist \{[^}]*display: grid;[^}]*grid-template-columns: repeat\(2, 1fr\);/);
  assert.match(css, /@media \(max-width: 600px\) \{\s*\.btg-checklist \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.btg-cta-block \{[^}]*text-align: center;/);
});

test('every Services card icon has a style', () => {
  for (const r of Object.values(R)) for (const c of r.cards) assert.match(css, new RegExp('\\.btg-card--' + c.icon + '::before \\{'));
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/v1.0.9.test.js test/v1.1.0.test.js`
Expected: 6 failures (grid rule, title lines, sidebar, nudge, checklist/CTA, icons).

- [ ] **Step 3: Implement CSS** — in `dist/btg.css`: replace the `.btg-cards { … grid-template-columns: repeat(3, 1fr); … }` line and delete the two `@media` blocks that follow it, with:

```css
.btg-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); align-items: start; gap: var(--btg-space-4); margin: var(--btg-space-2) 0 var(--btg-space-5); }
```

Then append:

```css
/* 07-sitewide.css — v1.1.0 (spec 2026-09-26-services-cards-and-centering) */
.fusion-title .title-sep-container {
  display: none !important;
}
/* Avada's content+sidebar layout floats #content left of an empty
   #sidebar on every page that loads this bundle (checked 2026-09-26). */
body.has-sidebar #sidebar {
  display: none !important;
}
body.has-sidebar #content { float: none !important; margin-left: auto !important; margin-right: auto !important; }
.btg-checklist { list-style: none; margin: 0 0 var(--btg-space-5) !important; padding: 0 !important; display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px var(--btg-space-4); }
@media (max-width: 600px) {
  .btg-checklist { grid-template-columns: 1fr; }
}
.btg-checklist li { position: relative; padding-left: 22px; margin: 0 !important; color: var(--btg-text-muted); line-height: 1.55; }
.btg-checklist li::before { content: ""; position: absolute; left: 2px; top: 0.4em; width: 10px; height: 5px; border-left: 2px solid var(--btg-green); border-bottom: 2px solid var(--btg-green); transform: rotate(-45deg); }
.btg-cta-block { text-align: center; background: var(--btg-card-bg); border: 1px solid var(--btg-card-border); border-radius: var(--btg-radius-md); padding: var(--btg-space-4); margin: var(--btg-space-5) 0; }
.btg-cta-block h3 { margin: 0 0 var(--btg-space-2) !important; padding-top: 0 !important; }
.btg-cta-block h3::before { display: none !important; }
.btg-cta-block p { margin: 0 0 4px !important; }
.btg-card--globe::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='9'/%3E%3Cpath d='M3 12h18'/%3E%3Cpath d='M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18'/%3E%3C/svg%3E"); }
.btg-card--alert::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3l9 16H3z'/%3E%3Cpath d='M12 10v4'/%3E%3Cpath d='M12 17h.01'/%3E%3C/svg%3E"); }
.btg-card--cloud::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z'/%3E%3C/svg%3E"); }
.btg-card--mail::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='5' width='18' height='14' rx='2'/%3E%3Cpath d='M3 7l9 6 9-6'/%3E%3C/svg%3E"); }
.btg-card--lock::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='5' y='11' width='14' height='10' rx='2'/%3E%3Cpath d='M8 11V8a4 4 0 0 1 8 0v3'/%3E%3C/svg%3E"); }
```

- [ ] **Step 4: Implement JS** — in `dist/btg.js` delete the `centerHeroOnPage` comment block and function (the lines from `// Re-centers the hero horizontally on the true page/viewport width.` through that function's closing `}`), the `centerHeroOnPage: centerHeroOnPage,` export line, and the `window.BTGInit.centerHeroOnPage(document, window);` call.

- [ ] **Step 5: Run the full suite**

Run: `node --test test/cards-transform.test.js test/service-cards.test.js test/v1.0.6.test.js test/v1.0.7.test.js test/v1.0.9.test.js test/v1.1.0.test.js`
Expected: all pass.

- [ ] **Step 6: Offline render check** — build a local copy of the live Networking page with its content replaced by `transformService(backups/2026-09-26/11981.html)` and the new `dist/btg.css`/`btg.js` inlined (same headless-Edge recipe as the v1.0.9 check), screenshot at 1440 and 500 wide. Expected: hero, centered column, 3 cards (2 per row in the centered column, 1 on mobile), two check-mark lists, CTA block, no title lines.

- [ ] **Step 7: Commit, tag, push (live-write gate)**

```bash
git add dist test
git commit -m "v1.1.0: center content, hide title lines, adaptive card grid, checklist + CTA block, service icons; remove hero nudge"
git tag v1.1.0 && git push origin HEAD v1.1.0
for f in dist/btg.css dist/btg.js tools/service-cards.js tools/service-recipes.js tools/cards-transform.js; do curl -s -o /dev/null -w "%{http_code} $f\n" https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.1.0/$f; done
```

Expected: five `200` lines.

---

### Task 7: Browser dry run (no writes)

**Files:** none.

**Interfaces:**
- Consumes: `BTGCards`, `BTGServiceCards`, `BTGServiceRecipes` from jsDelivr `@v1.1.0`.
- Produces: `window.__svc.run(ids, write)` and `window.__svc.loaderOnly(ids, write)` used by Tasks 8–9.

- [ ] **Step 1: Load tools and define runners** (in the signed-in tab on `/wp-admin/profile.php`)

```js
for (const f of ['tools/cards-transform.js', 'tools/service-cards.js', 'tools/service-recipes.js']) {
  await new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.1.0/' + f; s.onload = ok; s.onerror = bad; document.head.append(s); });
}
const n = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce').then((r) => r.text());
const H = { 'X-WP-Nonce': n, 'Content-Type': 'application/json' };
const get = (id) => fetch(`/wp-json/wp/v2/pages/${id}?context=edit&_fields=content`, { headers: H }).then((r) => r.json()).then((p) => p.content.raw);
const save = async (id, before, after) => {
  if ((await get(id)) !== before) return `${id} ABORT: page changed since read`;
  const r = await fetch(`/wp-json/wp/v2/pages/${id}?context=edit&_fields=content`, { method: 'POST', headers: H, body: JSON.stringify({ content: after }) });
  return `${id} HTTP ${r.status} saved=${r.ok && (await r.json()).content.raw === after}`;
};
window.__svc = {
  run: async (ids, write) => { const out = []; for (const id of ids) { try {
    const before = await get(id); const t = BTGServiceCards.transformService(before, BTGServiceRecipes[id]);
    const p = BTGServiceCards.verifyService(before, t, BTGServiceRecipes[id]);
    if (p.length) { out.push(`${id} FAIL ${p.join('; ')}`); continue; }
    const after = BTGServiceCards.addLoader(t, 'v1.1.0');
    out.push(write ? await save(id, before, after) : `${id} OK (dry run)`);
  } catch (e) { out.push(`${id} ERROR ${e.message}`); } } return out.join('\n'); },
  loaderOnly: async (ids, write) => { const out = []; for (const id of ids) { try {
    const before = await get(id); const after = BTGServiceCards.addLoader(before, 'v1.1.0');
    if (!after.startsWith(before)) { out.push(`${id} FAIL content changed`); continue; }
    out.push(write ? await save(id, before, after) : `${id} OK (dry run)`);
  } catch (e) { out.push(`${id} ERROR ${e.message}`); } } return out.join('\n'); }
};
(await window.__svc.run([11981, 11804, 11863, 11976, 11971, 11857], false)) + '\n' +
(await window.__svc.loaderOnly([11806, 11869, 11973, 11978, 11861, 11859, 11853, 11855, 3754], false))
```

Expected: 15 lines, all `OK (dry run)`. Any `FAIL`/`ERROR`: the live raw differs from the snapshot — re-snapshot that page, add a fixture test, fix, re-tag as v1.1.1 (never move a tag).

---

### Task 8: Networking live, then check

**Files:** none.

- [ ] **Step 1: Save Networking (live-write gate)**

```js
await window.__svc.run([11981], true)
```

Expected: `11981 HTTP 200 saved=true`.

- [ ] **Step 2: Check the public HTML for auto-formatting damage**

```bash
curl -sk "https://bobthetechguy.com/networking/?v=$RANDOM" | tr '\n' ' ' > "$TEMP/net.html"
node -e "
const h=require('fs').readFileSync(process.env.TEMP+'/net.html','utf8');
const body=h.slice(h.indexOf('</section>',h.indexOf('class=\"btg-hero\"')),h.indexOf('btg-styles'));
console.log('cards',(body.match(/<article class=\"btg-card /g)||[]).length,'details',(body.match(/<details>/g)||[]).length,'lists',(body.match(/<ul class=\"btg-checklist\">/g)||[]).length,'li',(body.match(/<li>/g)||[]).length,'br',(body.match(/<br\s*\/?>/g)||[]).length,'emptyP',(body.match(/<p>\s*<\/p>/g)||[]).length,'pWrapped',(body.match(/<p>\s*<(article|ul|div|h[1-6])/g)||[]).length,'loader',(h.match(/site@v[0-9.]*/g)||[]).filter((v,i,a)=>a.indexOf(v)===i).join(','));"
```

Expected: `cards 3 details 3 lists 2 li 12 br 0 emptyP 0 pWrapped 0 loader site@v1.1.0`. Anything else: restore 11981 from `backups/2026-09-26/11981.html` (POST it), debug with superpowers:systematic-debugging, do not continue.

- [ ] **Step 3: Screenshots** — headless Edge of the live page at 1440 and 500 wide; confirm hero, centered column, cards, lists, CTA block, no title lines.

---

### Task 9: The rest, loaders, and verification

**Files:** none (plus memory update).

- [ ] **Step 1: Save the other 5 carded pages and the 9 loader-only pages (live-write gate)**

```js
(await window.__svc.run([11804, 11863, 11976, 11971, 11857], true)) + '\n' +
(await window.__svc.loaderOnly([11806, 11869, 11973, 11978, 11861, 11859, 11853, 11855, 3754], true))
```

Expected: 14 lines `HTTP 200 saved=true`.

- [ ] **Step 2: Bump the 15 existing loaders to v1.1.0**

```js
const n = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce').then((r) => r.text());
const H = { 'X-WP-Nonce': n, 'Content-Type': 'application/json' };
const items = [['pages', [12166, 11802, 11653, 11649, 2, 2318]], ['posts', [28867, 28872, 28873, 28874, 28875, 28876, 28877, 28878, 28879]]];
const out = [];
for (const [type, ids] of items) for (const id of ids) {
  const b = (await fetch(`/wp-json/wp/v2/${type}/${id}?context=edit&_fields=content`, { headers: H }).then((r) => r.json())).content.raw;
  const a = b.replace(/bob-the-tech-guy-site@v1\.\d+\.\d+\//g, 'bob-the-tech-guy-site@v1.1.0/');
  if (a === b) { out.push(`${id} already`); continue; }
  const r = await fetch(`/wp-json/wp/v2/${type}/${id}?context=edit&_fields=content`, { method: 'POST', headers: H, body: JSON.stringify({ content: a }) });
  out.push(`${id} ${r.status} v110=${((await r.json()).content.raw.match(/@v1\.1\.0\//g) || []).length}`);
}
out.join(' | ')
```

Expected: 15 entries, each `200 v110=2`.

- [ ] **Step 3: Verify all 30 pages publicly**

```bash
for s in / about/ services-2/ contact-2/ gallery/ reviews/ testimonials/ networking/ anti-virus/ backup-solutions/ hardware-repair-upgrades/ email-setup/ parental-controls/ computer-set-up/ data-recovery-service/ hardware-install/ memory-install/ operating-system-install/ printer-solutions/ screen-replacement/ software-installation-and-configuration/ best-computer-repair-chesterfield-va/ pc-repair-service-bon-air-virginia/ pc-repair-service-brandermill-virginia/ pc-repair-service-chester-virginia/ pc-repair-service-colonial-heights-virginia/ pc-repair-service-midlothian-virginia/ pc-repair-service-moseley-virginia/ pc-repair-service-richmond-virginia/ pc-repair-service-woodlake-virginia/; do
  h=$(curl -sk --max-time 30 "https://bobthetechguy.com/$s?v=$RANDOM$RANDOM" | tr '\n' ' ')
  printf "%-46s %s cards=%s br_in_cards=%s\n" "/$s" "$(echo "$h" | grep -o 'site@v[0-9.]*' | sort -u | tr '\n' ' ')" "$(echo "$h" | grep -o '<article class="btg-card ' | wc -l)" "$(echo "$h" | grep -o 'class="btg-cards".*</article></div>' | grep -o '<br' | wc -l)"
done
```

Expected: all 30 `site@v1.1.0`; cards = 3/2/2/1/1/1 on the six carded pages, 6 on the 9 town pages, 0 elsewhere; `br_in_cards=0` everywhere. Re-fetch any page that shows no version (transient network failure) before treating it as a failure.

- [ ] **Step 4: Centering probe** — for Home, Networking and Computer Set Up, run headless Edge with a load-time script that writes `#content`'s `getBoundingClientRect()` center minus `innerWidth/2` into the title (same probe recipe as the 2026-09-25 mobile check) at 1440 wide. Expected: |offset| ≤ 2px on all three.

- [ ] **Step 5: Memory + push**

Update `C:\Users\there\.claude\projects\C--Users-there-doomscroll-tycoon\memory\bob-website-client.md`: v1.1.0 live on 30 pages; Services cards via `tools/service-cards.js` + `tools/service-recipes.js`; backups in `backups/2026-09-26/`; For Bob: Email Setup copy, (862) number. Then `git push origin HEAD`.
