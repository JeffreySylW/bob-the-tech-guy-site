// Browser test for the v1.8.0 footer (layout A: Virginia | Northern New Jersey | Explore | Why Bob). Run: node test/e2e/footer.e2e.mjs
// (needs internet: Leaflet from cdnjs and OpenStreetMap tiles)
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4450);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
for (const [w, h, m] of [[1440, 900, false], [1100, 800, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile: m });
  await b.goto('http://localhost:4450/about/');
  await b.sleep(1800);
  check(w + ': four columns in order: Virginia, Northern New Jersey, Explore, Why Bob', await b.evalJs(`JSON.stringify([...document.querySelectorAll('.fusion-footer-widget-area .fusion-column')].map((c) => (c.querySelector('.widget-title') || {}).textContent)) === JSON.stringify(['Virginia', 'Northern New Jersey', 'Explore', 'Why Bob'])`),
    await b.evalJs(`JSON.stringify([...document.querySelectorAll('.fusion-footer-widget-area .fusion-column')].map((c) => (c.querySelector('.widget-title') || {}).textContent))`));
  check(w + ': "Computer Repair Experts" is gone, and no Google pin map or address in the footer', await b.evalJs(`!document.querySelector('#recent-posts-6') && !/Computer Repair Experts/i.test(document.querySelector('.fusion-footer').innerText) && !document.querySelector('.fusion-footer iframe') && !/Broadway/.test(document.querySelector('.fusion-footer').innerText)`));
  check(w + ': Virginia column: phone, email, hours, map, link to the Virginia page; no NJ number', await b.evalJs(`(() => { const c = document.querySelector('#text-3'); return !!c.querySelector('a[href="tel:8448354890"]') && !!c.querySelector('a[href^="mailto:"]') && c.querySelectorAll('.btg-foot-hours dt').length === 4 && !!c.querySelector('.btg-foot-zone') && !!c.querySelector('a[href$="/best-computer-repair-chesterfield-va/"]') && !/210-5656/.test(c.innerText); })()`));
  check(w + ': New Jersey column: NJ phone, email, map, link to the NJ page; no Virginia number, no hours', await b.evalJs(`(() => { const c = document.querySelector('.btg-foot-zone.btg-zone-nj').closest('.btg-foot'); return !!c.querySelector('a[href="tel:8622105656"]') && !!c.querySelector('a[href^="mailto:"]') && !!c.querySelector('a[href$="/northern-new-jersey/"]') && !/844/.test(c.innerText) && !c.querySelector('.btg-foot-hours'); })()`));
  check(w + ': Explore column: the 5 main links', await b.evalJs(`[...document.querySelectorAll('.btg-foot-links a')].map((a) => a.textContent).join('|') === 'Services|About Bob|Gallery|Testimonials|Contact'`));
  check(w + ': Why Bob column: veteran badge, then the Google rating; no hours here', await b.evalJs(`(() => { const c = document.querySelector('#text-16').closest('.fusion-column'); const kids = [...c.querySelectorAll('.btg-vet--dark, .btg-foot-rating')].map((x) => x.className.split(' ')[0]); return kids.join() === 'btg-vet,btg-foot-rating' && !c.querySelector('.btg-foot-hours'); })()`));
  check(w + ': no empty footer column, no horizontal scroll', await b.evalJs(`[...document.querySelectorAll('.fusion-footer .fusion-footer-widget-area .fusion-column')].every((c) => c.querySelector('.fusion-footer-widget-column')) && document.documentElement.scrollWidth <= innerWidth`));
  check(w + ': NJ link dedupe leaves the footer alone', await b.evalJs(`(() => { BTGInit.rewriteNjLinks(document); return /210-5656/.test(document.querySelector('.btg-foot-zone.btg-zone-nj').closest('.btg-foot').innerText) && /Chesterfield/.test(document.querySelector('#text-3').innerText); })()`));
  check(w + ': bottom bar: the new line, no Nine73 or Pompton Lakes, social icons stay', await b.evalJs(`(() => { const t = document.querySelector('.fusion-copyright-notice').innerText.trim(); return /^\\u00a9 \\d{4} Bob The Tech Guy \\u00b7 Serving Chesterfield and Greater Richmond, VA, and northern New Jersey$/.test(t) && !/Nine73|Pompton/i.test(document.querySelector('#footer').innerText) && document.querySelectorAll('.fusion-social-networks a').length === 3; })()`),
    await b.evalJs(`document.querySelector('.fusion-copyright-notice').innerText.trim()`));
  await b.evalJs(`document.querySelector('.btg-foot-zone.btg-zone-nj').scrollIntoView({ block: 'center' })`); await b.sleep(4500);
  check(w + ': both maps drew (shaded area + towns)', await b.evalJs(`document.querySelectorAll('#text-3 .btg-foot-zone path.leaflet-interactive').length === 10 && document.querySelectorAll('.btg-foot-zone.btg-zone-nj path.leaflet-interactive').length === 22`));
  check(w + ': Virginia and NJ maps are exactly level (same top, same height) when side by side', await b.evalJs(`(() => { const a = document.querySelector('#text-3 .btg-foot-zone').getBoundingClientRect(), b = document.querySelector('.btg-foot-zone.btg-zone-nj').getBoundingClientRect(); const stacked = Math.abs(a.left - b.left) < 100; return ${m ? 'stacked' : '!stacked && Math.abs(a.top - b.top) < 0.6 && Math.abs(a.height - b.height) < 0.6'}; })()`),
    await b.evalJs(`(() => { const a = document.querySelector('#text-3 .btg-foot-zone').getBoundingClientRect(), b = document.querySelector('.btg-foot-zone.btg-zone-nj').getBoundingClientRect(); return 'VA top ' + a.top.toFixed(1) + ' / NJ top ' + b.top.toFixed(1); })()`));
  check(w + ': NJ footer map starts zoomed out like the Virginia one (shaded area fills no more of its map)', await b.evalJs(`(() => { const fill = (sel) => { const m = document.querySelector(sel), poly = m.querySelector('path.leaflet-interactive'); const r = m.getBoundingClientRect(), p = poly.getBoundingClientRect(); return Math.max(p.width / r.width, p.height / r.height); }; const va = fill('#text-3 .btg-foot-zone'), nj = fill('.btg-foot-zone.btg-zone-nj'); window.__fill = [va, nj]; return nj <= va + 0.08; })()`),
    await b.evalJs(`'VA fills ' + window.__fill[0].toFixed(2) + ' / NJ fills ' + window.__fill[1].toFixed(2)`));
  check(w + ': the Virginia and NJ headings are level too (only the space above the map absorbs the difference)', await b.evalJs(`(() => { const a = document.querySelector('#text-3 .widget-title').getBoundingClientRect(), b = document.querySelector('.btg-foot-zone.btg-zone-nj').closest('.btg-foot').querySelector('.widget-title').getBoundingClientRect(); const stacked = Math.abs(a.left - b.left) < 100; return ${m ? 'stacked' : '!stacked && Math.abs(a.top - b.top) < 0.6'}; })()`));
  await b.evalJs(`document.querySelector('.fusion-footer').scrollIntoView()`); await b.sleep(500);
  await b.shot(`${out}/foot-a-${w}.png`);
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
