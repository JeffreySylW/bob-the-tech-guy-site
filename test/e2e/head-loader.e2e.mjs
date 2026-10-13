// Browser tests for the site-wide <head> loader (issue #3). Run: node test/e2e/head-loader.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
const server = await serve(4480);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

// What the bundle builds on a page: its own elements, the header it rebuilds, the sticky call bar, the footer it reworks.
const SHAPE = `JSON.stringify({
  btg: document.querySelectorAll('[class*="btg-"]').length,
  logo: document.querySelectorAll('.fusion-logo .btg-logo').length,
  tools: document.querySelectorAll('.btg-header-tools').length,
  sticky: document.querySelectorAll('.btg-sticky-cta').length,
  dropdown: document.querySelectorAll('.btg-dropdown').length
})`;
async function shape(path) {
  const b = await launch({ width: 1440, height: 900 });
  await b.goto('http://localhost:4480' + path); await b.sleep(3000);
  const s = await b.evalJs(SHAPE); await b.close(); return JSON.parse(s);
}

// A page that still has its own loader while the <head> loader is live: the bundle must run once.
const once = await shape('/memory-install/');
const both = await shape('/memory-install/?head=1');
check('per-page loader plus <head> loader builds the same page as one loader', JSON.stringify(both) === JSON.stringify(once), JSON.stringify({ once, both }));

// Pages that never had a loader (404, search results, archives) get the redesign from the <head> loader alone (issue #3).
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const page of ['notfound', 'search-results', 'category-archive']) {
    const b = await launch({ width: w, height: h, mobile: w < 600 });
    await b.goto('http://localhost:4480/' + page + '/?head=1'); await b.sleep(3500);
    check(w + ' ' + page + ': new header and footer from the <head> loader alone', await b.evalJs(`document.documentElement.classList.contains('btg-ready') && document.querySelectorAll('.btg-header-tools').length === 1 && document.querySelectorAll('.btg-foot-region').length === 2`));
    check(w + ' ' + page + ': no post byline (author and date), as on every other page since v1.8.2', await b.evalJs(`!/By Jeffrey Weaver/.test(document.querySelector('#main').innerText)`));
    check(w + ' ' + page + ': no horizontal page scroll', await b.evalJs(`document.documentElement.scrollWidth <= innerWidth`));
    await b.close();
  }
}

server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
