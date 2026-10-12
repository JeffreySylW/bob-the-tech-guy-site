// Browser tests for the "Posted on Google" band on the home page (issue #11). Run: node test/e2e/google-reviews.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4482);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const b = await launch({ width: w, height: h, mobile: w < 600 });
  await b.goto('http://localhost:4482/'); await b.sleep(2500);
  check(w + ': Google band sits directly above the site\'s own reviews strip', await b.evalJs(`(() => { const g = document.querySelector('.btg-gr'), s = document.querySelector('.btg-rv:not(.btg-gr)'); return !!g && !!s && g.nextElementSibling === s; })()`));
  check(w + ': 10 Google cards, each says Posted on Google', await b.evalJs(`(() => { const c = document.querySelectorAll('.btg-gr .btg-gr-card'); return c.length === 10 && [...c].every((x) => /Posted on Google/.test(x.innerText)); })()`));
  // Option 1 (Jeff, 2026-10-12): one "Excellent" summary only; the site's own strip is just cards, full width.
  check(w + ': the site\'s own strip has no summary of its own', await b.evalJs(`!document.querySelector('.btg-rv:not(.btg-gr) .btg-rv-sum')`));
  if (w >= 900) check(w + ': three whole cards show side by side, none cut off at the edge', await b.evalJs(`(() => { const t = document.querySelector('.btg-rv-plain .btg-rv-track'), r = t.getBoundingClientRect(); return [...t.children].slice(0, 3).every((c) => c.getBoundingClientRect().right <= r.right + 1); })()`));
  check(w + ': its cards use the full content width', await b.evalJs(`(() => { const s = document.querySelector('.btg-rv:not(.btg-gr)'), t = s.querySelector('.btg-rv-slider'); return t.getBoundingClientRect().width >= s.getBoundingClientRect().width - 2; })()`));
  await b.evalJs(`document.querySelector('.btg-gr').scrollIntoView({ block: 'center' })`); await b.sleep(500);
  await b.evalJs(`document.querySelector('.btg-gr .btg-rv-more').click()`); await b.sleep(200);
  check(w + ': Read more opens a long Google review', await b.evalJs(`(() => { const btn = document.querySelector('.btg-gr .btg-rv-more'); return btn.getAttribute('aria-expanded') === 'true' && !document.getElementById(btn.getAttribute('aria-controls')).classList.contains('is-clamped'); })()`));
  check(w + ': no horizontal page scroll', await b.evalJs(`document.documentElement.scrollWidth <= innerWidth`));
  await b.shot(`${out}/google-band-${w}.png`);
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
