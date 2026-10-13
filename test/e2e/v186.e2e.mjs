// Browser tests for v1.8.6 (SEO audit fixes, 2026-10-13). Run: node test/e2e/v186.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
const server = await serve(4486);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

// 2026-10-13: cdnjs served Leaflet's stylesheet empty or not at all, so map tiles spilled out of every map box and the
// Contact page grew ~231,000px wide. The maps must stay clipped even when that stylesheet never arrives.
const b = await launch({ width: 1366, height: 900 });
await b.send('Fetch.enable', { patterns: [{ urlPattern: '*leaflet*.css*' }] });
b.on('Fetch.requestPaused', (p) => b.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: 'text/css' }, { name: 'access-control-allow-origin', value: '*' }], body: '' }));
await b.goto('http://localhost:4486/contact-2/'); await b.sleep(2000);
await b.evalJs(`document.querySelector('.btg-zone-map').scrollIntoView({ block: 'center' })`); await b.sleep(4500);
check('Leaflet stylesheet missing: the Contact map still clips its tiles', await b.evalJs(`[...document.querySelectorAll('.leaflet-container')].every((m) => getComputedStyle(m).overflow === 'hidden')`), await b.evalJs(`document.querySelectorAll('.leaflet-container').length + ' maps'`));
check('Leaflet stylesheet missing: the Contact page does not scroll sideways', await b.evalJs(`document.documentElement.scrollWidth <= innerWidth`), await b.evalJs(`document.documentElement.scrollWidth + 'px wide'`));
await b.evalJs(`document.querySelector('.fusion-footer').scrollIntoView({ block: 'start' })`); await b.sleep(4000);
check('Leaflet stylesheet missing: footer map tiles stay inside their boxes', await b.evalJs(`[...document.querySelectorAll('.fusion-footer .leaflet-container')].every((m) => { const r = m.getBoundingClientRect(); return [...m.querySelectorAll('img.leaflet-tile')].every((t) => { const q = t.getBoundingClientRect(); const vis = Math.max(0, Math.min(q.right, r.right) - Math.max(q.left, r.left)) * Math.max(0, Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top)); return getComputedStyle(m).overflow === 'hidden' || vis === q.width * q.height; }); })`));
await b.close();

server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
