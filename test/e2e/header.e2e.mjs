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
await b.stub('*bobthetechguy.com/computer-tune-up/*', '<html><body>stub</body></html>');
await b.key('Enter', 'Enter', 13, String.fromCharCode(13)); await b.sleep(1500);
check('Enter opens the suggested page', await b.evalJs(`location.href`).then((h) => /computer-tune-up/.test(h)), await b.evalJs('location.href'));
await b.goto('http://localhost:4410/memory-install/');
// Scroll, then fire the scroll event itself: headless tabs deliver scroll events late while the live theme assets load.
await b.evalJs(`(async () => { for (let i = 0; i < 40 && scrollY < 800; i++) { scrollTo(0, 900); await new Promise((r) => setTimeout(r, 150)); } dispatchEvent(new Event('scroll')); })()`);
await b.sleep(600);
check('sticky: header pinned at top after scroll, scrolled class set', await b.evalJs(`(() => { const r = document.querySelector('.fusion-header').getBoundingClientRect(); return Math.abs(r.top) <= 2 && document.querySelector('.fusion-header-wrapper').classList.contains('btg-scrolled'); })()`), await b.evalJs(`JSON.stringify([Math.round(document.querySelector('.fusion-header').getBoundingClientRect().top), scrollY, document.querySelector('.fusion-header-wrapper').className])`));
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
