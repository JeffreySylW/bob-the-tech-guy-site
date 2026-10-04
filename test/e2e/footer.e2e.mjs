// Browser test for the v1.6.5 footer additions on the About stand-in. Run: node test/e2e/footer.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4450);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile: m });
  await b.goto('http://localhost:4450/about/');
  await b.sleep(1500);
  check(w + ': contact block replaces the old address and map', await b.evalJs(`(() => { const t = document.querySelector('#text-3'); return !!t.querySelector('.btg-foot-contact-list') && !t.querySelector('iframe') && !/Pompton Lakes, NJ/.test(t.innerText); })()`));
  check(w + ': quick links in a footer column, 6 links', await b.evalJs(`document.querySelectorAll('.fusion-footer .fusion-column .btg-foot-links a').length === 6`));
  check(w + ': rating badge right after the veteran badge', await b.evalJs(`!!document.querySelector('#text-16 + .btg-foot .btg-foot-rating')`));
  check(w + ': no empty footer column', await b.evalJs(`[...document.querySelectorAll('.fusion-footer .fusion-footer-widget-area .fusion-column')].every((c) => c.querySelector('.fusion-footer-widget-column'))`));
  check(w + ': no horizontal scroll', !(await b.evalJs(`document.documentElement.scrollWidth > innerWidth`)));
  await b.evalJs(`document.querySelector('.fusion-footer').scrollIntoView()`); await b.sleep(600);
  await b.shot(`${out}/footer-new-${w}.png`);
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
