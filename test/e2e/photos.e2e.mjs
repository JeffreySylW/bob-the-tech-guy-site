// Bob's new photos (2026-10-17): each approved service page shows its photo, and the About page shows the two Marine photos.
// Run: node test/e2e/photos.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4498);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

const SERVICE_PHOTOS = {
  'memory-install': 'memory-ram.jpg', 'hardware-install': 'psu-install.jpg', 'operating-system-install': 'system-error.jpg',
  'screen-replacement': 'broken-screen.jpg', 'computer-tune-up': 'laptop-fan.jpg', 'hardware-repair-upgrades': 'bob-repairing-pc.jpg',
};

for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile });
  for (const [page, file] of Object.entries(SERVICE_PHOTOS)) {
    await b.goto(`http://localhost:4498/${page}/`); await b.sleep(3000);
    const r = JSON.parse(await b.evalJs(`JSON.stringify((() => { const i = document.querySelector('.btg-photo-fig img'); if (!i) return null; const q = i.getBoundingClientRect(); return { file: i.src.split('/').pop(), loaded: i.complete && i.naturalWidth > 0, natural: i.naturalWidth + 'x' + i.naturalHeight, declared: i.width + 'x' + i.height, right: q.right, visible: q.width > 60 && q.height > 60, scrollOk: document.documentElement.scrollWidth <= innerWidth, count: document.querySelectorAll('.btg-photo-fig').length }; })())`) || 'null');
    check(`${w} ${page}: shows ${file}, loaded, once`, !!r && r.file === file && r.loaded && r.count === 1, r ? `${r.natural}` : 'no photo');
    check(`${w} ${page}: photo is visible and the page does not scroll sideways`, !!r && r.visible && r.scrollOk && r.right <= w);
  }
  await b.close();
}

// About: two Marine photos below Bob's story.
for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile });
  await b.goto('http://localhost:4498/about/'); await b.sleep(3000);
  const r = JSON.parse(await b.evalJs(`JSON.stringify((() => { const row = document.querySelector('.btg-marine-row'); if (!row) return null; const im = [...row.querySelectorAll('img')]; const intro = document.querySelector('.btg-bob-intro'); return { n: im.length, files: im.map((i) => i.src.split('/').pop()), loaded: im.every((i) => i.complete && i.naturalWidth > 0), alts: im.every((i) => i.alt.length > 15), after: !!(intro.compareDocumentPosition(row) & 4), within: im.every((i) => { const q = i.getBoundingClientRect(); return q.left >= 0 && q.right <= innerWidth; }), scrollOk: document.documentElement.scrollWidth <= innerWidth }; })())`) || 'null');
  check(`${w} about: two Marine photos, loaded, with alt text, below Bob's story`, !!r && r.n === 2 && r.loaded && r.alts && r.after, r ? r.files.join(', ') : 'none');
  check(`${w} about: Marine photos stay on screen`, !!r && r.within && r.scrollOk);
  const hs = JSON.parse(await b.evalJs(`JSON.stringify([...document.querySelectorAll('.btg-marine-row img')].map((i) => Math.round(i.getBoundingClientRect().height)))`) || '[]');
  check(`${w} about: both Marine photos are the same height`, hs.length === 2 && Math.abs(hs[0] - hs[1]) <= 1, hs.join(' vs ') + 'px');
  if (r) { await b.evalJs(`document.querySelector('.btg-marine-row').scrollIntoView({ block: 'center' })`); await b.sleep(500); await b.shot(`${out}/marine-${w}.png`); }
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
