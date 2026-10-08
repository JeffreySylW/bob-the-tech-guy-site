// Browser test for v1.7.9: NJ service-area map (page + footer) and even pill/card layout. Run: node test/e2e/nj-zone.e2e.mjs
// (needs internet: Leaflet from cdnjs and OpenStreetMap tiles)
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4498);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
for (const [w, h, m] of [[1440, 900, false], [1100, 800, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile: m });
  await b.goto('http://localhost:4498/northern-new-jersey/'); await b.sleep(1800);
  check(w + ': service cards in each row are the same height', await b.evalJs(`(() => { const rows = {}; document.querySelectorAll('.btg-sr-item').forEach((a) => { const r = a.getBoundingClientRect(); (rows[Math.round(r.top / 4)] = rows[Math.round(r.top / 4)] || []).push(Math.round(r.height)); }); return Object.values(rows).every((hs) => hs.every((x) => Math.abs(x - hs[0]) <= 1)); })()`));
  check(w + ': town pills sit on an even grid (same width per row, nothing overflows)', await b.evalJs(`(() => { const li = [...document.querySelectorAll('.btg-nj-towns li')]; const ws = li.map((x) => Math.round(x.getBoundingClientRect().width)); const parent = document.querySelector('.btg-nj-towns').getBoundingClientRect(); return li.length === 23 && Math.max(...ws) - Math.min(...ws) <= 1 && li.every((x) => x.getBoundingClientRect().right <= parent.right + 1) && li.every((x) => x.scrollWidth <= x.clientWidth + 1); })()`),
    await b.evalJs(`[...new Set([...document.querySelectorAll('.btg-nj-towns li')].map((x) => Math.round(x.getBoundingClientRect().width)))].join(',')`));
  await b.evalJs(`document.querySelector('.btg-zone-slot--nj').scrollIntoView({ block: 'center' })`); await b.sleep(4500);
  check(w + ': NJ zone map drew the shaded area and 21 towns', await b.evalJs(`(() => { const z = document.querySelector('.btg-zone-slot--nj .btg-zone-nj'); return !!z && z.classList.contains('leaflet-container') && z.querySelectorAll('path.leaflet-interactive').length === 22 && z.querySelectorAll('.leaflet-tile-loaded').length > 0; })()`));
  check(w + ': big map labels the main towns only (none on a phone-sized map)', await b.evalJs(`(() => { const n = document.querySelectorAll('.btg-zone-slot--nj .btg-zone-lbl').length; return ${m ? 'n === 0' : 'n >= 8 && n < 21'}; })()`));
  check(w + ': Google pin map still follows the zone map; nothing overflows', await b.evalJs(`!!document.querySelector('.btg-zone-slot--nj + .btg-nj-map') && document.documentElement.scrollWidth <= innerWidth`));
  await b.shot(`${out}/njz-map-${w}.png`);
  await b.evalJs(`document.querySelector('.btg-nj-towns').scrollIntoView({ block: 'start' }); scrollBy(0, -140)`); await b.sleep(500); await b.shot(`${out}/njz-pills-${w}.png`);
  await b.evalJs(`document.querySelector('.btg-sr-list').scrollIntoView({ block: 'start' }); scrollBy(0, -140)`); await b.sleep(500); await b.shot(`${out}/njz-cards-${w}.png`);
  await b.evalJs(`document.querySelector('.btg-foot-zone.btg-zone-nj').scrollIntoView({ block: 'center' })`); await b.sleep(4500);
  check(w + ': footer: NJ service-area widget under Quick Links, map drawn, link to the NJ page', await b.evalJs(`(() => { const wd = document.querySelector('.btg-foot-zone.btg-zone-nj').closest('.btg-foot'); const prev = wd.previousElementSibling; const z = wd.querySelector('.btg-zone-nj'); return /Northern NJ Service Area/i.test(wd.querySelector('.widget-title').innerText) && !!prev && prev.querySelector('.btg-foot-links') !== null && z.classList.contains('leaflet-container') && z.querySelectorAll('path.leaflet-interactive').length === 22 && !!wd.querySelector('.btg-foot-zone-cap a[href$="/northern-new-jersey/"]'); })()`));
  check(w + ': footer: NJ service-area map is exactly level with the NJ map to its left (same top, same height)', await b.evalJs(`(() => { const pin = document.querySelector('#text-3 .btg-foot-map').getBoundingClientRect(), z = document.querySelector('.btg-foot-zone.btg-zone-nj').getBoundingClientRect(); const stacked = Math.abs(pin.left - z.left) < 100; return ${m ? 'stacked' : '!stacked && Math.abs(pin.top - z.top) < 0.6 && Math.abs(pin.height - z.height) < 0.6'}; })()`),
    await b.evalJs(`(() => { const pin = document.querySelector('#text-3 .btg-foot-map').getBoundingClientRect(), z = document.querySelector('.btg-foot-zone.btg-zone-nj').getBoundingClientRect(); return 'pin top ' + pin.top.toFixed(1) + ' / zone top ' + z.top.toFixed(1); })()`));
  check(w + ': footer still has the Virginia zone map and the NJ pin map', await b.evalJs(`!!document.querySelector('#text-3 .btg-foot-zone:not(.btg-zone-nj)') && !!document.querySelector('#text-3 .btg-foot-map')`));
  await b.shot(`${out}/njz-footer-${w}.png`);
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
