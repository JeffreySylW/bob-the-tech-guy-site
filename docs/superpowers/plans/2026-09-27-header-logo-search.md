# Header, Logo & Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the top bar identical on every bundle page, replace the logo with the "live trace" wordmark, restyle the theme header into one sticky row with a Services dropdown, and add search with page suggestions — all from the bundle, no page content changes.

**Architecture:** Two new modules in `dist/btg.js`: `BTGHeader` (pure: logo/icon SVG, menu-link grouping; DOM glue: logo swap, one-row layout, tools, dropdown, sticky) and `BTGSearch` (pure: normalize + rank over a built-in page list; DOM glue: combobox panel). The page list lives in `tools/search-pages.js` and is copied into `btg.js` by `tools/build-search-data.js`. Header/top-bar styles move into `dist/btg.css`. Pure parts are unit-tested with `node:test`; DOM behavior is tested in headless Edge against saved copies of live pages served locally with the bundle swapped for the working copy.

**Tech Stack:** ES5-compatible JS, CSS, `node:test`, Node 24 (global WebSocket/fetch) + headless Edge via CDP, jsDelivr tags, WordPress REST from the signed-in Chrome tab.

**Spec:** `docs/superpowers/specs/2026-09-27-header-logo-search-design.md`

## Global Constraints

- Everything ships in `dist/btg.css` / `dist/btg.js`; no WordPress page content changes except the loader version pin.
- New UI words allowed: "Search", "Search all pages for", "No matching pages. Press Enter to search the whole site.", SERVICE / AREA / PAGE, "More". No other visible copy changes. Search keywords are never displayed.
- Brand green `#54aa47` (text-safe green `#38792f`), `--btg-*` tokens, PT Sans / Roboto Slab. No street address. No analytics, no third-party requests.
- `prefers-reduced-motion: reduce` → no logo pulse, no trace transition, no header shrink transition.
- The theme's own markup is restyled/enhanced, never required: if an expected element is missing, that enhancement is skipped and the page still works.
- Call button: `tel:8448354890`, "844-TEKGUY-0" with "(844) 835-4890" beneath.
- Every live write (tag push, WordPress POST) needs the user's OK; auto mode may require the user to switch mode.
- Unit test command: `node --test test/cards-transform.test.js test/service-cards.test.js test/split.test.js test/services-index.test.js test/home-reorder.test.js test/v1.0.6.test.js test/v1.0.7.test.js test/v1.0.9.test.js test/v1.1.0.test.js test/v1.2.0.test.js test/search.test.js test/header.test.js test/v1.3.0.test.js`
- Browser test command: `node test/e2e/header.e2e.mjs` (needs internet: the saved pages load theme assets from bobthetechguy.com).

## Review Focus

- **Avada's own sticky-header script fighting ours** (the header is `fusion-sticky-menu-only`) — visitors expect one header that sticks once, no jumping or double headers; Task 6's e2e scrolls and asserts a single visible header row pinned at top.
- **Theme dropdown and our panel both appearing** — only our panel should show on desktop; Task 6 asserts the theme `.sub-menu` under Services is not visible while the panel is open.
- **Pages without the per-page style block (About, homepage, Services index)** — must match the ones with it; Task 6 compares top-bar computed fonts across 4 pages.
- **A menu link outside the three groups (Bob adds a service)** — it must still be reachable; Task 3 unit-tests the "More" group.
- **Phones: the theme's mobile menu button still opens the menu** after we move it into the tools area; Task 6 taps it at 390px and asserts the mobile nav becomes visible.

---

## File Structure

| File | Responsibility |
|---|---|
| `test/e2e/pages/{memory-install,about,testimonials,home}.html` | Saved public HTML of 4 live pages (test inputs) |
| `test/e2e/serve.mjs` | Local server: saved pages with jsDelivr bundle URLs → working-copy `dist/` |
| `test/e2e/cdp.mjs` | Tiny headless-Edge/CDP helper (launch, eval, key, shot, close) |
| `test/e2e/topbar.mjs` | Prints top-bar computed fonts for 4 pages at a base URL |
| `test/e2e/header.e2e.mjs` | Browser tests for header, dropdown, search, sticky, phone |
| `tools/search-pages.js` | The 29 search entries (source of truth) |
| `tools/build-search-data.js` | Copies entries into `dist/btg.js` between markers |
| `dist/btg.js` (modify) | + `06-search.js` (`BTGSearch`), `07-header.js` (`BTGHeader`), wired into `run()` |
| `dist/btg.css` (modify) | + v1.3.0 top bar, header, dropdown, search, icons |
| `test/search.test.js`, `test/header.test.js`, `test/v1.3.0.test.js` | Unit tests |

---

### Task 1: Saved pages, local server, baseline top-bar fonts

**Files:**
- Create: `test/e2e/pages/*.html`, `test/e2e/serve.mjs`, `test/e2e/cdp.mjs`, `test/e2e/topbar.mjs`

**Interfaces:**
- Produces: `serve(port) -> Promise<http.Server>` (default export of `serve.mjs`); `cdp.mjs` exports `launch({ width, height, mobile }) -> { send, evalJs, key, click, shot, sleep, close }`; `topbar.mjs <baseUrl>` prints JSON `{ page: { family, size, weight } }`.

- [ ] **Step 1: Save the 4 public pages**

```bash
cd /c/Users/there/Projects/bob-the-tech-guy-site && mkdir -p test/e2e/pages
for p in memory-install about testimonials; do curl -sk "https://bobthetechguy.com/$p/" -o test/e2e/pages/$p.html; done
curl -sk "https://bobthetechguy.com/" -o test/e2e/pages/home.html
grep -c 'bob-the-tech-guy-site@' test/e2e/pages/*.html
```

Expected: each file ≥ 1 match (all 4 pages load the bundle).

- [ ] **Step 2: Local server** — create `test/e2e/serve.mjs`:

```js
// Serves test/e2e/pages/*.html with the jsDelivr bundle swapped for the working copy's dist/.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CDN = /https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v[0-9.]+\/dist\//g;

export default function serve(port = 4410) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (url.pathname.startsWith('/dist/')) {
        const f = await readFile(path.join(root, url.pathname));
        res.writeHead(200, { 'content-type': url.pathname.endsWith('.css') ? 'text/css' : 'application/javascript' });
        return res.end(f);
      }
      const name = (url.pathname.replace(/^\/|\/$/g, '') || 'home') + '.html';
      const html = (await readFile(path.join(root, 'test/e2e/pages', name), 'utf8')).replace(CDN, '/dist/');
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

if (process.argv[1] && process.argv[1].endsWith('serve.mjs')) serve(Number(process.argv[2] || 4410)).then(() => console.log('serving on', process.argv[2] || 4410));
```

- [ ] **Step 3: CDP helper** — create `test/e2e/cdp.mjs`:

```js
// Minimal headless-Edge driver over the DevTools protocol.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch({ width = 1440, height = 900, mobile = false } = {}) {
  const port = 9600 + Math.floor(Math.random() * 300);
  spawn(EDGE, ['--headless=new', '--remote-allow-origins=*', '--disable-gpu', '--hide-scrollbars', '--ignore-certificate-errors',
    `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/e2e-profile-${port}`, `--window-size=${width},${height}`, 'about:blank'], { stdio: 'ignore' });
  let tabs;
  for (let i = 0; i < 120 && !tabs; i++) { await sleep(250); try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); } catch {} }
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); });
  const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  if (mobile) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile: true });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  }
  await send('Page.enable');
  const evalJs = async (x) => (await send('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result.result?.value;
  const key = async (k, code, vk, text) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); };
  const type = async (s) => { for (const ch of s) await key(ch, 'Key' + ch.toUpperCase(), ch.toUpperCase().charCodeAt(0), ch); };
  const click = async (x, y) => { for (const t of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type: t, x, y, button: 'left', clickCount: 1 }); };
  const move = (x, y) => send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  const goto = async (url) => { await send('Page.navigate', { url }); await sleep(3500); };
  const shot = async (file) => writeFileSync(file, Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
  const close = () => new Promise((ok) => { ws.close(); spawn('powershell', ['-Command', `Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | ? { $_.CommandLine -match 'e2e-profile-${port}' } | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: 'ignore' }).on('exit', ok); });
  return { send, evalJs, key, type, click, move, goto, shot, sleep, close };
}
```

- [ ] **Step 4: Top-bar font probe** — create `test/e2e/topbar.mjs`:

```js
// Usage: node test/e2e/topbar.mjs <baseUrl>   e.g. https://bobthetechguy.com or http://localhost:4410
import { launch } from './cdp.mjs';
const base = (process.argv[2] || 'https://bobthetechguy.com').replace(/\/$/, '');
const b = await launch({ width: 1440, height: 900 });
const out = {};
for (const p of ['about', 'testimonials', 'memory-install', '']) {
  await b.goto(`${base}/${p}${p ? '/' : ''}?v=${Date.now()}`);
  out[p || 'home'] = await b.evalJs(`(() => { const e = document.querySelector('.fusion-secondary-header .fusion-contact-info'); if (!e) return null; const s = getComputedStyle(e); return { family: s.fontFamily, size: s.fontSize, weight: s.fontWeight }; })()`);
}
console.log(JSON.stringify(out, null, 1));
await b.close();
```

- [ ] **Step 5: Record the live baseline**

Run: `node test/e2e/topbar.mjs https://bobthetechguy.com`
Expected: About and home differ from Testimonials and Memory Install (this is the bug). Paste the JSON into the ledger as "baseline".

- [ ] **Step 6: Commit**

```bash
git add test/e2e
git commit -m "Add saved pages, local bundle server, CDP helper and top-bar font probe"
```

---

### Task 2: `BTGSearch` ranking

**Files:**
- Modify: `dist/btg.js` (new `06-search.js` section before `05-init.js`'s runner IIFE — i.e. insert above the line `(function () {` that starts the auto-run block)
- Test: `test/search.test.js` (create)

**Interfaces:**
- Produces: `window.BTGSearch.norm(s) -> string`, `window.BTGSearch.rank(query, pages, limit=5) -> page[]` where `page = { title, url, type, icon, keywords: string[] }`, `window.BTGSearch.PAGES` (array; filled in Task 3), `window.BTGSearch.esc(s) -> string`.

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/search.test.js`
Expected: FAIL — `Cannot read properties of undefined (reading 'norm')`.

- [ ] **Step 3: Implement** — insert into `dist/btg.js` directly above the auto-run block comment `(function () {` / `// Guards against the Node test environment`:

```js
/* 06-search.js */
window.BTGSearch = (function () {
  /* search-data:start */
  var PAGES = [];
  /* search-data:end */

  function norm(s) {
    return String(s).toLowerCase().replace(/&amp;/g, '&')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // Per query word: title word starts with it (3) > title contains it (2) > a keyword starts with it (1).
  function score(words, page) {
    var title = norm(page.title), tw = title.split(' '), kw = (page.keywords || []).map(norm), total = 0;
    words.forEach(function (q) {
      if (tw.some(function (w) { return w.indexOf(q) === 0; })) total += 3;
      else if (title.indexOf(q) !== -1) total += 2;
      else if (kw.some(function (k) { return k.indexOf(q) === 0; })) total += 1;
    });
    return total;
  }

  function rank(query, pages, limit) {
    var q = norm(query);
    if (q.length < 2) return [];
    var words = q.split(' ');
    return pages.map(function (p, i) { return { p: p, s: score(words, p), i: i }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.i - b.i; })
      .slice(0, limit || 5)
      .map(function (x) { return x.p; });
  }

  return { PAGES: PAGES, norm: norm, esc: esc, rank: rank };
})();

```

- [ ] **Step 4: Run the tests**

Run: `node --test test/search.test.js test/v1.0.7.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add dist/btg.js test/search.test.js
git commit -m "Add BTGSearch: normalize and rank pages for search suggestions"
```

---

### Task 3: The page list and its build step

**Files:**
- Create: `tools/search-pages.js`, `tools/build-search-data.js`
- Modify: `dist/btg.js` (between the `search-data` markers, written by the build script)
- Test: `test/search.test.js` (append)

**Interfaces:**
- Consumes: `BTGSearch.PAGES` markers (Task 2); `tools/services-index.js` `GROUPS` (icons per service slug); `test/fixtures/menu.html`.
- Produces: `require('./tools/search-pages.js') -> page[]` (29 entries: 15 SERVICE, 9 AREA, 5 PAGE); `node tools/build-search-data.js` rewrites the marker block.

- [ ] **Step 1: Write the failing tests** (append to `test/search.test.js`)

```js
const fs = require('node:fs');
const path = require('node:path');
const PAGES = require('../tools/search-pages.js');
const I = require('../tools/services-index.js');
const menu = I.parseServicesMenu(fs.readFileSync(path.join(__dirname, 'fixtures', 'menu.html'), 'utf8'));
const TOWNS = ['best-computer-repair-chesterfield-va', 'pc-repair-service-bon-air-virginia', 'pc-repair-service-brandermill-virginia', 'pc-repair-service-chester-virginia', 'pc-repair-service-colonial-heights-virginia', 'pc-repair-service-midlothian-virginia', 'pc-repair-service-moseley-virginia', 'pc-repair-service-richmond-virginia', 'pc-repair-service-woodlake-virginia'];

test('search pages: 15 services from the live menu, 9 towns, 5 pages', () => {
  const by = (t) => PAGES.filter((p) => p.type === t);
  assert.deepStrictEqual(by('SERVICE').map((p) => p.url).sort(), menu.map((m) => m.url).sort());
  assert.deepStrictEqual(by('AREA').map((p) => p.url).sort(), TOWNS.map((s) => 'https://bobthetechguy.com/' + s + '/').sort());
  assert.deepStrictEqual(by('PAGE').map((p) => p.title), ['Home', 'About', 'Reviews', 'Testimonials', 'Contact']);
});

test('search pages: service titles match the menu, icons match the index groups', () => {
  const icons = Object.fromEntries(I.GROUPS.flatMap((g) => g.items));
  for (const p of PAGES.filter((x) => x.type === 'SERVICE')) {
    const m = menu.find((x) => x.url === p.url);
    assert.strictEqual(p.title, m.title.replace(/&amp;/g, '&'), p.url);
    assert.strictEqual(p.icon, icons[p.url.split('/')[3]], p.url);
  }
});

test('search pages: keywords are lowercase single words, at most 8 per page', () => {
  for (const p of PAGES) {
    assert.ok(p.keywords.length <= 8, p.title);
    for (const k of p.keywords) assert.match(k, /^[a-z0-9]+$/, p.title + ': ' + k);
  }
});

test('dist/btg.js carries the current page list (run tools/build-search-data.js)', () => {
  assert.deepStrictEqual(window.BTGSearch.PAGES, PAGES);
});

test('the real list: "slow computer" suggests Tune Up first; "wifi" suggests Networking', () => {
  assert.strictEqual(window.BTGSearch.rank('slow computer', PAGES)[0].title, 'Computer Tune Up');
  assert.strictEqual(window.BTGSearch.rank('wifi', PAGES)[0].title, 'Networking');
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/search.test.js`
Expected: FAIL — `Cannot find module '../tools/search-pages.js'`.

- [ ] **Step 3: Create `tools/search-pages.js`**

```js
// tools/search-pages.js — the pages search can suggest (spec 2026-09-27 header/logo/search).
// Keywords are everyday search words for the page's topic; they are never displayed.
// After editing, run: node tools/build-search-data.js
const B = 'https://bobthetechguy.com/';
const S = (slug, title, icon, keywords) => ({ title, url: B + slug + '/', type: 'SERVICE', icon, keywords });
const A = (slug, title) => ({ title, url: B + slug + '/', type: 'AREA', icon: 'pin', keywords: ['repair', 'computer', 'pc', 'near'] });
const P = (slug, title, icon, keywords) => ({ title, url: B + (slug ? slug + '/' : ''), type: 'PAGE', icon, keywords });
module.exports = [
  S('networking', 'Networking', 'wifi', ['wifi', 'router', 'internet', 'wireless', 'network', 'modem']),
  S('computer-set-up', 'Computer Set Up', 'laptop', ['new', 'setup', 'install', 'accounts', 'office']),
  S('computer-tune-up', 'Computer Tune Up', 'gauge', ['slow', 'speed', 'cleanup', 'maintenance', 'sluggish', 'dust']),
  S('anti-virus', 'Anti-Virus', 'shield', ['virus', 'malware', 'spyware', 'ransomware', 'infected', 'hacked']),
  S('backup-solutions', 'Backup Solutions', 'cloud', ['backup', 'cloud', 'files', 'restore']),
  S('data-recovery-service', 'Data Recovery Service', 'drive', ['recover', 'lost', 'deleted', 'files', 'crashed', 'drive']),
  S('software-installation-and-configuration', 'Software Installation and Configuration', 'box', ['software', 'programs', 'apps', 'office', 'install']),
  S('screen-replacement', 'Screen Replacement', 'screen', ['screen', 'cracked', 'broken', 'laptop', 'display']),
  S('parental-controls', 'Parental Controls', 'lock', ['kids', 'children', 'parental', 'filter', 'safety']),
  S('printer-solutions', 'Printer Solutions', 'printer', ['printer', 'printing', 'scanner']),
  S('operating-system-install', 'Operating System Install', 'window', ['windows', 'mac', 'linux', 'os', 'reinstall', 'upgrade']),
  S('hardware-repair-upgrades', 'Hardware Repair & Upgrades', 'tool', ['repair', 'fix', 'broken', 'upgrade', 'diagnostics']),
  S('hardware-install', 'Hardware Install', 'plug', ['graphics', 'card', 'drive', 'webcam', 'install']),
  S('memory-install', 'Memory Install', 'chip', ['ram', 'memory', 'slow', 'upgrade', 'speed']),
  S('email-setup', 'Email Setup', 'mail', ['email', 'outlook', 'mail', 'gmail']),
  A('best-computer-repair-chesterfield-va', 'Best Computer Repair Chesterfield VA'),
  A('pc-repair-service-bon-air-virginia', 'PC Repair Service Bon Air Virginia'),
  A('pc-repair-service-brandermill-virginia', 'PC Repair Service Brandermill Virginia'),
  A('pc-repair-service-chester-virginia', 'PC Repair Service Chester Virginia'),
  A('pc-repair-service-colonial-heights-virginia', 'PC Repair Service Colonial Heights Virginia'),
  A('pc-repair-service-midlothian-virginia', 'PC Repair Service Midlothian Virginia'),
  A('pc-repair-service-moseley-virginia', 'PC Repair Service Moseley Virginia'),
  A('pc-repair-service-richmond-virginia', 'PC Repair Service Richmond Virginia'),
  A('pc-repair-service-woodlake-virginia', 'PC Repair Service Woodlake Virginia'),
  P('', 'Home', 'page', ['home', 'bob']),
  P('about', 'About', 'page', ['bob', 'veteran', 'story', 'experience']),
  P('reviews', 'Reviews', 'page', ['reviews', 'rating', 'stars']),
  P('testimonials', 'Testimonials', 'page', ['customers', 'reviews']),
  P('contact-2', 'Contact', 'page', ['contact', 'email', 'phone', 'call', 'quote']),
];
```

- [ ] **Step 4: Create `tools/build-search-data.js`**

```js
// Copies tools/search-pages.js into dist/btg.js between the search-data markers.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../dist/btg.js');
const pages = require('./search-pages.js');
const src = fs.readFileSync(file, 'utf8');
const re = /(\/\* search-data:start \*\/\n)[\s\S]*?(\n\s*\/\* search-data:end \*\/)/;
if (!re.test(src)) throw new Error('search-data markers not found in dist/btg.js');
const body = '  var PAGES = [\n' + pages.map((p) => '    ' + JSON.stringify(p)).join(',\n') + '\n  ];';
fs.writeFileSync(file, src.replace(re, '$1' + body + '$2'));
console.log('wrote', pages.length, 'search pages into dist/btg.js');
```

- [ ] **Step 5: Build and run the tests**

Run: `node tools/build-search-data.js && node --test test/search.test.js`
Expected: `wrote 29 search pages into dist/btg.js`, then PASS.

- [ ] **Step 6: Commit**

```bash
git add tools/search-pages.js tools/build-search-data.js dist/btg.js test/search.test.js
git commit -m "Add the 29-page search list and its build step"
```

---

### Task 4: `BTGHeader` pure parts — logo, icon, menu grouping

**Files:**
- Modify: `dist/btg.js` (new `07-header.js` section after `06-search.js`)
- Test: `test/header.test.js` (create)

**Interfaces:**
- Consumes: `tools/services-index.js` `GROUPS` (test only, to keep the copy in `btg.js` equal).
- Produces: `window.BTGHeader.LOGO_SVG` (string), `window.BTGHeader.ICON_SVG` (string), `window.BTGHeader.GROUPS` (same shape as `services-index` GROUPS), `window.BTGHeader.groupLinks(links) -> [{ name, items: [{ href, text, icon }] }]` where `links = [{ href, text }]`, `window.BTGHeader.panelsHtml(groups) -> string`.

- [ ] **Step 1: Write the failing tests**

```js
// test/header.test.js — run: node --test test/header.test.js
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const H = window.BTGHeader;
const I = require('../tools/services-index.js');
const B = 'https://bobthetechguy.com/';

test('GROUPS in the bundle equal the Services index groups', () => {
  assert.deepStrictEqual(H.GROUPS, I.GROUPS);
});

test('LOGO_SVG: wordmark text, decorative to screen readers, pulsing pad class', () => {
  assert.match(H.LOGO_SVG, /^<svg class="btg-logo"[^>]*aria-hidden="true"[^>]*focusable="false"/);
  assert.match(H.LOGO_SVG, />BOB THE</);
  assert.match(H.LOGO_SVG, />Tech <tspan[^>]*>Guy<\/tspan></);
  assert.match(H.LOGO_SVG, /class="btg-logo-pad"/);
  assert.match(H.ICON_SVG, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
});

test('groupLinks() files menu links into the three groups in group order', () => {
  const links = [['networking', 'Networking'], ['memory-install', 'Memory Install'], ['computer-set-up', 'Computer Set Up']]
    .map(([s, t]) => ({ href: B + s + '/', text: t }));
  const g = H.groupLinks(links);
  assert.deepStrictEqual(g.map((x) => x.name), ['Repairs &amp; Upgrades', 'Setup &amp; Software', 'Security &amp; Networking']);
  assert.deepStrictEqual(g[0].items, [{ href: B + 'memory-install/', text: 'Memory Install', icon: 'chip' }]);
});

test('groupLinks() drops empty groups and puts unknown links in "More"', () => {
  const g = H.groupLinks([{ href: B + 'drone-repair/', text: 'Drone Repair' }, { href: B + 'networking/', text: 'Networking' }]);
  assert.deepStrictEqual(g.map((x) => x.name), ['Security &amp; Networking', 'More']);
  assert.deepStrictEqual(g[1].items, [{ href: B + 'drone-repair/', text: 'Drone Repair', icon: 'page' }]);
});

test('panelsHtml() escapes link text and uses the index panel classes', () => {
  const html = H.panelsHtml([{ name: 'More', items: [{ href: B + 'x/', text: 'A <b>&', icon: 'page' }] }]);
  assert.match(html, /^<div class="btg-panels"><section class="btg-panel"><h2 class="btg-panel-title">More<\/h2><ul class="btg-panel-list"><li><a class="btg-panel-link btg-card--page" href="https:\/\/bobthetechguy\.com\/x\/">A &lt;b&gt;&amp;<\/a><\/li><\/ul><\/section><\/div>$/);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `node --test test/header.test.js`
Expected: FAIL — `Cannot read properties of undefined (reading 'GROUPS')`.

- [ ] **Step 3: Implement** — insert into `dist/btg.js` right after the `06-search.js` section:

```js
/* 07-header.js */
window.BTGHeader = (function () {
  var LOGO_SVG = '<svg class="btg-logo" viewBox="0 0 212 66" width="176" height="55" aria-hidden="true" focusable="false">' +
    '<text x="4" y="24" font-family="Roboto Slab, Georgia, serif" font-size="14" letter-spacing="3.5" class="btg-logo-top">BOB THE</text>' +
    '<text x="2" y="51" font-family="Roboto Slab, Georgia, serif" font-weight="700" font-size="30" class="btg-logo-main">Tech <tspan class="btg-logo-accent">Guy</tspan></text>' +
    '<path d="M4 60h122l8-8h58" fill="none" stroke="#54aa47" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle class="btg-logo-pad" cx="197" cy="52" r="5" fill="#54aa47"/>' +
    '<circle cx="197" cy="52" r="9.5" fill="none" stroke="#54aa47" stroke-opacity=".35" stroke-width="2"/></svg>';
  var ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1c201b"/>' +
    '<text x="15" y="44" font-family="Georgia, serif" font-weight="700" font-size="34" fill="#fff">B</text>' +
    '<path d="M13 53h24l5-5h9" fill="none" stroke="#6ec95f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="52" cy="48" r="4" fill="#6ec95f"/></svg>';
  // Keep equal to tools/services-index.js GROUPS (test/header.test.js enforces it).
  var GROUPS = [
    { name: 'Repairs &amp; Upgrades', items: [['hardware-repair-upgrades', 'tool'], ['screen-replacement', 'screen'], ['memory-install', 'chip'], ['hardware-install', 'plug'], ['computer-tune-up', 'gauge'], ['data-recovery-service', 'drive']] },
    { name: 'Setup &amp; Software', items: [['computer-set-up', 'laptop'], ['operating-system-install', 'window'], ['software-installation-and-configuration', 'box'], ['printer-solutions', 'printer'], ['email-setup', 'mail']] },
    { name: 'Security &amp; Networking', items: [['networking', 'wifi'], ['anti-virus', 'shield'], ['backup-solutions', 'cloud'], ['parental-controls', 'lock']] }
  ];

  function slugOf(href) { var m = /\/([a-z0-9-]+)\/?$/.exec(href || ''); return m ? m[1] : ''; }

  function groupLinks(links) {
    var used = [];
    var out = GROUPS.map(function (g) {
      var items = [];
      g.items.forEach(function (it) {
        links.forEach(function (l) {
          if (slugOf(l.href) === it[0] && used.indexOf(l) === -1) { used.push(l); items.push({ href: l.href, text: l.text, icon: it[1] }); }
        });
      });
      return { name: g.name, items: items };
    }).filter(function (g) { return g.items.length; });
    var more = links.filter(function (l) { return used.indexOf(l) === -1; }).map(function (l) { return { href: l.href, text: l.text, icon: 'page' }; });
    if (more.length) out.push({ name: 'More', items: more });
    return out;
  }

  function panelsHtml(groups) {
    var esc = window.BTGSearch.esc;
    return '<div class="btg-panels">' + groups.map(function (g) {
      return '<section class="btg-panel"><h2 class="btg-panel-title">' + g.name + '</h2><ul class="btg-panel-list">' +
        g.items.map(function (i) { return '<li><a class="btg-panel-link btg-card--' + i.icon + '" href="' + esc(i.href) + '">' + esc(i.text) + '</a></li>'; }).join('') +
        '</ul></section>';
    }).join('') + '</div>';
  }

  return { LOGO_SVG: LOGO_SVG, ICON_SVG: ICON_SVG, GROUPS: GROUPS, groupLinks: groupLinks, panelsHtml: panelsHtml };
})();

```

- [ ] **Step 4: Run the tests**

Run: `node --test test/header.test.js test/search.test.js test/v1.0.7.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add dist/btg.js test/header.test.js
git commit -m "Add BTGHeader pure parts: wordmark and icon SVG, menu grouping, panel markup"
```

---

### Task 5: Styles v1.3.0 — top bar, header, dropdown, search, icons

**Files:**
- Modify: `dist/btg.css` (append)
- Test: `test/v1.3.0.test.js` (create)

**Interfaces:**
- Consumes: class names from Tasks 2–4 and Task 6: `html.btg-header-on`, `.btg-logo`, `.btg-logo-pad`, `.btg-header-tools`, `.btg-search-btn`, `.btg-call`, `.btg-dropdown`, `.btg-has-panel`, `.btg-scrolled`, `.btg-search`, `.btg-search-input`, `.btg-search-list`, `.btg-search-opt`, `.btg-search-all`, `.btg-search-empty`, `.btg-search-ico`, `.is-active`; icons `pin`, `page`.

- [ ] **Step 1: Write the failing test**

```js
// test/v1.3.0.test.js — run: node --test test/v1.3.0.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../dist/btg.css'), 'utf8');
const v13 = css.slice(css.indexOf('/* v1.3.0'));

test('top bar: one font on every page, old per-page strip replaced', () => {
  assert.ok(v13.length > 100, 'v1.3.0 block missing');
  assert.match(v13, /\.fusion-secondary-header \.fusion-contact-info,\s*\.fusion-secondary-header \.fusion-contact-info a \{[^}]*font-family: var\(--btg-font-body\) !important;[^}]*font-size: 12\.5px !important;[^}]*font-weight: 700 !important;/);
  assert.match(v13, /html \.fusion-header-wrapper::before,\s*html \.fusion-header-wrapper:before \{ display: none !important; \}/);
  assert.match(v13, /\.fusion-secondary-header \.fusion-row::before \{[^}]*content: "NOW SERVING CHESTERFIELD/);
});

test('header row, dropdown, search and call button styles exist', () => {
  for (const sel of ['.btg-header-on .fusion-header .fusion-row', '.btg-header-tools', '.btg-call', '.btg-search-btn', '.btg-dropdown', '.btg-search', '.btg-search-list', '.btg-search-opt.is-active', '.btg-scrolled']) {
    assert.ok(v13.includes(sel), sel);
  }
  assert.match(v13, /\.btg-header-on li\.btg-has-panel > \.sub-menu \{ display: none !important; \}/);
  assert.match(v13, /\.btg-header-on \.fusion-main-menu-search \{ display: none !important; \}/);
});

test('reduced motion stops the pulse, trace and shrink transitions', () => {
  const rm = v13.slice(v13.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(rm, /\.btg-logo-pad \{ animation: none; \}/);
  assert.match(rm, /transition: none/);
});

test('icons exist for towns (pin) and pages (page)', () => {
  assert.match(css, /\.btg-card--pin::before \{/);
  assert.match(css, /\.btg-card--page::before \{/);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test test/v1.3.0.test.js`
Expected: FAIL — "v1.3.0 block missing".

- [ ] **Step 3: Append to `dist/btg.css`**

```css

/* v1.3.0 — consistent top bar, one-row header, Services dropdown, search.
   Spec: docs/superpowers/specs/2026-09-27-header-logo-search-design.md */
html .fusion-header-wrapper::before,
html .fusion-header-wrapper:before { display: none !important; }
.fusion-secondary-header { background: #20241f !important; border: 0 !important; padding: 0 !important; }
.fusion-secondary-header .fusion-row { display: flex !important; align-items: center; justify-content: space-between; gap: 16px; max-width: 1180px; margin: 0 auto; padding: 7px 24px !important; }
.fusion-secondary-header .fusion-row::before { content: "NOW SERVING CHESTERFIELD \00B7 MIDLOTHIAN \00B7 CHESTER \00B7 BON AIR \00B7 COLONIAL HEIGHTS \00B7 GREATER RICHMOND, VA"; display: block; color: #e8efe6; font-family: var(--btg-font-body); font-size: 12.5px; font-weight: 700; letter-spacing: .04em; line-height: 1.4; }
.fusion-secondary-header .fusion-row::after { display: none !important; }
.fusion-secondary-header .fusion-alignleft { float: none !important; margin: 0 !important; }
.fusion-secondary-header .fusion-contact-info,
.fusion-secondary-header .fusion-contact-info a { font-family: var(--btg-font-body) !important; font-size: 12.5px !important; font-weight: 700 !important; letter-spacing: .04em !important; line-height: 1.4 !important; color: #e8efe6 !important; }
@media (max-width: 900px) {
  .fusion-secondary-header .fusion-row { justify-content: center; }
  .fusion-secondary-header .fusion-row::before { display: none; }
}

.btg-header-on .fusion-header-wrapper { position: sticky; z-index: 60; }
.btg-header-on .fusion-header { position: relative; background: rgba(255, 255, 255, .97) !important; border-bottom: 1px solid var(--btg-card-border); transition: box-shadow .25s ease; }
.btg-header-on .fusion-header .fusion-row { display: flex !important; align-items: center; gap: 24px; max-width: 1180px; margin: 0 auto; padding: 14px 24px !important; transition: padding .25s ease; }
.btg-header-on .fusion-header .fusion-row::before,
.btg-header-on .fusion-header .fusion-row::after { display: none !important; }
.btg-header-on .fusion-logo { float: none !important; margin: 0 !important; flex: none; }
.btg-header-on .fusion-logo-link { display: block; line-height: 0; }
.btg-logo { display: block; width: 176px; height: auto; transition: width .25s ease; }
.btg-logo-top { fill: #4a5046; }
.btg-logo-main { fill: var(--btg-text); }
.btg-logo-accent { fill: #38792f; }
.btg-logo-pad { animation: btg-pulse 2.4s ease-in-out infinite; }
@keyframes btg-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
.btg-header-on .fusion-secondary-main-menu { display: none !important; }
.btg-header-on .fusion-header .fusion-main-menu { float: none !important; flex: 1; display: flex; justify-content: center; }
.btg-header-on .fusion-main-menu > ul { display: flex !important; gap: 4px; }
.btg-header-on .fusion-main-menu > ul > li { position: static; padding: 0 !important; }
.btg-header-on .fusion-main-menu > ul > li > a { position: relative; display: block; padding: 10px 12px !important; height: auto !important; line-height: 1.4 !important; border: 0 !important; color: var(--btg-text) !important; font-size: 15.5px !important; background: none !important; border-radius: 6px; }
.btg-header-on .fusion-main-menu > ul > li > a::after { content: ""; position: absolute; left: 12px; right: 12px; bottom: 4px; height: 2px; border-radius: 2px; background: var(--btg-green); transform: scaleX(0); transform-origin: left; transition: transform .28s ease; }
.btg-header-on .fusion-main-menu > ul > li > a:hover::after,
.btg-header-on .fusion-main-menu > ul > li > a:focus-visible::after { transform: scaleX(1); }
.btg-header-on .fusion-main-menu > ul > li.current-menu-item > a,
.btg-header-on .fusion-main-menu > ul > li.current-menu-ancestor > a { color: #38792f !important; font-weight: 700 !important; }
.btg-header-on .fusion-main-menu > ul > li.current-menu-item > a::after,
.btg-header-on .fusion-main-menu > ul > li.current-menu-ancestor > a::after { transform: scaleX(1); height: 3px; box-shadow: 0 0 10px rgba(84, 170, 71, .75); }
.btg-header-on .fusion-main-menu > ul > li.menu-item-11810 > a { background: none !important; color: var(--btg-text) !important; margin: 0 !important; box-shadow: none !important; }
.btg-header-on .fusion-main-menu > ul > li.menu-item-11810 > a .menu-text { color: inherit !important; }
.btg-header-on .fusion-main-menu-search { display: none !important; }
.btg-header-on li.btg-has-panel > .sub-menu { display: none !important; }
.btg-header-tools { display: flex; align-items: center; gap: 12px; margin-left: auto; flex: none; }
.btg-search-btn { width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid var(--btg-card-border); background: #fff; display: grid; place-items: center; cursor: pointer; transition: border-color .2s, box-shadow .2s; padding: 0; }
.btg-search-btn:hover,
.btg-search-btn:focus-visible { border-color: var(--btg-green); box-shadow: 0 0 0 4px var(--btg-green-tint); outline: none; }
.btg-call { display: flex; flex-direction: column; align-items: center; background: #3a7f30; color: #fff !important; text-decoration: none !important; border-radius: 8px; padding: 7px 16px; font-family: var(--btg-font-body); font-weight: 700; font-size: 14.5px; line-height: 1.2; transition: transform .18s, box-shadow .18s; }
.btg-call small { font-weight: 400; font-size: 11.5px; opacity: .85; }
.btg-call:hover,
.btg-call:focus-visible { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(84, 170, 71, .45); }
.btg-dropdown { position: absolute; left: 0; right: 0; top: 100%; background: #fff; border-bottom: 1px solid var(--btg-card-border); box-shadow: 0 18px 30px rgba(20, 30, 20, .10); padding: 18px 24px 22px; }
.btg-dropdown[hidden] { display: none; }
.btg-dropdown .btg-panels { max-width: 1132px; margin: 0 auto; }
.btg-scrolled .fusion-header { box-shadow: 0 6px 20px rgba(20, 30, 20, .08); }
.btg-scrolled .fusion-header .fusion-row { padding-top: 8px !important; padding-bottom: 8px !important; }
.btg-scrolled .btg-logo { width: 148px; }
.btg-search { position: absolute; left: 0; right: 0; top: 100%; background: #fff; border-bottom: 1px solid var(--btg-card-border); box-shadow: 0 18px 30px rgba(20, 30, 20, .10); padding: 18px 24px 22px; }
.btg-search[hidden] { display: none; }
.btg-search-form { max-width: 720px; margin: 0 auto; }
.btg-search-input { width: 100%; box-sizing: border-box; font: inherit; font-size: 18px !important; padding: 12px 16px 12px 44px !important; border: 2px solid var(--btg-green) !important; border-radius: 10px !important; outline: none; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='M20 20l-3.5-3.5'/%3E%3C/svg%3E") 14px center / 20px no-repeat !important; box-shadow: 0 0 0 4px var(--btg-green-tint); height: auto !important; }
.btg-search-list { list-style: none; margin: 10px 0 0 !important; padding: 0 !important; border: 1px solid var(--btg-card-border); border-radius: 10px; overflow: hidden; }
.btg-search-list[hidden] { display: none; }
.btg-search-list li { display: flex; align-items: center; gap: 10px; padding: 10px 14px; margin: 0 !important; border-bottom: 1px solid var(--btg-card-border); font-size: 15.5px; cursor: pointer; }
.btg-search-list li:last-child { border-bottom: 0; }
.btg-search-opt.is-active,
.btg-search-all.is-active,
.btg-search-list li:hover { background: var(--btg-green-tint); }
.btg-search-type { margin-left: auto; font-size: 11px; letter-spacing: .12em; color: #6b736a; }
.btg-search-all { color: #38792f; font-weight: 700; }
.btg-search-empty { color: var(--btg-text-muted); cursor: default !important; }
.btg-search-ico { width: 28px; height: 28px; border-radius: 6px; background: var(--btg-green-tint); flex: none; }
.btg-search-ico::before { content: ""; display: block; width: 28px; height: 28px; background-position: center; background-size: 16px; background-repeat: no-repeat; }
.btg-card--pin::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z'/%3E%3Ccircle cx='12' cy='10' r='2.5'/%3E%3C/svg%3E"); }
.btg-card--page::before { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2338792f' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 3h9l4 4v14H6z'/%3E%3Cpath d='M9 12h7M9 16h7'/%3E%3C/svg%3E"); }
@media (max-width: 900px) {
  .btg-header-on .fusion-header .fusion-main-menu { display: none !important; }
  .btg-header-on .fusion-header .fusion-row { gap: 12px; padding: 10px 16px !important; }
  .btg-logo { width: 150px; }
  .btg-call { padding: 7px 12px; font-size: 14px; }
  .btg-call small { display: none; }
  .btg-header-on .fusion-mobile-menu-icons { display: flex !important; float: none !important; margin: 0 !important; }
}
@media (prefers-reduced-motion: reduce) {
  .btg-logo-pad { animation: none; }
  .btg-logo, .btg-header-on .fusion-header, .btg-header-on .fusion-header .fusion-row,
  .btg-header-on .fusion-main-menu > ul > li > a::after, .btg-call, .btg-search-btn { transition: none; }
}
```

- [ ] **Step 4: Run all unit tests**

Run: the Global Constraints unit test command.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add dist/btg.css test/v1.3.0.test.js
git commit -m "v1.3.0 styles: consistent top bar, one-row header, dropdown, search, pin/page icons"
```

---

### Task 6: Header and search DOM glue, browser tests, visual tuning

**Files:**
- Modify: `dist/btg.js` (`BTGHeader.init`, `BTGSearch.init`, calls in `run()`)
- Create: `test/e2e/header.e2e.mjs`

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: `window.BTGHeader.init(doc, win) -> boolean`, `window.BTGSearch.init(doc, win) -> boolean`; `html.btg-header-on` class when the header was enhanced.

- [ ] **Step 1: Write the failing browser test** — create `test/e2e/header.e2e.mjs`:

```js
// Browser tests for the v1.3.0 header. Run: node test/e2e/header.e2e.mjs
import assert from 'node:assert';
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4410);
const results = [];
const check = (name, ok, info = '') => { results.push([name, ok, info]); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

// Desktop
let b = await launch({ width: 1440, height: 900 });
await b.goto('http://localhost:4410/memory-install/');
check('header enhanced', await b.evalJs(`document.documentElement.classList.contains('btg-header-on')`));
check('old logo images gone, one wordmark', await b.evalJs(`!document.querySelector('.fusion-logo img') && document.querySelectorAll('.fusion-logo .btg-logo').length === 1`));
check('logo link names the site', await b.evalJs(`document.querySelector('.fusion-logo-link').getAttribute('aria-label') === 'Bob The Tech Guy — home'`));
check('favicon added', await b.evalJs(`!!document.querySelector('link[rel="icon"][href^="data:image/svg+xml"]')`));
check('one row: logo, menu, tools share a top', await b.evalJs(`(() => { const t = (s) => Math.round(document.querySelector(s).getBoundingClientRect().top / 20); return t('.fusion-logo') === t('.fusion-main-menu') && t('.fusion-main-menu') === t('.btg-header-tools'); })()`));
check('theme search item hidden', await b.evalJs(`getComputedStyle(document.querySelector('.fusion-main-menu-search')).display === 'none'`));
const svc = await b.evalJs(`(() => { const r = document.querySelector('li.btg-has-panel > a').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
await b.move(svc[0], svc[1]); await b.sleep(500);
check('hover opens Services panel with 15 links', await b.evalJs(`!document.querySelector('.btg-dropdown').hidden && document.querySelectorAll('.btg-dropdown .btg-panel-link').length === 15`));
check('theme submenu not visible', await b.evalJs(`[...document.querySelectorAll('li.btg-has-panel > .sub-menu')].every((u) => getComputedStyle(u).display === 'none')`));
await b.shot(out + '/dropdown.png');
await b.move(700, 700); await b.sleep(500);
check('leaving closes the panel', await b.evalJs(`document.querySelector('.btg-dropdown').hidden`));
await b.evalJs(`document.querySelector('li.btg-has-panel > a').focus()`); await b.sleep(250);
check('keyboard focus opens the panel', await b.evalJs(`!document.querySelector('.btg-dropdown').hidden && document.querySelector('li.btg-has-panel > a').getAttribute('aria-expanded') === 'true'`));
await b.key('Escape', 'Escape', 27); await b.sleep(200);
check('Escape closes the panel and keeps focus on Services', await b.evalJs(`document.querySelector('.btg-dropdown').hidden && document.activeElement === document.querySelector('li.btg-has-panel > a')`));
await b.evalJs(`document.activeElement.blur()`);
await b.key('/', 'Slash', 191, '/'); await b.sleep(200);
check('"/" opens search with focus in the field', await b.evalJs(`!document.querySelector('.btg-search').hidden && document.activeElement === document.querySelector('.btg-search-input')`));
await b.type('slow computer'); await b.sleep(200);
check('suggestions: Tune Up first + "Search all" row', await b.evalJs(`(() => { const o = [...document.querySelectorAll('.btg-search-opt .btg-search-title')].map((e) => e.textContent); return o[0] === 'Computer Tune Up' && !!document.querySelector('.btg-search-all'); })()`));
check('combobox ARIA', await b.evalJs(`(() => { const i = document.querySelector('.btg-search-input'); return i.getAttribute('role') === 'combobox' && i.getAttribute('aria-expanded') === 'true' && document.querySelector('#btg-search-list').getAttribute('role') === 'listbox'; })()`));
await b.shot(out + '/search.png');
await b.key('ArrowDown', 'ArrowDown', 40); await b.sleep(100);
check('ArrowDown highlights the first suggestion', await b.evalJs(`document.querySelector('.btg-search-input').getAttribute('aria-activedescendant') === 'btg-opt-0'`));
await b.key('Enter', 'Enter', 13, String.fromCharCode(13)); await b.sleep(1500);
check('Enter opens the suggested page', await b.evalJs(`location.href`).then((h) => /computer-tune-up/.test(h)), await b.evalJs('location.href'));
await b.goto('http://localhost:4410/memory-install/');
await b.evalJs(`scrollTo(0, 900)`); await b.sleep(600);
check('sticky: header pinned at top after scroll, scrolled class set', await b.evalJs(`(() => { const r = document.querySelector('.fusion-header').getBoundingClientRect(); return Math.abs(r.top) <= 2 && document.querySelector('.fusion-header-wrapper').classList.contains('btg-scrolled'); })()`));
check('only one visible header row', await b.evalJs(`[...document.querySelectorAll('.fusion-header')].filter((h) => h.getBoundingClientRect().height > 0 && getComputedStyle(h).visibility !== 'hidden').length === 1`));
await b.shot(out + '/scrolled.png');
check('no horizontal scroll (desktop)', !(await b.evalJs(`document.documentElement.scrollWidth > innerWidth`)));
await b.evalJs(`scrollTo(0, 0)`); await b.sleep(300); await b.shot(out + '/desktop.png');
await b.close();

// Phone
b = await launch({ width: 390, height: 844, mobile: true });
await b.goto('http://localhost:4410/memory-install/');
check('phone: menu hidden, tools visible', await b.evalJs(`getComputedStyle(document.querySelector('.fusion-header .fusion-main-menu')).display === 'none' && document.querySelector('.btg-call').getBoundingClientRect().width > 0`));
check('phone: no horizontal scroll', !(await b.evalJs(`document.documentElement.scrollWidth > innerWidth`)));
await b.shot(out + '/phone.png');
const mb = await b.evalJs(`(() => { const e = document.querySelector('.fusion-mobile-menu-icons a, .fusion-mobile-menu-icons button'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
if (mb) { await b.click(mb[0], mb[1]); await b.sleep(800); }
check('phone: theme mobile menu opens', await b.evalJs(`(() => { const n = document.querySelector('.fusion-mobile-nav-holder, .fusion-mobile-navigation'); return !!n && n.getBoundingClientRect().height > 50; })()`));
await b.shot(out + '/phone-menu.png');
await b.close();

server.close();
const failed = results.filter((r) => !r[1]);
console.log(`\n${results.length - failed.length}/${results.length} passed; screenshots in ${out}`);
process.exit(failed.length ? 1 : 0);
```

- [ ] **Step 2: Run to verify it fails**

Run: `node test/e2e/header.e2e.mjs`
Expected: FAIL on "header enhanced" (no `init` yet); most checks fail.

- [ ] **Step 3: Implement `BTGSearch.init`** — in `06-search.js`, add before `return { PAGES: … }` and export `init`:

```js
  var SEARCH_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38792f" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  function init(doc, win) {
    var btn = doc.querySelector('.btg-search-btn'), header = doc.querySelector('.fusion-header');
    if (!btn || !header || doc.querySelector('.btg-search')) return false;
    var box = doc.createElement('div');
    box.className = 'btg-search';
    box.hidden = true;
    box.innerHTML = '<form class="btg-search-form" role="search" action="/" method="get">' +
      '<input id="btg-search-input" class="btg-search-input" type="search" name="s" placeholder="Search" aria-label="Search" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="btg-search-list" aria-autocomplete="list">' +
      '<ul id="btg-search-list" class="btg-search-list" role="listbox" hidden></ul></form>';
    header.appendChild(box);
    var input = box.querySelector('input'), list = box.querySelector('ul'), form = box.querySelector('form'), active = -1;

    function options() { return list.querySelectorAll('[role=option]'); }
    function openBox() { box.hidden = false; btn.setAttribute('aria-expanded', 'true'); input.focus(); }
    function closeBox() { box.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    function render() {
      var q = input.value, items = rank(q, PAGES, 5);
      active = -1;
      input.removeAttribute('aria-activedescendant');
      if (norm(q).length < 2) { list.hidden = true; list.innerHTML = ''; input.setAttribute('aria-expanded', 'false'); return; }
      var html = items.map(function (p, i) {
        return '<li role="option" id="btg-opt-' + i + '" class="btg-search-opt" data-url="' + esc(p.url) + '">' +
          '<span class="btg-search-ico btg-card--' + p.icon + '" aria-hidden="true"></span>' +
          '<span class="btg-search-title">' + esc(p.title) + '</span><span class="btg-search-type">' + p.type + '</span></li>';
      }).join('');
      if (!items.length) html += '<li class="btg-search-empty" role="presentation">No matching pages. Press Enter to search the whole site.</li>';
      html += '<li role="option" id="btg-opt-all" class="btg-search-all">Search all pages for "' + esc(q) + '" &rarr;</li>';
      list.innerHTML = html;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }
    function highlight(i) {
      var o = options();
      if (!o.length) return;
      active = (i + o.length) % o.length;
      for (var k = 0; k < o.length; k++) o[k].classList.toggle('is-active', k === active);
      input.setAttribute('aria-activedescendant', o[active].id);
    }
    function go(el) {
      if (!el || el.id === 'btg-opt-all') form.submit();
      else win.location.href = el.getAttribute('data-url');
    }
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); go(active >= 0 ? options()[active] : null); }
      else if (e.key === 'Escape') { e.preventDefault(); closeBox(); }
    });
    list.addEventListener('mousedown', function (e) {
      var el = e.target.closest('[role=option]');
      if (el) { e.preventDefault(); go(el); }
    });
    btn.addEventListener('click', function () { if (box.hidden) openBox(); else closeBox(); });
    doc.addEventListener('keydown', function (e) {
      var a = doc.activeElement;
      if (e.key !== '/' || (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable))) return;
      e.preventDefault();
      openBox();
    });
    return true;
  }
```

Change its return to `return { PAGES: PAGES, norm: norm, esc: esc, rank: rank, init: init, SEARCH_ICON: SEARCH_ICON };`.

- [ ] **Step 4: Implement `BTGHeader.init`** — in `07-header.js`, add before its `return` and export `init`:

```js
  function buildDropdown(doc, nav, header) {
    var svc = nav && nav.querySelector('a[href$="/services-2/"]');
    if (!svc) return;
    var li = svc.closest('li');
    var links = [].map.call(li.querySelectorAll('.sub-menu a'), function (a) { return { href: a.href, text: a.textContent.trim() }; });
    if (!links.length) return;
    var panel = doc.createElement('div');
    panel.className = 'btg-dropdown';
    panel.id = 'btg-services-panel';
    panel.hidden = true;
    panel.innerHTML = panelsHtml(groupLinks(links));
    li.classList.add('btg-has-panel');
    li.appendChild(panel);
    svc.setAttribute('aria-expanded', 'false');
    svc.setAttribute('aria-controls', panel.id);
    var t;
    function open() { clearTimeout(t); panel.hidden = false; svc.setAttribute('aria-expanded', 'true'); }
    function close() { clearTimeout(t); panel.hidden = true; svc.setAttribute('aria-expanded', 'false'); }
    function later(fn) { clearTimeout(t); t = setTimeout(fn, 150); }
    li.addEventListener('mouseenter', function () { later(open); });
    li.addEventListener('mouseleave', function () { later(close); });
    svc.addEventListener('focus', open);
    li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) close(); });
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); close(); svc.focus(); }
    });
  }

  function init(doc, win) {
    var header = doc.querySelector('.fusion-header');
    if (!header || header.getAttribute('data-btg-header')) return false;
    header.setAttribute('data-btg-header', '1');
    var row = header.querySelector('.fusion-row') || header;

    var logo = header.querySelector('.fusion-logo-link');
    if (logo) {
      [].forEach.call(logo.querySelectorAll('img'), function (i) { i.parentNode.removeChild(i); });
      logo.insertAdjacentHTML('afterbegin', LOGO_SVG);
      logo.setAttribute('aria-label', 'Bob The Tech Guy — home');
    }
    if (doc.head) {
      var icon = doc.createElement('link');
      icon.rel = 'icon';
      icon.type = 'image/svg+xml';
      icon.href = 'data:image/svg+xml,' + encodeURIComponent(ICON_SVG);
      doc.head.appendChild(icon);
    }

    var nav = doc.querySelector('.fusion-secondary-main-menu nav.fusion-main-menu') || doc.querySelector('nav.fusion-main-menu');
    if (nav) row.appendChild(nav);
    var tools = doc.createElement('div');
    tools.className = 'btg-header-tools';
    tools.innerHTML = '<button type="button" class="btg-search-btn" aria-label="Search" aria-expanded="false">' + window.BTGSearch.SEARCH_ICON + '</button>' +
      '<a class="btg-call" href="tel:8448354890">844-TEKGUY-0<small>(844) 835-4890</small></a>';
    row.appendChild(tools);
    var mob = header.querySelector('.fusion-mobile-menu-icons');
    if (mob) tools.appendChild(mob);
    buildDropdown(doc, nav, header);

    var wrapper = doc.querySelector('.fusion-header-wrapper');
    if (wrapper) {
      // Stick the main header row; let the top bar above it scroll away.
      wrapper.style.top = -(header.getBoundingClientRect().top - wrapper.getBoundingClientRect().top) + 'px';
      var onScroll = function () { wrapper.classList.toggle('btg-scrolled', (win.pageYOffset || 0) > 80); };
      win.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    doc.documentElement.classList.add('btg-header-on');
    return true;
  }
```

Change its return to `return { LOGO_SVG: LOGO_SVG, ICON_SVG: ICON_SVG, GROUPS: GROUPS, groupLinks: groupLinks, panelsHtml: panelsHtml, init: init };`.

In `run()` add, after `window.BTGInit.injectSchemaAndMeta(document, window);`:

```js
    window.BTGHeader.init(document, window);
    window.BTGSearch.init(document, window);
```

- [ ] **Step 5: Run unit tests, then the browser test**

Run: the unit test command, then `node test/e2e/header.e2e.mjs`
Expected: unit PASS; browser `N/N passed`. For each FAIL: open the matching screenshot in `%TEMP%/btg-e2e`, find the cause (Avada's own CSS/JS usually — e.g. its sticky script cloning the header, or menu `li` positioning) with superpowers:systematic-debugging, fix in `btg.css`/`btg.js`, re-run. Record every theme quirk you work around as a ledger Ruling.

- [ ] **Step 6: Visual review against the approved mockup** — read `desktop.png`, `dropdown.png`, `search.png`, `scrolled.png`, `phone.png`, `phone-menu.png` and compare with `.superpowers/preview/ha-*.png` (approved header A). Tune spacing/sizes in the v1.3.0 CSS block until they match; re-run Step 5 after each change. Send the six screenshots to the user.

- [ ] **Step 7: Top-bar consistency (local)**

Run: `node test/e2e/serve.mjs 4410` in the background, then `node test/e2e/topbar.mjs http://localhost:4410`
Expected: the four pages report identical `family`/`size`/`weight`. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add dist/btg.js dist/btg.css test/e2e/header.e2e.mjs
git commit -m "v1.3.0: header enhancement (logo, one row, tools, Services dropdown, sticky) and search panel"
```

---

### Task 7: Tag v1.3.0 (live gate: ask the user first)

**Files:** none.

- [ ] **Step 1: Full unit suite + browser test green**

Run: the unit test command and `node test/e2e/header.e2e.mjs`
Expected: all pass.

- [ ] **Step 2: Tag and push**

```bash
git tag v1.3.0 && git push -u origin header-logo-search --tags
for f in dist/btg.css dist/btg.js; do curl -s -o /dev/null -w "%{http_code} $f\n" https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.3.0/$f; done
```

Expected: `200` twice.

---

### Task 8: Memory Install first (live gate), then all pages

**Files:** none (plus memory).

- [ ] **Step 1: Point Memory Install at v1.3.0** — in the signed-in WordPress tab (`/wp-admin/profile.php`):

```js
const n = await fetch('/wp-admin/admin-ajax.php?action=rest-nonce').then((r) => r.text());
const H = { 'X-WP-Nonce': n, 'Content-Type': 'application/json' };
window.__pin = async (items, write) => { const out = [];
  for (const [type, id] of items) {
    const u = `/wp-json/wp/v2/${type}/${id}?context=edit&_fields=content`;
    const b = (await fetch(u, { headers: H }).then((r) => r.json())).content.raw;
    const a = b.replace(/bob-the-tech-guy-site@v1\.\d+\.\d+\//g, 'bob-the-tech-guy-site@v1.3.0/');
    if (a === b) { out.push(`${id} already`); continue; }
    if (!write) { out.push(`${id} would pin`); continue; }
    const r = await fetch(u, { method: 'POST', headers: H, body: JSON.stringify({ content: a }) });
    out.push(`${id} HTTP ${r.status} saved=${r.ok && (await r.json()).content.raw === a}`);
  } return out.join(' | '); };
await window.__pin([['pages', 11978]], true)
```

Expected: `11978 HTTP 200 saved=true`.

- [ ] **Step 2: Check live + screenshots** — `node test/e2e/topbar.mjs https://bobthetechguy.com` (Memory Install now matches the new font; the others still old), plus headless screenshots of `https://bobthetechguy.com/memory-install/` at 1440 (default, Services hovered, search open) and phone 390. Send them to the user and ask to continue.

- [ ] **Step 3: The other 30 pages (live gate)**

```js
await window.__pin([
  ['pages', 2318], ['pages', 2], ['pages', 11653], ['pages', 12166], ['pages', 11802], ['pages', 11649], ['pages', 3754],
  ['pages', 11981], ['pages', 11804], ['pages', 11863], ['pages', 11976], ['pages', 11971], ['pages', 11857],
  ['pages', 11806], ['pages', 11867], ['pages', 11869], ['pages', 11973], ['pages', 11861], ['pages', 11859], ['pages', 11853], ['pages', 11855],
  ['posts', 28867], ['posts', 28872], ['posts', 28873], ['posts', 28874], ['posts', 28875], ['posts', 28876], ['posts', 28877], ['posts', 28878], ['posts', 28879]
], true)
```

Expected: 30 × `HTTP 200 saved=true`.

- [ ] **Step 4: Verify all 31 publicly**

```bash
for s in / about/ services-2/ contact-2/ gallery/ reviews/ testimonials/ networking/ anti-virus/ backup-solutions/ hardware-repair-upgrades/ email-setup/ parental-controls/ computer-set-up/ computer-tune-up/ data-recovery-service/ hardware-install/ memory-install/ operating-system-install/ printer-solutions/ screen-replacement/ software-installation-and-configuration/ best-computer-repair-chesterfield-va/ pc-repair-service-bon-air-virginia/ pc-repair-service-brandermill-virginia/ pc-repair-service-chester-virginia/ pc-repair-service-colonial-heights-virginia/ pc-repair-service-midlothian-virginia/ pc-repair-service-moseley-virginia/ pc-repair-service-richmond-virginia/ pc-repair-service-woodlake-virginia/; do
  printf "%-46s %s\n" "/$s" "$(curl -sk --max-time 30 "https://bobthetechguy.com/$s?v=$RANDOM$RANDOM" | grep -o 'site@v[0-9.]*' | sort -u | tr '\n' ' ')"
done
node test/e2e/topbar.mjs https://bobthetechguy.com
```

Expected: all 31 `site@v1.3.0` only; the four pages' top-bar fonts identical.

- [ ] **Step 5: Final review, merge, memory** — one fresh reviewer (most capable model) over the branch diff with this plan's Review Focus; fix Critical/Important test-first; ask the user before merging to main and pushing. Update `C:\Users\there\.claude\projects\C--Users-there\memory\bob-website-client.md`: v1.3.0 live (new header/logo/search on 31 pages; NJ pages keep old header).
