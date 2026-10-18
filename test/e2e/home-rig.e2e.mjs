// Bob's all-white custom gaming rig on the home page (v1.8.13 photo band, re-done 2026-10-18 as a "pop-out" banner Jeff picked):
// a dark rounded banner after the "Now Open" box, with the Hardware Install page's wording on the left and a cut-out of the rig
// that sticks out past the banner's top and right edges on desktop; on a phone the rig sits on top of the stacked banner.
// Run: node test/e2e/home-rig.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync, readFileSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4497);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

// The shipped bundle pins the photo folder to the tag where the cut-out first ships.
const TAG = 'v1.8.15';
const js = readFileSync(new URL('../../dist/btg.js', import.meta.url), 'utf8');
const base = (js.match(/var PHOTO_BASE = '([^']+)'/) || [])[1] || '';
check(`PHOTO_BASE is pinned to ${TAG}`, base === `https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@${TAG}/dist/brand/photos/`, base);

const probe = `JSON.stringify((() => {
  const pops = document.querySelectorAll('.btg-rig-pop');
  const p = pops[0], i = p && p.querySelector('img'), t = p && p.querySelector('.btg-rig-pop-text');
  if (!i || !t) return { n: pops.length, old: document.querySelectorAll('.btg-rig-fig').length };
  const R = (e) => e.getBoundingClientRect(), q = R(i), b = R(p), tx = R(t);
  const box = document.querySelector('.post-content > .fusion-reading-box-container');
  const services = [...document.querySelectorAll('.post-content > .fusion-title')].find((x) => /Bob The Tech Guy/.test(x.textContent));
  const before = (a, c) => !!(a.compareDocumentPosition(c) & 4);
  const txt = (s) => ((p.querySelector(s) || {}).textContent || '').replace(/\\s+/g, ' ').trim();
  const a = p.querySelector('a');
  return {
    n: pops.length, old: document.querySelectorAll('.btg-rig-fig').length,
    file: i.src.split('/').pop(), loaded: i.complete && i.naturalWidth > 0, alt: i.alt,
    afterBox: !!box && box.nextElementSibling === p, beforeServices: !!services && before(p, services),
    eyebrow: txt('.btg-rig-pop-eyebrow'), title: txt('h2'), lede: txt('.btg-rig-pop-lede'), btn: txt('a'), href: a && a.getAttribute('href'),
    img: [q.left, q.top, q.right, q.bottom].map(Math.round), banner: [b.left, b.top, b.right, b.bottom].map(Math.round), text: [tx.left, tx.top, tx.right, tx.bottom].map(Math.round),
    vw: innerWidth, scrollOk: document.documentElement.scrollWidth <= innerWidth
  };
})())`;

for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile });
  await b.goto('http://localhost:4497/'); await b.sleep(3000);
  await b.evalJs(`(document.querySelector('.btg-rig-pop') || document.body).scrollIntoView({ block: 'center' })`); await b.sleep(1200);
  const r = JSON.parse(await b.evalJs(probe) || 'null');
  const has = !!r && r.n === 1 && !!r.img;
  check(`${w} home: exactly one pop-out banner, and the old photo band is gone`, has && r.old === 0, r ? `${r.n} banner(s), ${r.old} old` : 'none');
  check(`${w} home: right after the Now Open box, before the services heading`, has && r.afterBox && r.beforeServices);
  check(`${w} home: the Hardware Install page's wording`, has && r.eyebrow === 'Services · Hardware' && r.title === 'New hardware, installed and tested.'
    && r.lede === 'Graphics cards, drives, webcams and more, installed and working together.', has ? `${r.eyebrow} | ${r.title} | ${r.lede}` : '');
  check(`${w} home: button "Hardware Install" goes to /hardware-install/`, has && /^hardware install$/i.test(r.btn) && /\/hardware-install\/$/.test(r.href || ''), has ? `${r.btn} ${r.href}` : '');
  check(`${w} home: cut-out gaming-rig-cutout.webp loaded, descriptive alt`, has && r.file === 'gaming-rig-cutout.webp' && r.loaded && /gaming PC/.test(r.alt) && /white/.test(r.alt), has ? `${r.file} ${r.loaded} "${r.alt}"` : '');
  check(`${w} home: no sideways scroll, rig fully on screen`, has && r.scrollOk && r.img[0] >= 0 && r.img[2] <= r.vw, has ? JSON.stringify(r.img) + ' vw ' + r.vw : '');
  if (!mobile) {
    check(`${w} home: rig jumps out past the banner's top and right edges`, has && r.img[1] <= r.banner[1] - 24 && r.img[2] >= r.banner[2] + 8, has ? `img ${r.img} banner ${r.banner}` : '');
    check(`${w} home: rig sits right of the text, not over it`, has && r.img[0] >= r.text[2] - 8, has ? `img ${r.img} text ${r.text}` : '');
  } else {
    check(`${w} home: rig on top, sticking up out of the banner, above the text`, has && r.img[1] <= r.banner[1] - 24 && r.img[3] <= r.text[1] + 8, has ? `img ${r.img} banner ${r.banner} text ${r.text}` : '');
    check(`${w} home: banner fits the screen`, has && r.banner[0] >= 0 && r.banner[2] <= r.vw, has ? JSON.stringify(r.banner) : '');
  }
  if (has) await b.shot(`${out}/home-rig-${w}.png`);
  // Only the home page gets it.
  for (const page of ['about', 'memory-install', 'northern-new-jersey']) {
    await b.goto(`http://localhost:4497/${page}/`); await b.sleep(2000);
    const n = Number(await b.evalJs(`document.querySelectorAll('.btg-rig-pop, .btg-rig-fig').length`));
    check(`${w} ${page}: no rig banner`, n === 0, String(n));
  }
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
