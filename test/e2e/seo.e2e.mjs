// Browser test for the v1.7.4 SEO pass. Run: node test/e2e/seo.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
const server = await serve(4495);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const DEAD = /platform\.twitter\.com|connect\.facebook\.net|easy-twitter-feed-widget|instagram-feed\/js|coinmarketcap/;
async function open(path) {
  const b = await launch({ width: 1440, height: 900 });
  await b.send('Debugger.enable');
  const parsed = []; parsed.errors = [];
  b.on('Debugger.scriptParsed', (p) => parsed.push(p.url));
  await b.send('Runtime.enable');
  b.on('Runtime.exceptionThrown', (p) => parsed.errors.push((p.exceptionDetails.exception && p.exceptionDetails.exception.description || p.exceptionDetails.text || '').slice(0, 120)));
  await b.goto('http://localhost:4495' + path); await b.sleep(2500);
  return { b, parsed };
}
let { b, parsed } = await open('/about/');
check('about: no dead widget scripts ran', !parsed.some((u) => DEAD.test(u)), parsed.filter((u) => DEAD.test(u)).join(' '));
check('about: blocking caused no script errors', parsed.errors.length === 0, parsed.errors.join(' | '));
check('about: page title names Bob and his service', (await b.evalJs('document.title')) === 'About Bob Dyer, Marine Veteran Tech | Bob The Tech Guy', await b.evalJs('document.title'));
check('about: no slider page, so no slider code ran', !parsed.some((u) => /revslider/.test(u)) && !(await b.evalJs(`!!document.querySelector('rs-module')`)));
check('schema has hours, url and profiles, no address', await b.evalJs(`(() => { const j = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent); return j.openingHoursSpecification.length === 3 && j.url === 'https://bobthetechguy.com/' && j.sameAs.length === 3 && !j.address; })()`));
check('footer social icons: no dead "#" links, the rest are labelled', await b.evalJs(`(() => { const a = [...document.querySelectorAll('.fusion-social-networks a')]; return a.length > 0 && a.every((x) => x.getAttribute('href') !== '#' && /^Bob The Tech Guy on /.test(x.getAttribute('aria-label') || '')); })()`),
  await b.evalJs(`JSON.stringify([...document.querySelectorAll('.fusion-social-networks a')].map((x) => x.getAttribute('href') + ' ' + x.getAttribute('aria-label')))`));
await b.close();
({ b, parsed } = await open('/'));
check('home: "Learn More" buttons now say where they go', await b.evalJs(`(() => { const a = [...document.querySelectorAll('a[href*="best-computer-repair-chesterfield-va"].fusion-button')]; return a.length === 2 && a.every((x) => x.textContent.trim() === 'See Chesterfield service'); })()`));
check('home: no dead widget scripts ran', !parsed.some((u) => DEAD.test(u)), parsed.filter((u) => DEAD.test(u)).join(' '));
check('home: blocking caused no script errors', parsed.errors.length === 0, parsed.errors.join(' | '));
check('home: page title has the city', (await b.evalJs('document.title')) === 'Computer Repair in Chesterfield, VA | Bob The Tech Guy' && (await b.evalJs(`document.querySelector('meta[property="og:title"]').content`)) === 'Computer Repair in Chesterfield, VA | Bob The Tech Guy');
check('home: page still finishes loading the bundle', await b.evalJs(`document.documentElement.classList.contains('btg-ready')`));
await b.close();
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
