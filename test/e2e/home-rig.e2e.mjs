// Bob's all-white custom gaming rig (2026-10-18): one wide photo on the home page, right after the "Now Open" box, before the services heading.
// Run: node test/e2e/home-rig.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4497);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

// The shipped bundle pins the photo folder to the tag where this photo first ships.
const js = readFileSync(new URL('../../dist/btg.js', import.meta.url), 'utf8');
const base = (js.match(/var PHOTO_BASE = '([^']+)'/) || [])[1] || '';
check('PHOTO_BASE is pinned to v1.8.13', base === 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.8.13/dist/brand/photos/', base);

const probe = `JSON.stringify((() => {
  const figs = document.querySelectorAll('.btg-rig-fig');
  const f = figs[0], i = f && f.querySelector('img');
  if (!i) return { n: figs.length };
  const q = i.getBoundingClientRect(), main = document.querySelector('.post-content').getBoundingClientRect();
  const box = document.querySelector('.post-content > .fusion-reading-box-container');
  const services = [...document.querySelectorAll('.post-content > .fusion-title')].find((t) => /Bob The Tech Guy/.test(t.textContent));
  const before = (a, b) => !!(a.compareDocumentPosition(b) & 4);
  return {
    n: figs.length, file: i.src.split('/').pop(), loaded: i.complete && i.naturalWidth > 0, alt: i.alt,
    afterBox: !!box && before(box, f) && box.nextElementSibling === f, beforeServices: !!services && before(f, services),
    width: Math.round(q.width), centred: Math.abs((q.left + q.right) / 2 - (main.left + main.right) / 2) <= 2,
    within: q.left >= 0 && q.right <= innerWidth, scrollOk: document.documentElement.scrollWidth <= innerWidth
  };
})())`;

for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile });
  await b.goto('http://localhost:4497/'); await b.sleep(3000);
  const r = JSON.parse(await b.evalJs(probe) || 'null');
  check(`${w} home: exactly one rig photo, gaming-rig-white.jpg, loaded`, !!r && r.n === 1 && r.file === 'gaming-rig-white.jpg' && r.loaded, r ? `${r.n} found ${r.file || ''}` : 'none');
  check(`${w} home: descriptive alt text`, !!r && /gaming PC/.test(r.alt || '') && /white/.test(r.alt || ''), r && r.alt);
  check(`${w} home: right after the Now Open box, before the services heading`, !!r && r.afterBox && r.beforeServices);
  check(`${w} home: centred, at most 640px wide, on screen, no sideways scroll`, !!r && r.centred && r.width <= 640 && r.width >= Math.min(300, w - 40) && r.within && r.scrollOk, r ? r.width + 'px' : '');
  if (r && r.n) { await b.evalJs(`document.querySelector('.btg-rig-fig').scrollIntoView({ block: 'center' })`); await b.sleep(500); await b.shot(`${out}/home-rig-${w}.png`); }
  // Only the home page gets it.
  for (const page of ['about', 'memory-install', 'northern-new-jersey']) {
    await b.goto(`http://localhost:4497/${page}/`); await b.sleep(2000);
    const n = Number(await b.evalJs(`document.querySelectorAll('.btg-rig-fig').length`));
    check(`${w} ${page}: no rig photo`, n === 0, String(n));
  }
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
