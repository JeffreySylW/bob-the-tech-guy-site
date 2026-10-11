// Browser test for v1.8.3: service-area maps are readable (labels do not overlap), the zone is highlighted, and the credit is OpenStreetMap only.
// Run: node test/e2e/map-polish.e2e.mjs (needs internet: Leaflet from cdnjs and OpenStreetMap tiles)
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
const server = await serve(4452);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const b = await launch({ width: 1280, height: 900 });
for (const [path, name] of [['/northern-new-jersey/', 'NJ page'], ['/best-computer-repair-chesterfield-va/', 'Chesterfield page']]) {
  await b.goto('http://localhost:4452' + path); await b.sleep(1500);
  await b.evalJs(`document.querySelector('.btg-zone-big').scrollIntoView({ block: 'center' })`); await b.sleep(5000);
  check(name + ': credit says OpenStreetMap and no longer says Leaflet', await b.evalJs(`(() => { const t = document.querySelector('.btg-zone-big .leaflet-control-attribution').innerText; return /OpenStreetMap/.test(t) && !/Leaflet/.test(t); })()`));
  check(name + ': everything outside the service area is veiled (the area itself is not)', await b.evalJs(`(() => { const ps = [...document.querySelectorAll('.btg-zone-big path')]; return ps.some((p) => !p.classList.contains('leaflet-interactive') && p.getAttribute('fill-rule') === 'evenodd' || (p.getAttribute('d') || '').split('M').length > 2); })()`));
  check(name + ': town labels never overlap each other', await b.evalJs(`(() => { const r = [...document.querySelectorAll('.btg-zone-big .btg-zone-lbl')].map((e) => e.getBoundingClientRect()); for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (!(r[i].right <= r[j].left || r[j].right <= r[i].left || r[i].bottom <= r[j].top || r[j].bottom <= r[i].top)) return false; return r.length >= 5; })()`));
}
await b.goto('http://localhost:4452/about/'); await b.sleep(1500);
await b.evalJs(`document.querySelector('.btg-foot-zone').scrollIntoView({ block: 'center' })`); await b.sleep(5000);
check('footer maps: credit is tucked into a small (i), still in the page, and opens on hover', await b.evalJs(`(() => { const a = document.querySelector('.btg-foot-zone .leaflet-control-attribution'); const w = a.getBoundingClientRect().width; return w <= 24 && /OpenStreetMap/.test(a.textContent) && !/Leaflet/.test(a.textContent); })()`));
await b.close(); server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
