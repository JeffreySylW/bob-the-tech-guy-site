// Browser test for v1.7.2: veteran-owned badge in the About banner and in place of the footer flag image.
// Run: node test/e2e/vet.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4480);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const LISTING = 'https://www.veteranownedbusiness.com/business/24505/bob-the-tech-guy';
for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile: m });
  await b.goto('http://localhost:4480/about/'); await b.sleep(1500);
  check(w + ' about: badge under Bob\'s photo (not in the dark banner), healthy gap, links to the VOB listing', await b.evalJs(`(() => { const a = document.querySelector('.btg-bob-photo .btg-vet'); if (!a || document.querySelector('section.btg-hero .btg-vet')) return false; const gap = a.getBoundingClientRect().top - document.querySelector('.btg-bob-photo img').getBoundingClientRect().bottom; return gap >= 28 && a.href === '${LISTING}' && a.target === '_blank'; })()`));
  check(w + ' about: badge fits its column', await b.evalJs(`(() => { const c = document.querySelector('.btg-bob-photo').getBoundingClientRect(), r = document.querySelector('.btg-bob-photo .btg-vet').getBoundingClientRect(), e = document.querySelector('.btg-bob-photo .btg-vet-vob em').getBoundingClientRect(); return r.left >= c.left - 1 && r.right <= c.right + 1 && e.right <= r.right + 1; })()`));
  check(w + ' about: badge fits inside the screen', await b.evalJs(`(() => { const r = document.querySelector('.btg-vet').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; })()`));
  check(w + ' footer: old flag image gone, dark badge in its place', await b.evalJs(`(() => { const t = document.querySelector('#text-16'); return !t.querySelector('img[src*="Veteran-Owned-Small-Business-Badge"]') && !!t.querySelector('.btg-vet.btg-vet--dark') && t.querySelector('.btg-vet').href === '${LISTING}'; })()`));
  check(w + ' footer: "Verified member" stays inside the card', await b.evalJs(`(() => { const c = document.querySelector('#text-16 .btg-vet').getBoundingClientRect(), e = document.querySelector('#text-16 .btg-vet-vob em').getBoundingClientRect(); return e.right <= c.right + 1 && e.bottom <= c.bottom + 1; })()`));
  await b.evalJs(`document.querySelector('#text-16').scrollIntoView()`); await b.sleep(1500);
  check(w + ' VOB logo image loads, wide and undistorted', await b.evalJs(`[...document.querySelectorAll('.btg-vet-vob img')].every((i) => i.complete && i.naturalWidth === 426 && i.getBoundingClientRect().width > i.getBoundingClientRect().height * 4 && getComputedStyle(i).boxShadow === 'none')`));
  await b.evalJs(`document.querySelector('.btg-vet').scrollIntoView({ block: 'center' })`); await b.sleep(400);
  await b.shot(`${out}/vet-about-new-${w}.png`);
  await b.evalJs(`document.querySelector('#text-16').scrollIntoView({ block: 'center' })`); await b.sleep(400);
  await b.shot(`${out}/vet-footer-new-${w}.png`);
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
