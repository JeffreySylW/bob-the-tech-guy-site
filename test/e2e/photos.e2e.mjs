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
// Where the photo belongs (Jeff, 2026-10-27): above the intro on the narrow split pages ('top'), floated in the intro on stacked
// ones ('wrap'), and a side row only where there is no split.
const PLACEMENT = {
  'memory-install': 'top', 'operating-system-install': 'top', 'screen-replacement': 'top',
  'hardware-install': 'wrap', 'computer-tune-up': 'wrap', 'hardware-repair-upgrades': 'row',
};
// What matters in each photo, in the file's own pixels (read off the photos 2026-10-27): the visible part of the frame must hold it whole.
const SUBJECT = {
  'screen-replacement': { x: [0, 600], y: [65, 420] }, // the cracked screen (its sides are already cut off in Bob's photo)
  'memory-install': { x: [45, 600], y: [410, 660] }, // the RAM stick
  'operating-system-install': { x: [0, 600], y: [130, 470] }, // the blue error screen
  'hardware-install': { x: [300, 600], y: [100, 460] }, // the PSU plugs and label
  'computer-tune-up': { x: [195, 545], y: [150, 490] }, // the dusty fan
};

for (const [w, h, mobile] of [[1440, 900, false], [1024, 800, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile });
  for (const [page, file] of Object.entries(SERVICE_PHOTOS)) {
    await b.goto(`http://localhost:4498/${page}/`); await b.sleep(3000);
    const r = JSON.parse(await b.evalJs(`JSON.stringify((() => { const i = document.querySelector('.btg-photo-fig img'); if (!i) return null; const q = i.getBoundingClientRect(); return { file: i.src.split('/').pop(), loaded: i.complete && i.naturalWidth > 0, natural: i.naturalWidth + 'x' + i.naturalHeight, declared: i.width + 'x' + i.height, right: q.right, visible: q.width > 60 && q.height > 60, scrollOk: document.documentElement.scrollWidth <= innerWidth, count: document.querySelectorAll('.btg-photo-fig').length }; })())`) || 'null');
    check(`${w} ${page}: shows ${file}, loaded, once`, !!r && r.file === file && r.loaded && r.count === 1, r ? `${r.natural}` : 'no photo');
    const noFace = await b.evalJs(`(() => { const h = document.querySelector('.btg-hero'); return !!h && !document.querySelector('.btg-hero-face') && h.getBoundingClientRect().height > 120; })()`);
    check(`${w} ${page}: the dark hero has no Bob face (and still renders)`, noFace);
    check(`${w} ${page}: photo is visible and the page does not scroll sideways`, !!r && r.visible && r.scrollOk && r.right <= w);
    const p = JSON.parse(await b.evalJs(`JSON.stringify((() => { const f = document.querySelector('.btg-photo-fig'), s = document.querySelector('.btg-split'), c = s && s.querySelector('.btg-include-card'); if (!f) return null; return { parent: f.parentElement.className, wrap: f.classList.contains('btg-photo-fig--wrap'), row: !!document.querySelector('.btg-photo-row'), cardFull: !c || c.getBoundingClientRect().width >= s.getBoundingClientRect().width * 0.95 }; })())`) || 'null');
    const want = PLACEMENT[page];
    const placed = !!p && (want === 'row' ? p.parent === 'btg-photo-row' : p.parent === 'btg-split-text' && !p.row && p.wrap === (want === 'wrap') && (want !== 'wrap' || p.cardFull));
    check(`${w} ${page}: photo sits ${want === 'row' ? 'beside the content in a photo row' : 'inside the intro text' + (want === 'wrap' ? ' (wrap), checklist card full width' : '')}`, placed, p ? JSON.stringify(p) : 'no photo');
    if (want === 'row') continue;
    // The frame: landscape 3:2, and the part of the photo it shows holds the subject whole (object-fit/position read back from the page).
    const v = JSON.parse(await b.evalJs(`JSON.stringify((() => { const i = document.querySelector('.btg-photo-fig img'), q = i.getBoundingClientRect(), cs = getComputedStyle(i), nw = i.naturalWidth, nh = i.naturalHeight; const pos = cs.objectPosition.split(' ').map(parseFloat); const k = cs.objectFit === 'cover' ? Math.max(q.width / nw, q.height / nh) : Math.min(q.width / nw, q.height / nh); const vw = cs.objectFit === 'cover' ? q.width / k : nw, vh = cs.objectFit === 'cover' ? q.height / k : nh, x0 = (nw - vw) * pos[0] / 100, y0 = (nh - vh) * pos[1] / 100; return { fit: cs.objectFit, ratio: +(q.width / q.height).toFixed(3), x: [Math.round(x0), Math.round(x0 + vw)], y: [Math.round(y0), Math.round(y0 + vh)] }; })())`));
    const sub = SUBJECT[page];
    check(`${w} ${page}: landscape 3:2 frame that shows the whole subject`, Math.abs(v.ratio - 1.5) <= 0.02 && v.x[0] <= sub.x[0] && v.x[1] >= sub.x[1] && v.y[0] <= sub.y[0] && v.y[1] >= sub.y[1], JSON.stringify(v) + ' subject ' + JSON.stringify(sub));
    // Size and spot: phones get the photo centred, full width up to 360px; desktop 'top' = above the intro, up to 400px, lined up
    // with the text; desktop 'wrap' = 240px, first in the intro with the text wrapping on its left.
    const g = JSON.parse(await b.evalJs(`JSON.stringify((() => { const f = document.querySelector('.btg-split-text > .btg-photo-fig'); if (!f) return null; const t = f.parentElement, n = f.nextElementSibling, q = f.getBoundingClientRect(), tq = t.getBoundingClientRect(), nq = n ? n.getBoundingClientRect() : null; return { first: t.firstElementChild === f, w: Math.round(q.width), col: Math.round(tq.width), leftOff: Math.round(q.left - tq.left), below: !!nq && nq.top >= q.bottom, topGap: nq ? Math.round(Math.abs(nq.top - q.top)) : null, textLeftOfPhoto: !!nq && nq.left < q.left, centreOff: Math.round(Math.abs((q.left + q.right) / 2 - (tq.left + tq.right) / 2)) }; })())`) || 'null');
    const near = (a, x) => Math.abs(a - x) <= 2;
    if (mobile) check(`${w} ${page}: photo first in the intro, centred, full width up to 360px`, !!g && g.first && g.centreOff <= 2 && near(g.w, Math.min(360, g.col)) && g.below, g ? JSON.stringify(g) : 'no photo');
    else if (want === 'top') check(`${w} ${page}: photo above the intro, up to 400px wide, lined up with the text`, !!g && g.first && near(g.w, Math.min(400, g.col)) && Math.abs(g.leftOff) <= 2 && g.below, g ? JSON.stringify(g) : 'no photo');
    else check(`${w} ${page}: photo 240px, first in the intro, text wraps beside it`, !!g && g.first && near(g.w, 240) && g.topGap !== null && g.topGap <= 24 && g.textLeftOfPhoto, g ? JSON.stringify(g) : 'no photo');
    // Stacked pages have short intros: the wrap photo must not hang far below the text (portrait photo left ~190px blank at 1440).
    if (want === 'wrap' && !mobile) {
      const hang = await b.evalJs(`(() => { const f = document.querySelector('.btg-photo-fig'), kids = [...f.parentElement.children].filter((k) => k !== f); return Math.round(f.getBoundingClientRect().bottom - Math.max(...kids.map((k) => k.getBoundingClientRect().bottom))); })()`);
      check(`${w} ${page}: no big blank gap beside the photo`, hang <= 80, `photo hangs ${hang}px below the text`);
    }
    await b.evalJs(`document.querySelector('.btg-split').scrollIntoView({ block: 'start' }); scrollBy(0, -90)`); await b.sleep(400); await b.shot(`${out}/photo-${page}-${w}.png`);
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
  // v1.8.17 (Jeff, 2026-10-18): no copy of the home page's Bob portrait on About; the badge sits centred above a full-width story.
  const a = JSON.parse(await b.evalJs(`JSON.stringify((() => { const intro = document.querySelector('.btg-bob-intro'), story = intro.querySelector('.btg-bob-story'), vet = intro.querySelector('.btg-vet'); const iq = intro.getBoundingClientRect(), sq = story.getBoundingClientRect(), vq = vet ? vet.getBoundingClientRect() : null; return { portraits: [...document.querySelectorAll('img[src*="bob-portrait"]')].filter((i) => i.getBoundingClientRect().width > 0).length, vet: !!vq && vq.height > 30, storyFull: sq.width >= iq.width - 2, vetAbove: !!vq && vq.bottom <= sq.top, gap: vq ? Math.round(sq.top - vq.bottom) : null, vetCentred: !!vq && Math.abs((vq.left + vq.right) / 2 - (iq.left + iq.right) / 2) <= 2 }; })())`));
  check(`${w} about: the home page's Bob portrait is not shown`, a.portraits === 0, `${a.portraits} visible`);
  check(`${w} about: Veteran badge centred above a full-width story, no empty column`, a.vet && a.storyFull && a.vetAbove && a.vetCentred && a.gap >= 12 && a.gap <= 48, JSON.stringify(a));
  await b.evalJs(`document.querySelector('.btg-bob-intro').scrollIntoView({ block: 'start' }); scrollBy(0, -90)`); await b.sleep(400); await b.shot(`${out}/about-intro-${w}.png`);
  // The home page keeps Bob's face in its hero.
  await b.goto('http://localhost:4498/'); await b.sleep(2500);
  const face = await b.evalJs(`(() => { const i = document.querySelector('.btg-hero .btg-hero-face'); return !!i && i.src.includes('bob-portrait') && i.getBoundingClientRect().width > 60; })()`);
  check(`${w} home: Bob's face still in the hero`, face);
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
