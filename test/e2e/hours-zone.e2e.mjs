// Browser test for v1.7.1: home hours pill, contact service-zone map + hours card, footer zone map.
// Run: node test/e2e/hours-zone.e2e.mjs   (needs internet: Leaflet from cdnjs, OpenStreetMap tiles)
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4470);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  let b = await launch({ width: w, height: h, mobile: m });
  await b.goto('http://localhost:4470/'); await b.sleep(1500);
  check(w + ' home: hours pill in the hero with a link to all hours', await b.evalJs(`(() => { const p = document.querySelector('section.btg-hero .btg-hours-pill'); return !!p && /^(Open now|Opens today|Closed (today|now))/.test(p.innerText) && !/00a0/.test(p.innerText) && p.querySelector('a').getAttribute('href') === '/contact-2/#btg-hours'; })()`),
    await b.evalJs(`(document.querySelector('.btg-hours-pill') || {}).innerText`));
  check(w + ' home: healthy gap between the NJ line and the hours pill', await b.evalJs(`document.querySelector('.btg-hours-pill').getBoundingClientRect().top - document.querySelector('.btg-hero-alt').getBoundingClientRect().bottom >= 24`),
    await b.evalJs(`Math.round(document.querySelector('.btg-hours-pill').getBoundingClientRect().top - document.querySelector('.btg-hero-alt').getBoundingClientRect().bottom) + 'px'`));
  check(w + ' home: no horizontal scroll',!(await b.evalJs(`document.documentElement.scrollWidth > innerWidth`)));
  await b.evalJs(`document.querySelector('.btg-hours-pill').scrollIntoView({ block: 'center' })`); await b.sleep(400);
  await b.shot(`${out}/hz-home-${w}.png`);
  await b.close();
  b = await launch({ width: w, height: h, mobile: m });
  await b.goto('http://localhost:4470/contact-2/'); await b.sleep(1200);
  check(w + ' contact: zone section after the location cards, with hours card', await b.evalJs(`(() => { const z = document.querySelector('.btg-locations + .btg-zone#btg-hours'); return !!z && z.querySelectorAll('.btg-hours-week dt').length === 7 && z.querySelectorAll('.btg-hours-week .is-today').length === 2; })()`));
  await b.evalJs(`document.querySelector('.btg-zone').scrollIntoView({ block: 'start' }); scrollBy(0, -110)`); await b.sleep(4000);
  check(w + ' contact: map drew the shaded zone and 9 towns', await b.evalJs(`(() => { const z = document.querySelector('.btg-zone-big'); return z.classList.contains('leaflet-container') && z.querySelectorAll('path.leaflet-interactive').length === 10 && z.querySelectorAll('.leaflet-tile-loaded').length > 0; })()`));
  check(w + ' contact: map is wide enough and nothing overflows', await b.evalJs(`document.querySelector('.btg-zone-big').getBoundingClientRect().height >= 290 && document.documentElement.scrollWidth <= innerWidth`));
  await b.shot(`${out}/hz-contact-${w}.png`);
  check(w + ' footer: zone map waits until scrolled near', await b.evalJs(`!document.querySelector('.btg-foot-zone').classList.contains('leaflet-container')`));
  await b.evalJs(`document.querySelector('.btg-foot-zone').scrollIntoView({ block: 'center' })`); await b.sleep(3500);
  check(w + ' footer: Virginia and NJ columns each have their zone map (drawn), no pin map', await b.evalJs(`(() => { const va = document.querySelector('#text-3 .btg-foot-zone.leaflet-container'), nj = document.querySelector('.btg-foot-zone.btg-zone-nj.leaflet-container'); return !!va && !!nj && !document.querySelector('.fusion-footer iframe'); })()`));
  await b.shot(`${out}/hz-footer-${w}.png`);
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
