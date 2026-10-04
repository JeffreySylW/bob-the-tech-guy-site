// Browser test: the four "Why Choose Bob?" cards animate in together while scrolling (v1.7.3).
// Run: node test/e2e/home-cards.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
const server = await serve(4490);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
for (const [w, h, m] of [[1440, 760, false], [1100, 700, false]]) {
  const b = await launch({ width: w, height: h, mobile: m });
  await b.goto('http://localhost:4490/'); await b.sleep(2000);
  const seen = await b.evalJs(`new Promise(async (ok) => {
    const cards = [...document.querySelectorAll('.fusion-content-boxes-1 .fusion-animated')];
    const top = document.querySelector('.fusion-content-boxes-1').getBoundingClientRect().top + scrollY;
    const counts = [];
    for (let y = top - innerHeight - 200; y < top + 400; y += 25) {
      scrollTo(0, y); await new Promise((r) => setTimeout(r, 120));
      counts.push(cards.filter((c) => getComputedStyle(c).visibility === 'visible').length);
    }
    ok({ n: cards.length, counts: [...new Set(counts)] });
  })`);
  check(w + 'px: all four cards appear at the same moment', seen.n === 4 && seen.counts.every((c) => c === 0 || c === 4) && seen.counts.includes(4), JSON.stringify(seen));
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
