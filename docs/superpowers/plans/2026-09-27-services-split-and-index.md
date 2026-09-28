# Small Services Pages, Services Index & Homepage Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 9 small Services pages the dark hero and the "split" layout, rebuild the Services index as three grouped panels listing all 15 services, and ship the homepage reorder — without changing any of Bob's words beyond the approved additions.

**Architecture:** `tools/service-cards.js` gains `transformSplit()` (same classic-content parser as the carded pages) and `verifyService()` learns card-less recipes; 9 split recipes join `tools/service-recipes.js`. Two small new UMD modules: `tools/services-index.js` (menu parser, panel builder, verifier) and `tools/home-reorder.js` (reorder + character-conservation check). New styles ship as bundle v1.2.0. Everything runs in the signed-in WordPress tab from jsDelivr, dry run first, one page first.

**Tech Stack:** ES5-compatible JS (UMD), `node:test`, CSS, WordPress REST API from the signed-in Chrome tab, jsDelivr tags, headless Edge.

**Spec:** `docs/superpowers/specs/2026-09-27-services-split-and-index-design.md`

## Global Constraints

- Allowed new words: the 9 approved hero lines (Task 2 recipes, verbatim from the spec table), the group names "Repairs & Upgrades", "Setup & Software", "Security & Networking", and "All" on the homepage button. Nothing else. Moving text is allowed.
- Every other word, link and phone number stays exactly as it is, including Screen Replacement's in-text "862 210 5656" and the "(862)210-5656" numbers.
- The trailing `<style>/* btg-styles */…</style>` block and loader of every page stay byte-identical, except the loader version pin.
- No street address anywhere. Brand green; `--btg-*` tokens. No analytics.
- Page IDs: Computer Set Up 11806, Computer Tune Up 11867, Data Recovery Service 11869, Hardware Install 11973, Memory Install 11978, Operating System Install 11861, Printer Solutions 11859, Screen Replacement 11853, Software Installation and Configuration 11855, Services index 11653, Homepage 2318.
- Bundle pages after this phase: 31 (the 30 on v1.1.1 + Computer Tune Up).
- Every live write (tag push, WordPress POST, file download) needs the user's OK and the session out of auto mode; if a write is denied, stop and ask.
- Test command (Windows needs explicit files): `node --test test/cards-transform.test.js test/service-cards.test.js test/split.test.js test/services-index.test.js test/home-reorder.test.js test/v1.0.6.test.js test/v1.0.7.test.js test/v1.0.9.test.js test/v1.1.0.test.js test/v1.2.0.test.js`

## Review Focus

- **WordPress auto-formatting (wpautop) around the new `<div class="btg-split">` and `<section class="btg-panel">` markup** — visitors expect a clean card, not stray `<br>` or empty paragraphs; Task 8 checks Memory Install's public HTML before any other page is written, Task 9 checks the index.
- **A live page edited since the 2026-09-26 backups** — the transform must run on what is live today; Task 1 snapshots fresh raw content, the runner re-reads before each POST and aborts that page.
- **Bob adds, removes or renames a service in the menu** — the index must not silently drop or invent a link; `buildIndex()` throws on any mismatch (Task 4 test).
- **The homepage edited so an anchor is missing or appears twice** — the reorder must refuse rather than guess; `reorderHome()` throws (Task 5 test).
- **A small page with no `btg-styles` tail (Computer Tune Up has never been touched) or with a stray line inside the list** — transform and verify must still work without a tail, and must throw on a non-bullet line between bullets (Task 2 tests).

---

## File Structure

| File | Responsibility |
|---|---|
| `backups/2026-09-27/<id>.html` ×11 + `index.json` | Rollback copies from the approved download |
| `test/fixtures/<id>.html` (11806, 11867, 11869, 11973, 11978, 11861, 11859, 11853, 11855, 11653, 2318) + `test/fixtures/menu.html` | Test inputs |
| `tools/service-cards.js` (modify) | `tailStart`, `transformSplit`; `verifyService` handles split recipes |
| `tools/service-recipes.js` (modify) | + 9 split recipes |
| `tools/services-index.js` (create) | `GROUPS`, `parseServicesMenu`, `buildIndex`, `verifyIndex` |
| `tools/home-reorder.js` (create) | `reorderHome`, `verifyHome` |
| `dist/btg.css` (modify) | v1.2.0: split, include card, note, banner, panels, 7 icons |
| `test/split.test.js`, `test/services-index.test.js`, `test/home-reorder.test.js`, `test/v1.2.0.test.js` (create) | Tests |

---

### Task 1: Fresh snapshot, backups and fixtures

**Files:**
- Create: `backups/2026-09-27/*.html`, `backups/2026-09-27/index.json`, `test/fixtures/{11806,11867,11869,11973,11978,11861,11859,11853,11855,11653,2318}.html`, `test/fixtures/menu.html`

**Interfaces:**
- Produces: the fixtures every later test reads with `fx(id)`.

- [ ] **Step 1: Download the raw content (ask the user to approve the download: `btg-backup-2026-09-27.json`, ~60 KB, from bobthetechguy.com)** — run in the signed-in tab on `https://bobthetechguy.com/wp-admin/profile.php`:

```js
const n = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce').then((r) => r.text());
const H = { 'X-WP-Nonce': n };
const ids = [11806, 11867, 11869, 11973, 11978, 11861, 11859, 11853, 11855, 11653, 2318];
const out = {};
for (const id of ids) {
  const p = await fetch(`/wp-json/wp/v2/pages/${id}?context=edit&_fields=id,slug,modified,content`, { headers: H }).then((r) => r.json());
  out[id] = { slug: p.slug, modified: p.modified, raw: p.content.raw };
}
const a = document.createElement('a');
a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
a.download = 'btg-backup-2026-09-27.json';
a.click();
Object.keys(out).map((id) => id + ' ' + out[id].slug + ' ' + out[id].raw.length).join(' | ')
```

Expected: 11 entries, slugs matching the Global Constraints IDs.

- [ ] **Step 2: Split the download into backups and fixtures, and save the public menu**

```bash
cd /c/Users/there/Projects/bob-the-tech-guy-site
node -e "
const fs=require('fs');const j=JSON.parse(fs.readFileSync(process.env.USERPROFILE+'/Downloads/btg-backup-2026-09-27.json','utf8'));
fs.mkdirSync('backups/2026-09-27',{recursive:true});const idx={};
for(const [id,p] of Object.entries(j)){fs.writeFileSync('backups/2026-09-27/'+id+'.html',p.raw);fs.writeFileSync('test/fixtures/'+id+'.html',p.raw);idx[id]={slug:p.slug,modified:p.modified};}
fs.writeFileSync('backups/2026-09-27/index.json',JSON.stringify(idx,null,1));console.log(Object.keys(idx).length,'pages');"
curl -sk https://bobthetechguy.com/services-2/ | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const a=s.indexOf('<ul id=\"menu-main\"')>=0?s.indexOf('<ul id=\"menu-main\"'):s.indexOf('class=\"fusion-menu\"');const st=s.lastIndexOf('<ul',a);const e=s.indexOf('</nav>',st);require('fs').writeFileSync('test/fixtures/menu.html',s.slice(st,e));console.log('menu bytes',e-st)})"
grep -c 'computer-tune-up' test/fixtures/menu.html
```

Expected: `11 pages`; menu bytes > 2000; grep count ≥ 1.

- [ ] **Step 3: Note what differs from the 2026-09-26 backups**

```bash
for id in 11806 11869 11973 11978 11861 11859 11853 11855 11653 2318; do
  printf "%s " $id; node -e "const f=require('fs');const a=f.readFileSync('backups/2026-09-26/$id.html','utf8').replace(/<!-- btg-loader[\s\S]*/,'').trim(),b=f.readFileSync('backups/2026-09-27/$id.html','utf8').replace(/<!-- btg-loader[\s\S]*/,'').trim();console.log(a===b?'same':'CHANGED')"
done
grep -c 'btg-styles' test/fixtures/11867.html
```

Expected: all `same` (only the loader changed since). Any `CHANGED`: read the diff and tell the user before continuing. Record whether 11867 has a `btg-styles` tail (0 or 1) — Task 2 handles both.

- [ ] **Step 4: Commit**

```bash
git add backups/2026-09-27 test/fixtures
git commit -m "Snapshot 11 pages' raw HTML (backups) + fixtures and public menu"
```

---

### Task 2: `transformSplit()` and the 9 split recipes

**Files:**
- Modify: `tools/service-cards.js`, `tools/service-recipes.js`, `test/v1.1.0.test.js` (split recipes have no `cards`)
- Test: `test/split.test.js` (create)

**Interfaces:**
- Consumes: `chunks`, `itemHtml`, `heroHtml`, `C.text` (existing).
- Produces: `tailStart(html) -> number` (index of the `btg-styles`/loader tail, or `html.length`), `transformSplit(html, recipe) -> string`, and recipes `{ layout: 'split', slug, icon, hero: {eyebrow,title,lede}, listHeading }` keyed by page id. `transformSplit` output = hero + optional `<p class="btg-banner">` + `<div class="btg-split[ btg-split--stacked]"><div class="btg-split-text">…</div><div class="btg-include-card btg-card--ICON">h2 + ul.btg-checklist</div></div>` + optional `<p class="btg-note">` + `<div class="btg-cta-block">…</div>` + tail.

- [ ] **Step 1: Write the failing tests**

```js
// test/split.test.js — run: node --test test/split.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const S = require('../tools/service-cards.js');
const R = require('../tools/service-recipes.js');
const fx = (id) => fs.readFileSync(path.join(__dirname, 'fixtures', id + '.html'), 'utf8');
const SPLIT = ['11806', '11867', '11869', '11973', '11978', '11861', '11859', '11853', '11855'];
const items = (out) => (out.match(/<ul class="btg-checklist">([\s\S]*?)<\/ul>/)[1].match(/<li>/g) || []).length;

test('every split page has an approved recipe', () => {
  for (const id of SPLIT) assert.strictEqual(R[id].layout, 'split', id);
});

test('transformSplit() builds hero, split, include card and CTA block in order', () => {
  for (const id of SPLIT) {
    const out = S.transformSplit(fx(id), R[id]);
    const at = (s) => out.indexOf(s);
    assert.ok(out.startsWith('<section class="btg-hero">'), id);
    assert.ok(at('class="btg-split') > at('</section>'), id);
    assert.ok(at('class="btg-include-card btg-card--' + R[id].icon + '"') > at('class="btg-split-text"'), id);
    assert.ok(at('class="btg-cta-block"') > at('class="btg-include-card'), id);
    assert.match(out, /<div class="btg-cta-block"><h3[^>]*>Have any questions\?[\s\S]*?Call Today![\s\S]*?\(862\)210-5656[\s\S]*?<\/div>/, id);
  }
});

test('transformSplit() turns every fake bullet into a checklist item, words unchanged', () => {
  const want = { 11806: 14, 11867: 12, 11869: 6, 11973: 5, 11978: 3, 11861: 5, 11859: 4, 11853: 2, 11855: 6 };
  for (const id of SPLIT) {
    const out = S.transformSplit(fx(id), R[id]);
    assert.strictEqual(items(out), want[id], id);
    assert.doesNotMatch(out, /<li>\s*(\*|•|&bull;)/, id);
  }
  assert.match(S.transformSplit(fx('11978'), R['11978']), /<li>Verify RAM is recognized in BIOS and operating system<\/li>/);
});

test('transformSplit() stacks the two long lists only', () => {
  for (const id of SPLIT) {
    const stacked = /class="btg-split btg-split--stacked"/.test(S.transformSplit(fx(id), R[id]));
    assert.strictEqual(stacked, id === '11806' || id === '11867', id);
  }
});

test('transformSplit() keeps the Set Up banner and the Software note', () => {
  const setup = S.transformSplit(fx('11806'), R['11806']);
  assert.ok(setup.indexOf('<p class="btg-banner"><a href="https://bobthetechguy.com/wp-content/uploads/2015/12/computer_setup.png"') < setup.indexOf('class="btg-split'));
  const sw = S.transformSplit(fx('11855'), R['11855']);
  assert.match(sw, /<p class="btg-note">Bob the Tech Guy also provides hands-on software training[^<]*<\/p>/);
  assert.ok(sw.indexOf('btg-note') > sw.indexOf('btg-include-card') && sw.indexOf('btg-note') < sw.indexOf('btg-cta-block'));
});

test('transformSplit() keeps the tail byte-identical and has no blank lines inside the body', () => {
  for (const id of SPLIT) {
    const before = fx(id);
    const out = S.transformSplit(before, R[id]);
    assert.ok(out.endsWith(S.chunks(before).tail), id);
    const body = out.slice(out.indexOf('</section>') + 10, S.tailStart(out));
    assert.doesNotMatch(body.trim(), /\n\s*\n/, id);
  }
});

test('transformSplit() works on a page with no tail at all', () => {
  const noTail = fx('11978').replace(/<style>\/\* btg-styles \*\/[\s\S]*$/, '').replace(/<!-- btg-loader[\s\S]*$/, '');
  const out = S.transformSplit(noTail, R['11978']);
  assert.strictEqual(S.tailStart(noTail), noTail.length);
  assert.match(out, /<\/div>\s*$/);
});

test('transformSplit() refuses to run twice, and throws on a stray line inside the list', () => {
  assert.throws(() => S.transformSplit(S.transformSplit(fx('11978'), R['11978']), R['11978']), /Already transformed/);
  const stray = fx('11978').replace('* Verify RAM', 'A stray remark.\n\n* Verify RAM');
  assert.throws(() => S.transformSplit(stray, R['11978']), /List item after a note/);
});

test('transformSplit() throws on a missing list heading or unmapped content', () => {
  assert.throws(() => S.transformSplit(fx('11978').replace('Memory Install Services Include:', 'Something else'), R['11978']), /Memory Install Services Include:/);
  const extra = fx('11978').replace('Call Today!', 'Call Today!\n\nAn unexpected closing line.');
  assert.throws(() => S.transformSplit(extra, R['11978']), /Unmapped content: An unexpected closing line/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/split.test.js`
Expected: FAIL — `R['11806']` undefined / `S.transformSplit is not a function`.

- [ ] **Step 3: Add the 9 recipes** — in `tools/service-recipes.js`, add these entries after `11857` (inside the returned object):

```js
    // Split layout (spec 2026-09-27): hero lines are the ONLY new words.
    11806: { layout: 'split', slug: 'computer-set-up', icon: 'laptop', listHeading: 'Computer Set Up Services Include:',
      hero: { eyebrow: 'Services &middot; Setup', title: 'New computer, <strong>set up right</strong>.', lede: 'Updates, accounts, programs and connections, ready from day one.' } },
    11867: { layout: 'split', slug: 'computer-tune-up', icon: 'gauge', listHeading: 'Computer Tune Up Services include:',
      hero: { eyebrow: 'Services &middot; Tune Up', title: 'A tune-up that makes it <strong>run like new</strong>.', lede: 'Cleanup, updates and dust removal for a faster PC or Mac.' } },
    11869: { layout: 'split', slug: 'data-recovery-service', icon: 'drive', listHeading: 'Data Recovery Services Include:',
      hero: { eyebrow: 'Services &middot; Data Recovery', title: 'Lost files, <strong>brought back</strong>.', lede: 'Recovery from deleted, corrupted or failed drives.' } },
    11973: { layout: 'split', slug: 'hardware-install', icon: 'plug', listHeading: 'Hardware Install Services Include:',
      hero: { eyebrow: 'Services &middot; Hardware', title: 'New hardware, <strong>installed and tested</strong>.', lede: 'Graphics cards, drives, webcams and more, installed and working together.' } },
    11978: { layout: 'split', slug: 'memory-install', icon: 'chip', listHeading: 'Memory Install Services Include:',
      hero: { eyebrow: 'Services &middot; Memory', title: 'Memory upgrades that <strong>speed things up</strong>.', lede: 'More RAM so your computer boots, opens programs and multitasks faster.' } },
    11861: { layout: 'split', slug: 'operating-system-install', icon: 'window', listHeading: 'Operating System Install Services Include:',
      hero: { eyebrow: 'Services &middot; Operating System', title: 'Windows, Mac or Linux, <strong>installed cleanly</strong>.', lede: 'A fresh operating system, updated and tuned.' } },
    11859: { layout: 'split', slug: 'printer-solutions', icon: 'printer', listHeading: 'Printer Solutions Services Include:',
      hero: { eyebrow: 'Services &middot; Printers', title: 'Printers, <strong>back to printing</strong>.', lede: 'New printer setup, and fixes for the one that stopped working.' } },
    11853: { layout: 'split', slug: 'screen-replacement', icon: 'screen', listHeading: 'Screen Replacement Services Include:',
      hero: { eyebrow: 'Services &middot; Screen Repair', title: 'Broken laptop screen? <strong>Replaced.</strong>', lede: 'Screen replacement for PC and Mac laptops.' } },
    11855: { layout: 'split', slug: 'software-installation-and-configuration', icon: 'box', listHeading: 'Software Installation and Configuration Services Include:',
      hero: { eyebrow: 'Services &middot; Software', title: 'Your software, <strong>installed and set up</strong>.', lede: 'Programs for work and play, installed and configured the way you like.' } }
```

In `test/v1.1.0.test.js`, change `for (const c of r.cards)` to `for (const c of r.cards || [])` so the old icon test ignores split recipes.

Update the header comment's first line to `// tools/service-recipes.js — approved content for the Services pages (6 carded, 9 split).`

- [ ] **Step 4: Add `tailStart` and `transformSplit`** — in `tools/service-cards.js`:

Replace the first two lines of `chunks()`'s body:

```js
    var at = html.search(/<style>\/\* btg-styles \*\/|<!-- btg-loader/);
    var head = at < 0 ? html : html.slice(0, at);
    var tail = at < 0 ? '' : html.slice(at);
```

with

```js
    var at = tailStart(html);
    var head = html.slice(0, at);
    var tail = html.slice(at);
```

and add above `chunks`:

```js
  // Where the untouchable tail (per-page style block, then the loader) starts.
  function tailStart(html) {
    var at = html.search(/<style>\/\* btg-styles \*\/|<!-- btg-loader/);
    return at < 0 ? html.length : at;
  }
```

Add after `transformService`:

```js
  // Small Services pages: intro paragraph(s) beside a "Services Include" card.
  // Spec: docs/superpowers/specs/2026-09-27-services-split-and-index-design.md
  var LONG_LIST = 8;
  function transformSplit(html, r) {
    if (html.indexOf('class="btg-hero"') !== -1) throw new Error('Already transformed');
    var c = chunks(html), blocks = c.blocks, claimed = [];
    function claim(b) { if (claimed.indexOf(b) === -1) claimed.push(b); return b; }
    function one(list, what) {
      if (list.length !== 1) throw new Error((list.length ? 'Found ' + list.length + ' times' : 'Missing anchor') + ': "' + what + '"');
      return claim(list[0]);
    }
    function heading(start) { return one(blocks.filter(function (b) { return b.kind === 'block' && /^h[2-4]$/.test(b.tag) && b.text.indexOf(start) === 0; }), start); }

    var h = heading(r.listHeading), cta = heading('Have any questions?');
    var hi = blocks.indexOf(h), ci = blocks.indexOf(cta);
    var banner = null, intro = [], items = [], notes = [];
    blocks.slice(0, hi).forEach(function (b) {
      if (b.kind !== 'p') return;
      if (!b.text) {
        if (/<img\b/.test(b.html)) { if (banner) throw new Error('Two images before the list'); banner = claim(b); }
        else claim(b);
        return;
      }
      intro.push(claim(b));
    });
    if (!intro.length) throw new Error('No intro paragraph before "' + r.listHeading + '"');
    blocks.slice(hi + 1, ci).forEach(function (b) {
      if (b.kind !== 'p') return;
      claim(b);
      if (!b.text) return;
      if (/^(•|\*)/.test(b.text)) {
        if (notes.length) throw new Error('List item after a note: ' + b.text.slice(0, 40));
        items.push(itemHtml(b.html));
      } else notes.push(b);
    });
    if (!items.length) throw new Error('No list items under "' + r.listHeading + '"');
    var call = one(blocks.filter(function (b) { return b.kind === 'p' && b.text === 'Call Today!'; }), 'Call Today!');
    var phones = one(blocks.filter(function (b) { return b.kind === 'p' && b.text.indexOf('844-TEKGUY-0 /') !== -1; }), '844-TEKGUY-0 /');
    blocks.forEach(function (b) { if (b.kind === 'p' && !b.text && !/<img\b/.test(b.html)) claim(b); });
    var left = blocks.filter(function (b) { return claimed.indexOf(b) === -1; });
    if (left.length) throw new Error('Unmapped content: ' + left.map(function (b) { return b.text.slice(0, 50); }).join(' | '));

    var out = heroHtml(r.hero) + '\n\n';
    if (banner) out += '<p class="btg-banner">' + banner.html + '</p>\n';
    out += '<div class="btg-split' + (items.length > LONG_LIST ? ' btg-split--stacked' : '') + '">' +
      '<div class="btg-split-text">' + intro.map(function (p) { return '<p>' + p.html + '</p>'; }).join('') + '</div>' +
      '<div class="btg-include-card btg-card--' + r.icon + '">' + h.html +
      '<ul class="btg-checklist">' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div></div>\n';
    notes.forEach(function (n) { out += '<p class="btg-note">' + n.html + '</p>\n'; });
    out += '<div class="btg-cta-block">' + cta.html + '<p>' + call.html + '</p><p>' + phones.html + '</p></div>';
    return out + (c.tail ? '\n\n' + c.tail : '');
  }
```

Export them: change the return line to

```js
  return { tailStart: tailStart, chunks: chunks, itemHtml: itemHtml, addLoader: addLoader, transformService: transformService, transformSplit: transformSplit, verifyService: verifyService };
```

- [ ] **Step 5: Run the tests**

Run: `node --test test/split.test.js test/service-cards.test.js test/v1.1.0.test.js`
Expected: PASS (the old tests still pass). If an item count differs from Step 1's table, read that fixture's list — fix the parser, never the expected count, unless the fixture itself shows the count is different; then tell the user.

- [ ] **Step 6: Commit**

```bash
git add tools/service-cards.js tools/service-recipes.js test/split.test.js
git commit -m "Add transformSplit and the 9 split recipes (hero, split, include card, note, banner)"
```

---

### Task 3: `verifyService()` for split pages

**Files:**
- Modify: `tools/service-cards.js` (`outputUnits`, `verifyService`)
- Test: `test/split.test.js` (append)

**Interfaces:**
- Consumes: `transformSplit`, `tailStart` (Task 2).
- Produces: `verifyService(before, after, recipe) -> string[]` works for both carded and split recipes (`[]` = safe to save).

- [ ] **Step 1: Write the failing tests** (append to `test/split.test.js`)

```js
test('verifyService() passes the real split transform of all 9 pages', () => {
  for (const id of SPLIT) {
    const before = fx(id);
    assert.deepStrictEqual(S.verifyService(before, S.transformSplit(before, R[id]), R[id]), [], id);
  }
});

test('verifyService() on split pages catches an edited word, a dropped item and a reorder', () => {
  const before = fx('11978');
  const out = S.transformSplit(before, R['11978']);
  assert.ok(S.verifyService(before, out.replace('perk your computer up', 'speed your computer up'), R['11978']).length > 0);
  assert.ok(S.verifyService(before, out.replace(/<li>Test device for proper functionality<\/li>/, ''), R['11978']).length > 0);
  const swapped = out.replace(/(<li>Install RAM into one computer<\/li>)(<li>Verify RAM[^<]*<\/li>)/, '$2$1');
  assert.notStrictEqual(swapped, out);
  assert.ok(S.verifyService(before, swapped, R['11978']).some((p) => /order/i.test(p)));
});

test('verifyService() on split pages catches hidden text, a changed link and a changed tail', () => {
  const before = fx('11855');
  const out = S.transformSplit(before, R['11855']);
  assert.ok(S.verifyService(before, out.replace('<p class="btg-note">', '<p class="btg-note" hidden>'), R['11855']).some((p) => /hidden|style/i.test(p)));
  assert.ok(S.verifyService(before, out.replace('<div class="btg-include-card', '<div style="display:none" class="btg-include-card'), R['11855']).some((p) => /hidden|style/i.test(p)));
  assert.ok(S.verifyService(before, out.replace('tel:(862)210-5656', 'tel:5555555555'), R['11855']).some((p) => /link/i.test(p)));
  assert.ok(S.verifyService(before, out.replace('font-size:16.5px', 'font-size:17px'), R['11855']).some((p) => /tail/i.test(p)));
});

test('verifyService() on split pages allows the hero lines and nothing else new', () => {
  const before = fx('11978');
  const out = S.transformSplit(before, R['11978']).replace('</ul></div></div>', '<li>Free pickup and delivery</li></ul></div></div>');
  assert.ok(S.verifyService(before, out, R['11978']).length > 0);
});

test('verifyService() handles a page with no tail', () => {
  const noTail = fx('11978').replace(/<style>\/\* btg-styles \*\/[\s\S]*$/, '');
  assert.deepStrictEqual(S.verifyService(noTail, S.transformSplit(noTail, R['11978']), R['11978']), []);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/split.test.js`
Expected: FAIL — `r.cards` is undefined (TypeError) in `verifyService`.

- [ ] **Step 3: Implement** — in `tools/service-cards.js`:

In `outputUnits(html)` replace

```js
    var at = html.indexOf('<style>/* btg-styles */');
    if (at < 0) throw new Error('No btg-styles tail in output');
    var head = html.slice(0, at);
```

with

```js
    var head = html.slice(0, tailStart(html));
```

At the top of `verifyService` add `var cards = r.cards || [];` and replace every `r.cards` inside `verifyService` with `cards` (four places: `added`, the article-count check, the membership loop, the titles check).

Replace the hidden-element check

```js
    var grid = (after.split('class="btg-cards"')[1] || '').split('class="btg-cta-block"')[0];
    if (/\s(hidden|style|aria-hidden|open)(=|>|\s)|screen-reader-text/.test(grid)) problems.push('Hidden or styled element inside the cards');
```

with

```js
    var built = [(after.split('class="btg-cards"')[1] || ''), (after.split('class="btg-split')[1] || '')]
      .map(function (s) { return s.split('class="btg-cta-block"')[0]; }).join('');
    if (/\s(hidden|style|aria-hidden|open)(=|>|\s)|screen-reader-text/.test(built.replace(/^[^>]*>/, ''))) problems.push('Hidden or styled element inside the cards');
```

(The `replace(/^[^>]*>/, '')` drops the rest of the opening tag the split landed in, e.g. `" btg-split--stacked">`.)

Replace the stray-text check's slice

```js
    var stray = C.text(after.slice(0, after.indexOf('<style>/* btg-styles */'))
```

with

```js
    var stray = C.text(after.slice(0, tailStart(after))
```

- [ ] **Step 4: Run all tool tests**

Run: `node --test test/split.test.js test/service-cards.test.js test/cards-transform.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/service-cards.js test/split.test.js
git commit -m "verifyService: support split recipes and pages without a tail"
```

---

### Task 4: Services index panels

**Files:**
- Create: `tools/services-index.js`
- Test: `test/services-index.test.js`

**Interfaces:**
- Consumes: `test/fixtures/menu.html`, `test/fixtures/11653.html`; `BTGCards.text` for text comparison.
- Produces: `GROUPS` (array of `{ name, items: [[slug, icon], …] }`), `parseServicesMenu(publicHtml) -> [{ slug, url, title }]`, `buildIndex(raw, menu) -> string`, `verifyIndex(before, after, menu) -> string[]`. Browser global: `BTGServicesIndex`.

- [ ] **Step 1: Write the failing tests**

```js
// test/services-index.test.js — run: node --test test/services-index.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const I = require('../tools/services-index.js');
const fx = (f) => fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8');
const menu = I.parseServicesMenu(fx('menu.html'));

test('parseServicesMenu() reads the 15 Services submenu pages', () => {
  assert.strictEqual(menu.length, 15);
  assert.deepStrictEqual(menu[0], { slug: 'networking', url: 'https://bobthetechguy.com/networking/', title: 'Networking' });
  assert.ok(menu.some((m) => m.slug === 'computer-tune-up'));
  assert.ok(menu.some((m) => m.slug === 'hardware-repair-upgrades' && m.title === 'Hardware Repair &amp; Upgrades'));
});

test('GROUPS cover exactly the menu pages, 6 + 5 + 4', () => {
  assert.deepStrictEqual(I.GROUPS.map((g) => g.items.length), [6, 5, 4]);
  assert.deepStrictEqual(I.GROUPS.flatMap((g) => g.items.map((i) => i[0])).sort(), menu.map((m) => m.slug).sort());
});

test('buildIndex() replaces the 10 h1 links with three panels of 15 links', () => {
  const out = I.buildIndex(fx('11653.html'), menu);
  assert.doesNotMatch(out, /<h1 class="entry-title"/);
  assert.strictEqual((out.match(/<section class="btg-panel">/g) || []).length, 3);
  assert.strictEqual((out.match(/<a class="btg-panel-link btg-card--/g) || []).length, 15);
  assert.match(out, /<h2 class="btg-panel-title">Repairs &amp; Upgrades<\/h2>/);
  assert.match(out, /href="https:\/\/bobthetechguy\.com\/screen-replacement\/">Screen Replacement<\/a>/);
  assert.doesNotMatch(out, /Laptop Screen Replacement/);
  assert.ok(out.startsWith('<section class="btg-hero">'));
  assert.ok(out.endsWith(fx('11653.html').slice(fx('11653.html').indexOf('<!-- btg-loader'))));
});

test('buildIndex() refuses a menu that does not match the groups', () => {
  assert.throws(() => I.buildIndex(fx('11653.html'), menu.slice(1)), /menu does not match.*networking/i);
  assert.throws(() => I.buildIndex(fx('11653.html'), menu.concat([{ slug: 'drone-repair', url: 'https://bobthetechguy.com/drone-repair/', title: 'Drone Repair' }])), /drone-repair/);
});

test('buildIndex() refuses to run twice', () => {
  assert.throws(() => I.buildIndex(I.buildIndex(fx('11653.html'), menu), menu), /Already transformed|No service link list/);
});

test('verifyIndex() passes the real build and catches tampering', () => {
  const before = fx('11653.html');
  const out = I.buildIndex(before, menu);
  assert.deepStrictEqual(I.verifyIndex(before, out, menu), []);
  assert.ok(I.verifyIndex(before, out.replace('provide a wide range', 'provides a wide range'), menu).length > 0);
  assert.ok(I.verifyIndex(before, out.replace(/<li><a class="btg-panel-link btg-card--lock"[^<]*<\/a><\/li>/, ''), menu).length > 0);
  assert.ok(I.verifyIndex(before, out.replace('>Networking<', '>Networks<'), menu).length > 0);
  assert.ok(I.verifyIndex(before, out.replace('<section class="btg-panel">', '<section class="btg-panel" style="display:none">'), menu).length > 0);
  assert.ok(I.verifyIndex(before, out.replace('</section>\n', '</section>\n<h1>Extra</h1>\n'), menu).length > 0);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/services-index.test.js`
Expected: FAIL — `Cannot find module '../tools/services-index.js'`.

- [ ] **Step 3: Implement** — create `tools/services-index.js`:

```js
// tools/services-index.js
// Rebuilds the Services index (/services-2/, page 11653): the 10 <h1> links
// become three grouped panels listing every page in the menu's Services
// submenu. Spec: docs/superpowers/specs/2026-09-27-services-split-and-index-design.md
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards-transform.js'));
  else root.BTGServicesIndex = factory(root.BTGCards);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  // Group names are approved new words; each item is [slug, icon].
  var GROUPS = [
    { name: 'Repairs &amp; Upgrades', items: [['hardware-repair-upgrades', 'tool'], ['screen-replacement', 'screen'], ['memory-install', 'chip'], ['hardware-install', 'plug'], ['computer-tune-up', 'gauge'], ['data-recovery-service', 'drive']] },
    { name: 'Setup &amp; Software', items: [['computer-set-up', 'laptop'], ['operating-system-install', 'window'], ['software-installation-and-configuration', 'box'], ['printer-solutions', 'printer'], ['email-setup', 'mail']] },
    { name: 'Security &amp; Networking', items: [['networking', 'wifi'], ['anti-virus', 'shield'], ['backup-solutions', 'cloud'], ['parental-controls', 'lock']] }
  ];
  var LINKS = /(?:<h1 class="entry-title"[^>]*><strong><a href="[^"]*">[^<]*<\/a><\/strong><\/h1>\s*)+/g;

  // Submenu items of "Services" in the public page's first menu, in menu order.
  function parseServicesMenu(publicHtml) {
    var at = publicHtml.indexOf('href="https://bobthetechguy.com/services-2/"');
    if (at < 0) throw new Error('Services menu item not found');
    var re = /<a href="(https:\/\/bobthetechguy\.com\/([a-z0-9-]+)\/)"[^>]*><span class="([^"]*)">([^<]*)<\/span><\/a>/g, m, out = [];
    re.lastIndex = at - 9;
    m = re.exec(publicHtml);
    while ((m = re.exec(publicHtml)) && m[3] === '') {
      out.push({ slug: m[2], url: m[1], title: m[4].replace(/&#038;/g, '&amp;') });
    }
    return out;
  }

  function check(menu) {
    var want = [].concat.apply([], GROUPS.map(function (g) { return g.items.map(function (i) { return i[0]; }); }));
    var have = menu.map(function (m) { return m.slug; });
    var missing = want.filter(function (s) { return have.indexOf(s) === -1; });
    var extra = have.filter(function (s) { return want.indexOf(s) === -1; });
    if (missing.length || extra.length || have.length !== want.length) {
      throw new Error('Services menu does not match the groups. Missing: ' + missing.join(', ') + '. Extra: ' + extra.join(', '));
    }
  }

  function panelsHtml(menu) {
    return '<div class="btg-panels">' + GROUPS.map(function (g) {
      return '<section class="btg-panel"><h2 class="btg-panel-title">' + g.name + '</h2><ul class="btg-panel-list">' +
        g.items.map(function (i) {
          var m = menu.filter(function (x) { return x.slug === i[0]; })[0];
          return '<li><a class="btg-panel-link btg-card--' + i[1] + '" href="' + m.url + '">' + m.title + '</a></li>';
        }).join('') + '</ul></section>';
    }).join('') + '</div>';
  }

  function buildIndex(raw, menu) {
    if (raw.indexOf('class="btg-panels"') !== -1) throw new Error('Already transformed');
    check(menu);
    var runs = raw.match(LINKS) || [];
    if (runs.length !== 1) throw new Error('No service link list found (' + runs.length + ' runs)');
    return raw.replace(LINKS, panelsHtml(menu) + '\n');
  }

  // Safety gate before saving: [] means safe.
  function verifyIndex(before, after, menu) {
    var problems = [];
    var runs = before.match(LINKS) || [];
    var start = after.indexOf('<div class="btg-panels">');
    var end = after.indexOf('</div>', after.lastIndexOf('</section>', after.indexOf('<!-- btg-loader') < 0 ? after.length : after.indexOf('<!-- btg-loader'))) + 6;
    if (runs.length !== 1 || start < 0) return ['Panels or original link list not found'];
    var panels = after.slice(start, end);
    if (after.slice(0, start) + after.slice(end).replace(/^\n/, '') !== before.replace(runs[0], '')) problems.push('Content outside the panels changed');
    var links = (panels.match(/<a class="btg-panel-link btg-card--[a-z]+" href="[^"]*">[^<]*<\/a>/g) || []).map(function (a) {
      return a.replace(/<a class="btg-panel-link btg-card--([a-z]+)" href="([^"]*)">([^<]*)<\/a>/, '$1|$2|$3');
    });
    var want = [].concat.apply([], GROUPS.map(function (g) {
      return g.items.map(function (i) { var m = menu.filter(function (x) { return x.slug === i[0]; })[0]; return m ? i[1] + '|' + m.url + '|' + m.title : 'missing ' + i[0]; });
    }));
    if (links.join('\n') !== want.join('\n')) problems.push('Panel links differ from the groups/menu');
    var words = C.text(panels.replace(/<a [^>]*>[^<]*<\/a>/g, ''));
    if (words !== C.text(GROUPS.map(function (g) { return g.name; }).join(' '))) problems.push('Unexpected text in the panels: ' + words.slice(0, 60));
    if (/\s(hidden|style|aria-hidden)(=|>|\s)|screen-reader-text/.test(panels)) problems.push('Hidden or styled element inside the panels');
    var head = after.slice(0, after.indexOf('<!-- btg-loader') < 0 ? after.length : after.indexOf('<!-- btg-loader'));
    if ((head.match(/<h1\b/g) || []).length !== 1) problems.push('Expected exactly one h1 (the hero)');
    return problems;
  }

  return { GROUPS: GROUPS, parseServicesMenu: parseServicesMenu, buildIndex: buildIndex, verifyIndex: verifyIndex };
});
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/services-index.test.js`
Expected: PASS. If `parseServicesMenu` returns fewer than 15, print `menu` and compare against `test/fixtures/menu.html` — submenu anchors must carry `<span class="">`; adjust the regex to the fixture, not the expected count.

- [ ] **Step 5: Commit**

```bash
git add tools/services-index.js test/services-index.test.js
git commit -m "Add Services index builder: menu parser, grouped panels, verifier"
```

---

### Task 5: Homepage reorder

**Files:**
- Create: `tools/home-reorder.js`
- Test: `test/home-reorder.test.js`

**Interfaces:**
- Consumes: `test/fixtures/2318.html`.
- Produces: `reorderHome(raw) -> string`, `verifyHome(before, after) -> string[]`. Browser global: `BTGHomeReorder`.

- [ ] **Step 1: Write the failing tests**

```js
// test/home-reorder.test.js — run: node --test test/home-reorder.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../tools/home-reorder.js');
const home = fs.readFileSync(path.join(__dirname, 'fixtures', '2318.html'), 'utf8');

test('reorderHome() puts the cert and SEO blocks right before the quote box', () => {
  const out = H.reorderHome(home);
  const cert = out.indexOf('<strong>Certified Computer Repair Services.');
  const seo = out.indexOf('[fusion_text]So you have a new computer');
  const quote = out.indexOf('title="Need Computer Repair Services? Need A Quote? "');
  assert.ok(cert > out.indexOf('Read all of our customer reviews') && cert < seo && seo < quote);
  assert.ok(out.indexOf('Why Choose Bob?') < cert);
});

test('reorderHome() renames only the Services button', () => {
  const out = H.reorderHome(home);
  assert.strictEqual((out.match(/<span style="color:#ffffff">All Services<\/span>\[\/button\]/g) || []).length, 1);
  assert.match(out, /<span style="color:#ffffff">PC Repair<\/span>\[\/button\]/);
  assert.strictEqual(out.length, home.length + 4);
});

test('verifyHome() passes the real reorder and catches changes', () => {
  const out = H.reorderHome(home);
  assert.deepStrictEqual(H.verifyHome(home, out), []);
  assert.ok(H.verifyHome(home, out.replace('custom setup!', 'custom set-up!')).length > 0);
  assert.ok(H.verifyHome(home, out.replace('All Services', 'Every Service')).length > 0);
  assert.ok(H.verifyHome(home, home).length > 0);
});

test('reorderHome() refuses a changed or already-reordered page', () => {
  assert.throws(() => H.reorderHome(H.reorderHome(home)), /Already reordered/);
  assert.throws(() => H.reorderHome(home.replace('So you have a new computer', 'You have a new computer')), /SEO block/);
  const twice = home.replace('[fusion_text]<strong>Certified Computer Repair', '[fusion_text]<strong>Certified Computer Repair Services.</strong>[/fusion_text][fusion_text]<strong>Certified Computer Repair');
  assert.throws(() => H.reorderHome(twice), /Certified/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/home-reorder.test.js`
Expected: FAIL — `Cannot find module '../tools/home-reorder.js'`.

- [ ] **Step 3: Implement** — create `tools/home-reorder.js`:

```js
// tools/home-reorder.js
// Homepage (page 2318): move the "Certified Computer Repair" paragraph and the
// SEO paragraphs above the "Need A Quote?" box, and label the Services button
// "All Services". Moves text; adds only "All ".
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BTGHomeReorder = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var BTN = '<span style="color:#ffffff">Services</span>[/button]';
  var BTN_NEW = '<span style="color:#ffffff">All Services</span>[/button]';
  var QUOTE = 'title="Need Computer Repair Services? Need A Quote? "';

  function once(s, needle, what) {
    var at = s.indexOf(needle);
    if (at < 0 || s.indexOf(needle, at + 1) !== -1) throw new Error(what + (at < 0 ? ' not found' : ' found more than once'));
    return at;
  }
  function textBlock(s, needle, what) {
    var at = once(s, needle, what);
    var start = s.lastIndexOf('[fusion_text]', at), end = s.indexOf('[/fusion_text]', at) + 14;
    if (start < 0 || end < 14) throw new Error(what + ' is not inside a text block');
    return [start, end];
  }

  function reorderHome(s) {
    if (s.indexOf(BTN_NEW) !== -1) throw new Error('Already reordered');
    var cert = textBlock(s, '<strong>Certified Computer Repair Services.', 'Certified paragraph');
    var seo = textBlock(s, '[fusion_text]So you have a new computer', 'SEO block');
    var quote = s.lastIndexOf('[tagline_box', once(s, QUOTE, 'Quote box'));
    if (!(cert[1] <= quote && quote < seo[0])) throw new Error('Unexpected order: Certified < Quote box < SEO block expected');
    once(s, BTN, 'Services button');
    var out = s.slice(0, cert[0]) + s.slice(cert[1], quote) + s.slice(cert[0], cert[1]) + s.slice(seo[0], seo[1]) + s.slice(quote, seo[0]) + s.slice(seo[1]);
    return out.replace(BTN, BTN_NEW);
  }

  // Safety gate: [] means safe.
  function verifyHome(before, after) {
    var problems = [];
    if (after.split(BTN_NEW).length !== 2) problems.push('"All Services" label missing or duplicated');
    var restored = after.replace(BTN_NEW, BTN);
    if (restored.length !== before.length) problems.push('Length changed by ' + (after.length - before.length) + ' (expected +4)');
    if (restored.split('').sort().join('') !== before.split('').sort().join('')) problems.push('Characters changed, not just reordered');
    var cert = after.indexOf('<strong>Certified Computer Repair Services.'), seo = after.indexOf('[fusion_text]So you have a new computer'), quote = after.indexOf(QUOTE);
    if (!(cert < seo && seo < quote)) problems.push('Blocks are not in the order Certified, SEO, Quote box');
    var tailAt = before.indexOf('<!-- btg-loader');
    if (tailAt >= 0 && !after.endsWith(before.slice(tailAt))) problems.push('Loader tail changed');
    return problems;
  }

  return { reorderHome: reorderHome, verifyHome: verifyHome };
});
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/home-reorder.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tools/home-reorder.js test/home-reorder.test.js
git commit -m "Add homepage reorder (Certified + SEO above the quote box, All Services) with conservation check"
```

---

### Task 6: Bundle v1.2.0 styles, local preview, tag

**Files:**
- Modify: `dist/btg.css` (append at the end)
- Test: `test/v1.2.0.test.js` (create)

**Interfaces:**
- Consumes: class names from Tasks 2 and 4 (`btg-banner`, `btg-split`, `btg-split--stacked`, `btg-split-text`, `btg-include-card`, `btg-note`, `btg-panels`, `btg-panel`, `btg-panel-title`, `btg-panel-list`, `btg-panel-link`, icons `tool screen chip plug window box printer`).
- Produces: tag `v1.2.0` on GitHub, served by jsDelivr.

- [ ] **Step 1: Write the failing test**

```js
// test/v1.2.0.test.js — run: node --test test/v1.2.0.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const R = require('../tools/service-recipes.js');
const I = require('../tools/services-index.js');

test('split layout: 2 columns from 768px, stacked variant stays 1 column', () => {
  assert.match(css, /\.btg-split \{[^}]*display: grid;[^}]*grid-template-columns: 1fr;/);
  assert.match(css, /@media \(min-width: 768px\) \{\s*\.btg-split \{ grid-template-columns: 1\.3fr 1fr; \}\s*\.btg-split--stacked \{ grid-template-columns: 1fr; \}/);
  assert.match(css, /\.btg-include-card \{[^}]*border-top: 3px solid var\(--btg-green\);/);
  assert.match(css, /\.btg-split--stacked \.btg-include-card \.btg-checklist \{ grid-template-columns: repeat\(2, 1fr\); \}/);
  assert.match(css, /\.btg-note \{/);
  assert.match(css, /\.btg-banner \{/);
});

test('index panels: adaptive grid, icon tile, arrow', () => {
  assert.match(css, /\.btg-panels \{[^}]*grid-template-columns: repeat\(auto-fit, minmax\(min\(240px, 100%\), 1fr\)\);/);
  assert.match(css, /\.btg-panel-link::before \{[^}]*background-color: var\(--btg-green-tint\);/);
  assert.doesNotMatch(css, /\.btg-panel-link::before \{[^}]*background:/);
  assert.match(css, /\.btg-panel-link::after \{ content: "\\203A";/);
});

test('every split-recipe and index icon has a style', () => {
  const icons = new Set(Object.values(R).filter((r) => r.layout === 'split').map((r) => r.icon));
  I.GROUPS.forEach((g) => g.items.forEach((i) => icons.add(i[1])));
  for (const icon of icons) assert.match(css, new RegExp('\\.btg-card--' + icon + '::before \\{'), icon);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/v1.2.0.test.js`
Expected: FAIL on the first assertion (no `.btg-split`).

- [ ] **Step 3: Append the v1.2.0 styles to `dist/btg.css`**

```css

/* v1.2.0 — small Services pages (split) and the Services index (panels).
   Spec: docs/superpowers/specs/2026-09-27-services-split-and-index-design.md */
.btg-banner { text-align: center; margin: 0 0 var(--btg-space-4) !important; }
.btg-split { display: grid; grid-template-columns: 1fr; gap: var(--btg-space-4); align-items: start; margin: 0 0 var(--btg-space-4); }
@media (min-width: 768px) {
  .btg-split { grid-template-columns: 1.3fr 1fr; }
  .btg-split--stacked { grid-template-columns: 1fr; }
}
.btg-split-text p { margin: 0 0 var(--btg-space-3) !important; }
.btg-split-text p:last-child { margin-bottom: 0 !important; }
.btg-include-card { background: var(--btg-card-bg); border: 1px solid var(--btg-card-border); border-top: 3px solid var(--btg-green); border-radius: var(--btg-radius-md); padding: 22px 22px 16px; }
.btg-include-card::before { content: ""; display: block; width: 34px; height: 34px; border-radius: 8px; background-color: var(--btg-green-tint); background-position: center; background-size: 22px; background-repeat: no-repeat; margin-bottom: var(--btg-space-2); }
.btg-include-card h2 { font-size: 21px !important; line-height: 1.3 !important; margin: 0 0 var(--btg-space-3) !important; padding-top: 0 !important; }
.btg-include-card h2::before { display: none !important; }
.btg-include-card .btg-checklist { grid-template-columns: 1fr; margin-bottom: 0 !important; }
.btg-split--stacked .btg-include-card .btg-checklist { grid-template-columns: repeat(2, 1fr); }
@media (max-width: 600px) {
  .btg-split--stacked .btg-include-card .btg-checklist { grid-template-columns: 1fr; }
}
.btg-note { color: var(--btg-text-muted); font-style: italic; margin: 0 0 var(--btg-space-3) !important; }
.btg-panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: var(--btg-space-3); margin: var(--btg-space-4) 0; }
.btg-panel { background: var(--btg-card-bg); border: 1px solid var(--btg-card-border); border-top: 3px solid var(--btg-green); border-radius: var(--btg-radius-md); padding: var(--btg-space-3) var(--btg-space-3) var(--btg-space-2); }
.btg-panel-title { font-family: var(--btg-font-body) !important; font-size: 13px !important; font-weight: 700 !important; letter-spacing: 0.14em !important; text-transform: uppercase; color: var(--btg-green-link) !important; margin: 0 0 var(--btg-space-2) !important; padding-top: 0 !important; }
.btg-panel-title::before { display: none !important; }
.btg-panel-list { list-style: none; margin: 0 !important; padding: 0 !important; }
.btg-panel-list li { margin: 0 !important; border-bottom: 1px solid var(--btg-card-border); }
.btg-panel-list li:last-child { border-bottom: 0; }
.btg-panel-link { display: flex; align-items: center; gap: 10px; padding: 9px 2px; color: var(--btg-text) !important; text-decoration: none !important; line-height: 1.3; }
.btg-panel-link::before { content: ""; flex: none; width: 28px; height: 28px; border-radius: var(--btg-radius-sm); background-color: var(--btg-green-tint); background-position: center; background-size: 16px; background-repeat: no-repeat; }
.btg-panel-link::after { content: "\203A"; margin-left: auto; padding-left: 8px; color: var(--btg-green-link); font-weight: 700; }
.btg-panel-link:hover, .btg-panel-link:focus-visible { color: var(--btg-green-link) !important; }
.btg-card--tool::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z'/%3E%3C/svg%3E"); }
.btg-card--screen::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='12' rx='1'/%3E%3Cpath d='M8 20h8M12 16v4'/%3E%3C/svg%3E"); }
.btg-card--chip::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='6' y='6' width='12' height='12' rx='1'/%3E%3Cpath d='M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4'/%3E%3C/svg%3E"); }
.btg-card--plug::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4'/%3E%3C/svg%3E"); }
.btg-card--window::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='16' rx='2'/%3E%3Cpath d='M3 9h18M7 6.5h.01M10 6.5h.01'/%3E%3C/svg%3E"); }
.btg-card--box::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8'/%3E%3C/svg%3E"); }
.btg-card--printer::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9V3h12v6M6 18H4v-7h16v7h-2M6 14h12v7H6z'/%3E%3C/svg%3E"); }
```

- [ ] **Step 4: Run the full suite**

Run: the Global Constraints test command.
Expected: all PASS.

- [ ] **Step 5: Local visual check (frontend-design quality bar)** — render transformed fixtures inside a mock `.post-content` column with the new CSS and screenshot desktop and phone:

```bash
mkdir -p .superpowers/preview
node -e "
const fs=require('fs');const S=require('./tools/service-cards.js'),R=require('./tools/service-recipes.js'),I=require('./tools/services-index.js');
const fx=id=>fs.readFileSync('test/fixtures/'+id+'.html','utf8');const menu=I.parseServicesMenu(fx('menu'));
const pages={memory:S.transformSplit(fx('11978'),R['11978']),setup:S.transformSplit(fx('11806'),R['11806']),software:S.transformSplit(fx('11855'),R['11855']),index:I.buildIndex(fx('11653'),menu)};
for(const [k,v] of Object.entries(pages))fs.writeFileSync('.superpowers/preview/'+k+'.html','<!doctype html><meta name=viewport content=\"width=device-width\"><link rel=stylesheet href=\"https://fonts.googleapis.com/css?family=PT+Sans:400,700|Roboto+Slab:300,400\"><link rel=stylesheet href=\"../../dist/btg.css\"><body style=\"margin:0;font-family:PT Sans\"><div id=content style=\"max-width:840px;margin:0 auto;padding:0 16px\"><div class=post-content>'+v.replace(/<!-- btg-loader[\s\S]*/,'')+'</div></div>');
console.log(Object.keys(pages).join(' '))"
E="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
for p in memory setup software index; do for w in 1440 500; do
  "$E" --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$TEMP/pv-prof" --window-size=$w,1800 --screenshot="$(cygpath -w $PWD)\\.superpowers\\preview\\$p-$w.png" "file:///$(cygpath -m $PWD)/.superpowers/preview/$p.html" 2>/dev/null
done; done; ls .superpowers/preview/*.png
```

Read each PNG. Expected: split side by side at 1440 (stacked for Set Up), stacked at 500; include card with icon tile and green checks; note italic under the card; index shows 3 panels at 1440 and 1 column at 500 with icons and "›". Fix CSS until it looks right, re-run Steps 4–5, send the user the four 1440 screenshots.

- [ ] **Step 6: Commit, tag and push (live gate: ask the user first)**

```bash
git add dist/btg.css test/v1.2.0.test.js
git commit -m "v1.2.0: split layout, include card, note, banner, index panels, 7 icons"
git tag v1.2.0 && git push origin HEAD --tags
for f in dist/btg.css dist/btg.js tools/service-cards.js tools/service-recipes.js tools/cards-transform.js tools/services-index.js tools/home-reorder.js; do curl -s -o /dev/null -w "%{http_code} $f\n" https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.2.0/$f; done
```

Expected: 7 × `200`. (No page loads v1.2.0 yet, so nothing on the live site changes.)

---

### Task 7: Browser dry run (no writes)

**Files:** none.

**Interfaces:**
- Consumes: `BTGCards`, `BTGServiceCards`, `BTGServiceRecipes`, `BTGServicesIndex`, `BTGHomeReorder` from jsDelivr `@v1.2.0`.
- Produces: `window.__v12.split(ids, write)`, `window.__v12.index(write)`, `window.__v12.home(write)`, `window.__v12.bump(write)` used by Tasks 8–10.

- [ ] **Step 1: Load tools and define runners** (signed-in tab on `/wp-admin/profile.php`)

```js
for (const f of ['tools/cards-transform.js', 'tools/service-cards.js', 'tools/service-recipes.js', 'tools/services-index.js', 'tools/home-reorder.js']) {
  await new Promise((ok, bad) => { const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.2.0/' + f; s.onload = ok; s.onerror = bad; document.head.append(s); });
}
const n = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce').then((r) => r.text());
const H = { 'X-WP-Nonce': n, 'Content-Type': 'application/json' };
const url = (type, id) => `/wp-json/wp/v2/${type}/${id}?context=edit&_fields=content`;
const get = (id, type = 'pages') => fetch(url(type, id), { headers: H }).then((r) => r.json()).then((p) => p.content.raw);
const save = async (id, before, after, type = 'pages') => {
  if ((await get(id, type)) !== before) return `${id} ABORT: page changed since read`;
  const r = await fetch(url(type, id), { method: 'POST', headers: H, body: JSON.stringify({ content: after }) });
  return `${id} HTTP ${r.status} saved=${r.ok && (await r.json()).content.raw === after}`;
};
const pin = (html) => /bob-the-tech-guy-site@/.test(html) ? html.replace(/bob-the-tech-guy-site@v1\.\d+\.\d+\//g, 'bob-the-tech-guy-site@v1.2.0/') : BTGServiceCards.addLoader(html, 'v1.2.0');
const menu = BTGServicesIndex.parseServicesMenu(await fetch('/services-2/').then((r) => r.text()));
window.__v12 = {
  split: async (ids, write) => { const out = []; for (const id of ids) { try {
    const before = await get(id); const R = BTGServiceRecipes[id];
    const t = BTGServiceCards.transformSplit(before, R); const p = BTGServiceCards.verifyService(before, t, R);
    if (p.length) { out.push(`${id} FAIL ${p.join('; ')}`); continue; }
    out.push(write ? await save(id, before, pin(t)) : `${id} OK (dry run)`);
  } catch (e) { out.push(`${id} ERROR ${e.message}`); } } return out.join('\n'); },
  index: async (write) => { try {
    const before = await get(11653); const t = BTGServicesIndex.buildIndex(before, menu); const p = BTGServicesIndex.verifyIndex(before, t, menu);
    if (p.length) return `11653 FAIL ${p.join('; ')}`;
    return write ? await save(11653, before, pin(t)) : '11653 OK (dry run)';
  } catch (e) { return `11653 ERROR ${e.message}`; } },
  home: async (write) => { try {
    const before = await get(2318); const t = BTGHomeReorder.reorderHome(before); const p = BTGHomeReorder.verifyHome(before, t);
    if (p.length) return `2318 FAIL ${p.join('; ')}`;
    return write ? await save(2318, before, pin(t)) : '2318 OK (dry run)';
  } catch (e) { return `2318 ERROR ${e.message}`; } },
  bump: async (write) => { const out = [];
    const items = [['pages', [12166, 11802, 11649, 2, 3754, 11981, 11804, 11863, 11976, 11971, 11857]], ['posts', [28867, 28872, 28873, 28874, 28875, 28876, 28877, 28878, 28879]]];
    for (const [type, ids] of items) for (const id of ids) {
      const b = await get(id, type); const a = b.replace(/bob-the-tech-guy-site@v1\.\d+\.\d+\//g, 'bob-the-tech-guy-site@v1.2.0/');
      if (a === b) { out.push(`${id} already`); continue; }
      out.push(write ? await save(id, b, a, type) : `${id} would bump`);
    }
    return out.join(' | '); }
};
[menu.length, await window.__v12.split([11978, 11806, 11867, 11869, 11973, 11861, 11859, 11853, 11855], false), await window.__v12.index(false), await window.__v12.home(false), await window.__v12.bump(false)].join('\n')
```

Expected: `15`, 9 × `OK (dry run)`, `11653 OK (dry run)`, `2318 OK (dry run)`, 20 × `would bump`. Any `FAIL`/`ERROR`: the live raw differs from the fixture — re-snapshot that page, add a fixture test, fix, tag `v1.2.1` (never move a tag), repeat.

---

### Task 8: Memory Install live, then check

**Files:** none.

- [ ] **Step 1: Save Memory Install (live-write gate)**

```js
await window.__v12.split([11978], true)
```

Expected: `11978 HTTP 200 saved=true`.

- [ ] **Step 2: Check the public HTML for auto-formatting damage**

```bash
curl -sk "https://bobthetechguy.com/memory-install/?v=$RANDOM" | tr '\n' ' ' > "$TEMP/mem.html"
node -e "
const h=require('fs').readFileSync(process.env.TEMP+'/mem.html','utf8');
const body=h.slice(h.indexOf('</section>',h.indexOf('class=\"btg-hero\"')),h.indexOf('btg-styles'));
console.log('split',(body.match(/class=\"btg-split\"/g)||[]).length,'card',(body.match(/class=\"btg-include-card /g)||[]).length,'li',(body.match(/<li>/g)||[]).length,'br',(body.match(/<br\s*\/?>/g)||[]).length,'emptyP',(body.match(/<p>\s*<\/p>/g)||[]).length,'pWrapped',(body.match(/<p>\s*<(div|ul|h[1-6]|section)/g)||[]).length,'loader',[...new Set(h.match(/site@v[0-9.]*/g)||[])].join(','));"
```

Expected: `split 1 card 1 li 3 br 0 emptyP 0 pWrapped 0 loader site@v1.2.0`. Anything else: POST `backups/2026-09-27/11978.html` back, debug with superpowers:systematic-debugging, do not continue.

- [ ] **Step 3: Screenshots** — headless Edge of the live page at 1440 wide and mobile-emulated 390×844 (the `phone-cap.mjs` CDP recipe: `Emulation.setDeviceMetricsOverride {width:390,height:844,deviceScaleFactor:3,mobile:true}`, `--ignore-certificate-errors`). Confirm hero with digits and trust line, split side by side on desktop and stacked on phone, checks, CTA block. Send both to the user.

---

### Task 9: The other 8 pages, the index and the homepage

**Files:** none.

- [ ] **Step 1: Save the other 8 small pages (live-write gate)**

```js
await window.__v12.split([11806, 11867, 11869, 11973, 11861, 11859, 11853, 11855], true)
```

Expected: 8 × `HTTP 200 saved=true` (11867 gains its first loader).

- [ ] **Step 2: Save the index, check it, then the homepage (live-write gate)**

```js
await window.__v12.index(true)
```

Expected: `11653 HTTP 200 saved=true`. Then:

```bash
curl -sk "https://bobthetechguy.com/services-2/?v=$RANDOM" | tr '\n' ' ' > "$TEMP/idx.html"
node -e "
const h=require('fs').readFileSync(process.env.TEMP+'/idx.html','utf8');const a=h.indexOf('class=\"btg-panels\"');const body=h.slice(a,h.indexOf('btg-loader',a));
console.log('panels',(body.match(/<section class=\"btg-panel\">/g)||[]).length,'links',(body.match(/class=\"btg-panel-link /g)||[]).length,'br',(body.match(/<br\s*\/?>/g)||[]).length,'emptyP',(body.match(/<p>\s*<\/p>/g)||[]).length,'pWrapped',(body.match(/<p>\s*<(div|ul|h[1-6]|section)/g)||[]).length,'entryH1',(h.match(/<h1 class=\"entry-title\"/g)||[]).length);"
```

Expected: `panels 3 links 15 br 0 emptyP 0 pWrapped 0 entryH1 0`. Then:

```js
await window.__v12.home(true)
```

Expected: `2318 HTTP 200 saved=true`.

- [ ] **Step 3: Screenshots** — desktop 1440 and phone 390 of the index and homepage (the reordered section and the "All Services" button), plus desktop of Computer Set Up and Software Installation. Send them to the user.

---

### Task 10: Loaders, full verification, memory

**Files:** none (plus memory).

- [ ] **Step 1: Bump the remaining 20 loaders (live-write gate)**

```js
await window.__v12.bump(true)
```

Expected: 20 entries `HTTP 200 saved=true`.

- [ ] **Step 2: Verify all 31 pages publicly**

```bash
for s in / about/ services-2/ contact-2/ gallery/ reviews/ testimonials/ networking/ anti-virus/ backup-solutions/ hardware-repair-upgrades/ email-setup/ parental-controls/ computer-set-up/ computer-tune-up/ data-recovery-service/ hardware-install/ memory-install/ operating-system-install/ printer-solutions/ screen-replacement/ software-installation-and-configuration/ best-computer-repair-chesterfield-va/ pc-repair-service-bon-air-virginia/ pc-repair-service-brandermill-virginia/ pc-repair-service-chester-virginia/ pc-repair-service-colonial-heights-virginia/ pc-repair-service-midlothian-virginia/ pc-repair-service-moseley-virginia/ pc-repair-service-richmond-virginia/ pc-repair-service-woodlake-virginia/; do
  h=$(curl -sk --max-time 30 "https://bobthetechguy.com/$s?v=$RANDOM$RANDOM" | tr '\n' ' ')
  printf "%-46s %s split=%s panels=%s cards=%s\n" "/$s" "$(echo "$h" | grep -o 'site@v[0-9.]*' | sort -u | tr '\n' ' ')" "$(echo "$h" | grep -o 'class="btg-split' | wc -l)" "$(echo "$h" | grep -o '<section class="btg-panel">' | wc -l)" "$(echo "$h" | grep -o '<article class="btg-card ' | wc -l)"
done
```

Expected: all 31 `site@v1.2.0` only; `split=1` on the 9 small pages; `panels=3` on `/services-2/`; cards unchanged (3/2/2/1/1/1 on the carded pages, 6 on the 9 town pages). Re-fetch any page that shows no version before treating it as a failure.

- [ ] **Step 3: Final review** — dispatch one fresh reviewer (most capable model) over `git diff ad551ce..HEAD` plus the Task 8–10 evidence; fix Critical/Important findings before closing.

- [ ] **Step 4: Memory + push**

Update `C:\Users\there\.claude\projects\C--Users-there\memory\bob-website-client.md`: v1.2.0 live on 31 pages; 9 small Services pages split via `transformSplit`; index panels via `tools/services-index.js`; homepage reordered via `tools/home-reorder.js`; backups in `backups/2026-09-27/`; next project: the logo. Then `git push origin HEAD`.
