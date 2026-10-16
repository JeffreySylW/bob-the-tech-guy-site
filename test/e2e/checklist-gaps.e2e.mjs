// Service-page bullet lists: the space between items must be the same everywhere. Run: node test/e2e/checklist-gaps.e2e.mjs
// (2026-10-16: in the two-column grid every row was as tall as its longest item, so a short item beside a long one sat
// 35-163px above the next one instead of ~10px.)
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
const server = await serve(4495);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

// For each list: group the items by column, then measure the gap between where one item's TEXT ends and the next one's starts
// (an item's own box is stretched by the layout, so its edges say nothing about what the eye sees).
const PROBE = `JSON.stringify([...document.querySelectorAll('.btg-checklist')].filter((ul) => ul.offsetParent).map((ul) => {
  const items = [...ul.children].map((li) => { const g = document.createRange(); g.selectNodeContents(li); const t = g.getBoundingClientRect(); return { left: Math.round(li.getBoundingClientRect().left / 10), top: t.top, bottom: t.bottom }; });
  const cols = {}; items.forEach((i) => { (cols[i.left] = cols[i.left] || []).push(i); });
  const gaps = []; Object.values(cols).forEach((c) => { c.sort((a, b) => a.top - b.top); for (let k = 1; k < c.length; k++) gaps.push(c[k].top - c[k - 1].bottom); });
  return { items: items.length, columns: Object.keys(cols).length, spread: gaps.length ? +(Math.max(...gaps) - Math.min(...gaps)).toFixed(1) : 0, gaps: [...new Set(gaps.map((g) => Math.round(g)))] };
}))`;

for (const [w, h, cols] of [[1440, 900, 2], [800, 900, 2], [390, 844, 1]]) {
  const b = await launch({ width: w, height: h, mobile: w < 600 });
  for (const page of ['computer-tune-up', 'backup-solutions', 'computer-set-up', 'memory-install']) {
    await b.goto(`http://localhost:4495/${page}/`); await b.sleep(2500);
    const lists = JSON.parse(await b.evalJs(PROBE));
    check(`${w} ${page}: has a bullet list`, lists.length > 0);
    lists.forEach((l, i) => {
      check(`${w} ${page} list ${i + 1}: same space between every pair of items`, l.spread <= 1, `gaps ${l.gaps.join(',')}px (${l.items} items)`);
    });
    const two = lists.filter((l) => l.items >= 4 && page !== 'memory-install');
    two.forEach((l) => check(`${w} ${page}: ${cols} column(s) at this width`, l.columns === cols, `${l.columns} columns`));
  }
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
