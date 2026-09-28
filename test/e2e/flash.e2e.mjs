// The old header must never show while the bundle loads. Run: node test/e2e/flash.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
// Sample the header's visibility every frame from the very start of the page.
const SAMPLER = `window.__s = []; const t0 = performance.now(); (function f() { const h = document.querySelector('.fusion-header-wrapper'); if (h) window.__s.push([Math.round(performance.now() - t0), getComputedStyle(h).visibility, document.documentElement.classList.contains('btg-ready'), document.documentElement.classList.contains('btg-header-on')]); if (performance.now() - t0 < 4000) requestAnimationFrame(f); })();`;
async function run(delay, port) {
  process.env.BTG_DELAY = String(delay);
  const server = await serve(port);
  const b = await launch({ width: 1440, height: 900 });
  await b.send('Page.addScriptToEvaluateOnNewDocument', { source: SAMPLER });
  await b.goto(`http://localhost:${port}/search/?q=wifi`);
  await b.sleep(2500);
  const s = JSON.parse(await b.evalJs('JSON.stringify(window.__s)'));
  await b.close(); server.close();
  return s;
}
const slow = await run(700, 4420);
const shownEarly = slow.filter((r) => r[1] === 'visible' && !r[2] && !r[3]);
check('700ms bundle: the old header is never visible before the bundle is ready', shownEarly.length === 0, JSON.stringify(shownEarly.slice(0, 2)));
check('700ms bundle: header is visible once ready', slow.some((r) => r[1] === 'visible' && r[2] && r[3]));
const dead = await run(6000, 4421);
const last = dead[dead.length - 1];
check('bundle never arrives: page is revealed by the CSS fail-safe', dead.some((r) => r[1] === 'visible') && last[1] === 'visible', JSON.stringify(last));
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
