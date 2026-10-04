// Browser test for the daily Google sync (BTGGoogleLive) on the Reviews and home stand-ins.
// Run: node test/e2e/google-live.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const { shape } = createRequire(import.meta.url)('../../tools/google-reviews.js');
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const fx = new URL('./fixtures/', import.meta.url); mkdirSync(fx, { recursive: true });
const reply = { places: [{ displayName: { text: 'Bob The Tech Guy' }, rating: 4.9, userRatingCount: 31, googleMapsUri: 'https://maps.google.com/?cid=12486145650775343960',
  reviews: [1, 2, 3].map((i) => ({ rating: i === 3 ? 4 : 5, relativePublishTimeDescription: i + ' weeks ago', originalText: { text: 'Test review number ' + i + '. Bob fixed it quickly and explained everything.' },
    authorAttribution: { displayName: 'Tester ' + i, uri: 'https://www.google.com/maps/contrib/' + i } })) }] };
writeFileSync(new URL('fresh.json', fx), JSON.stringify(shape(reply, Date.now())));
writeFileSync(new URL('stale.json', fx), JSON.stringify(shape(reply, Date.now() - 40 * 864e5)));
const server = await serve(4460);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
async function open(path, fixture, w = 1440, h = 900, m = false) {
  const b = await launch({ width: w, height: h, mobile: m });
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.BTG_GOOGLE_URL = '/test/e2e/fixtures/${fixture}.json';` });
  await b.goto('http://localhost:4460' + path); await b.sleep(1500);
  return b;
}
let b = await open('/reviews/', 'fresh');
check('reviews: Google section right after the hero, 3 cards', await b.evalJs(`(() => { const s = document.querySelector('section.btg-hero + .btg-gl'); return !!s && s.querySelectorAll('.btg-gl-card').length === 3; })()`));
check('reviews: live numbers in the section and the footer', await b.evalJs(`/4\\.9.*31 Google reviews/.test(document.querySelector('.btg-gl-sum').innerText) && /31 Google reviews/.test(document.querySelector('.btg-foot-rating').innerText)`));
check('reviews: author links open Google, attribution shown', await b.evalJs(`document.querySelector('.btg-gl-name a').href.startsWith('https://www.google.com/maps/contrib/') && /Reviews from Google/.test(document.querySelector('.btg-gl-foot').innerText)`));
check('reviews: site reviews still listed below', await b.evalJs(`document.querySelectorAll('.wpcr3_review').length >= 10 && !!(document.querySelector('.btg-gl').compareDocumentPosition(document.querySelector('.wpcr3_review')) & 4)`));
check('no horizontal scroll', !(await b.evalJs(`document.documentElement.scrollWidth > innerWidth`)));
await b.evalJs(`document.querySelector('.btg-gl').scrollIntoView()`); await b.sleep(500);
await b.shot(out + '/google-live.png'); await b.close();
b = await open('/', 'fresh');
check('home: band summary uses the live count', await b.evalJs(`/4\\.9.*31 Google reviews/.test(document.querySelector('.btg-rv-sum').innerText)`));
await b.close();
b = await open('/reviews/', 'stale');
check('stale file ignored: no section, footer keeps the built-in count', await b.evalJs(`!document.querySelector('.btg-gl') && /28 Google reviews/.test(document.querySelector('.btg-foot-rating').innerText)`));
await b.close();
b = await open('/reviews/', 'missing');
check('missing file: page still fine', await b.evalJs(`!document.querySelector('.btg-gl') && document.documentElement.classList.contains('btg-ready')`));
await b.close();
b = await open('/reviews/', 'fresh', 390, 844, true);
check('phone: cards fit, no horizontal scroll', await b.evalJs(`document.querySelector('.btg-gl-card').getBoundingClientRect().width <= innerWidth - 20 && document.documentElement.scrollWidth <= innerWidth`));
await b.evalJs(`document.querySelector('.btg-gl').scrollIntoView()`); await b.sleep(500);
await b.shot(out + '/google-live-phone.png'); await b.close();
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
