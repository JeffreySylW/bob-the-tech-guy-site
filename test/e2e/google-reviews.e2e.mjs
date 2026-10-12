// Browser tests for the review bands (issue #11). Run: node test/e2e/google-reviews.e2e.mjs
// Jeff, 2026-10-12: the "Posted on Google" band goes on the home page only; the site's own reviews move to Testimonials.
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4482);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const QUOTED = /^(Drew C\.|Mark M\.|Ray F\.|Michelle P\.|Cassie F\.)$/;

for (const [w, h] of [[1440, 900], [390, 844]]) {
  const b = await launch({ width: w, height: h, mobile: w < 600 });

  // Home: Google band only.
  await b.goto('http://localhost:4482/'); await b.sleep(2500);
  check(w + ': home shows the Google band in place of the old slider', await b.evalJs(`!!document.querySelector('.btg-gr') && !document.querySelector('.fusion-testimonials')`));
  check(w + ': 10 Google cards, each says Posted on Google', await b.evalJs(`(() => { const c = document.querySelectorAll('.btg-gr .btg-gr-card'); return c.length === 10 && [...c].every((x) => /Posted on Google/.test(x.innerText)); })()`));
  check(w + ': home no longer carries the site\'s own reviews strip', await b.evalJs(`!document.querySelector('.btg-rv:not(.btg-gr)')`));
  await b.evalJs(`document.querySelector('.btg-gr').scrollIntoView({ block: 'center' })`); await b.sleep(500);
  await b.evalJs(`document.querySelector('.btg-gr .btg-rv-more').click()`); await b.sleep(200);
  check(w + ': Read more opens a long Google review', await b.evalJs(`(() => { const btn = document.querySelector('.btg-gr .btg-rv-more'); return btn.getAttribute('aria-expanded') === 'true' && !document.getElementById(btn.getAttribute('aria-controls')).classList.contains('is-clamped'); })()`));
  check(w + ': home: no horizontal page scroll', await b.evalJs(`document.documentElement.scrollWidth <= innerWidth`));
  await b.shot(`${out}/google-band-${w}.png`);

  // Testimonials: the site's own reviews as cards after the five quotes, without repeating them.
  await b.goto('http://localhost:4482/testimonials/'); await b.sleep(2500);
  check(w + ': Testimonials: the site\'s reviews follow the five quotes as cards', await b.evalJs(`(() => { const q = document.querySelector('.btg-home-quotes'), s = document.querySelector('.btg-rv-plain'); return !!q && !!s && !!(q.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING); })()`));
  const names = JSON.parse(await b.evalJs(`JSON.stringify([...document.querySelectorAll('.btg-rv-plain .btg-rv-name')].map((x) => x.textContent))`) || '[]');
  check(w + ': Testimonials: 17 rated reviews, none repeating the five quotes', names.length === 17 && !names.some((n) => QUOTED.test(n)), names.length + ' cards');
  check(w + ': Testimonials: no Google band or Google label', await b.evalJs(`!document.querySelector('.btg-gr') && !/Posted on Google/.test(document.querySelector('.btg-rv-plain').innerText)`));
  if (w >= 900) check(w + ': Testimonials: three whole cards side by side, none cut off', await b.evalJs(`(() => { const t = document.querySelector('.btg-rv-plain .btg-rv-track'), r = t.getBoundingClientRect(); return [...t.children].slice(0, 3).every((c) => c.getBoundingClientRect().right <= r.right + 1); })()`));
  check(w + ': Testimonials: no horizontal page scroll', await b.evalJs(`document.documentElement.scrollWidth <= innerWidth`));
  await b.evalJs(`document.querySelector('.btg-rv-plain') && document.querySelector('.btg-rv-plain').scrollIntoView({ block: 'center' })`); await b.sleep(500);
  await b.shot(`${out}/testimonials-reviews-${w}.png`);
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
