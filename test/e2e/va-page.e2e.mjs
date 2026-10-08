// Browser test for v1.7.5: the consolidated Chesterfield & Greater Richmond page. Run: node test/e2e/va-page.e2e.mjs
// (needs internet: Leaflet from cdnjs and OpenStreetMap tiles)
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4496);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile: m });
  await b.goto('http://localhost:4496/best-computer-repair-chesterfield-va/'); await b.sleep(1800);
  check(w + ': hero with one visible h1 and the Virginia phone', await b.evalJs(`(() => { const h = [...document.querySelectorAll('h1')].filter((x) => x.offsetParent); return h.length === 1 && /Chesterfield, Virginia/.test(h[0].innerText) && !!document.querySelector('.btg-hero-cta[href="tel:8448354890"]'); })()`));
  check(w + ': city title and description', await b.evalJs(`document.title === 'Computer Repair in Chesterfield & Richmond, VA | Bob The Tech Guy' && /^Bob The Tech Guy brings on-site computer repair/.test(document.querySelector('meta[name=description]').content)`));
  check(w + ': 15 service cards and 9 towns', await b.evalJs(`document.querySelectorAll('.btg-sr-item').length === 15 && document.querySelectorAll('.btg-nj-towns li').length === 9`));
  check(w + ': footer Virginia links fold into the one Chesterfield page (the Virginia column links it once)', await b.evalJs(`(() => { const a = [...document.querySelectorAll('.fusion-footer a')].filter((x) => /virginia|chesterfield-va/.test(x.href)); return a.length === 1 && a[0].pathname === '/best-computer-repair-chesterfield-va/'; })()`),
    await b.evalJs(`JSON.stringify([...document.querySelectorAll('.fusion-footer a')].filter((x) => /virginia|chesterfield-va/.test(x.href)).map((x) => x.pathname))`));
  await b.evalJs(`document.querySelector('.btg-zone-slot').scrollIntoView({ block: 'center' })`); await b.sleep(4000);
  check(w + ': service-area map drew the zone and 9 towns', await b.evalJs(`(() => { const z = document.querySelector('.btg-zone-slot .btg-zone-big'); return !!z && z.classList.contains('leaflet-container') && z.querySelectorAll('path.leaflet-interactive').length === 10 && z.getBoundingClientRect().height >= 290; })()`));
  check(w + ': no reviews band, no address, no horizontal scroll', await b.evalJs(`!document.querySelector('.btg-rv') && !/Broadway/.test(document.body.innerText) && document.documentElement.scrollWidth <= innerWidth`));
  await b.shot(`${out}/va-map-${w}.png`);
  await b.evalJs(`scrollTo(0, 0)`); await b.sleep(600); await b.shot(`${out}/va-top-${w}.png`);
  await b.evalJs(`document.querySelector('.btg-cta-block').scrollIntoView({ block: 'end' })`); await b.sleep(600); await b.shot(`${out}/va-bottom-${w}.png`);
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
