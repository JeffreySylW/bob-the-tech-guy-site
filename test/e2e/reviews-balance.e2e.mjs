// Reviews page: the two columns of review cards must end at about the same height. Run: node test/e2e/reviews-balance.e2e.mjs
// (2026-10-17: with CSS columns the cards stay in order and never split, so Daniel Deraney's 720px card left the left
// column 683px shorter than the right. Jeff chose masonry: each card goes into the shorter column.)
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
const server = await serve(4496);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

// Order of the reviews on page 1 as the plugin prints them (live, 2026-10-17).
const ORIGINAL = ['Frank Abate', 'Lauren', 'George Courter', 'Daniel F. Deraney, Esq.', 'Selena', 'Larry Bertola', 'John Penek, MD', 'Dianne S.', 'jerry hurley', 'Pete'];

const PROBE = `JSON.stringify((() => {
  const cards = [...document.querySelectorAll('.wpcr3_reviews_holder .wpcr3_review')].filter((c) => c.offsetParent);
  const boxes = cards.map((c) => { const r = c.getBoundingClientRect(); return { name: c.querySelector('.wpcr3_review_author .wpcr3_caps').textContent.trim(), left: Math.round(r.left / 10), top: r.top + scrollY, bottom: r.bottom + scrollY, height: r.height }; });
  const cols = {}; boxes.forEach((b) => { (cols[b.left] = cols[b.left] || []).push(b); });
  const bottoms = Object.values(cols).map((c) => Math.max(...c.map((b) => b.bottom)));
  const scope = document.querySelector('.wpcr3_reviews_holder [itemscope][itemtype="https://schema.org/LocalBusiness"]');
  return {
    count: cards.length,
    columns: Object.keys(cols).length,
    diff: Math.round(Math.max(...bottoms) - Math.min(...bottoms)),
    avg: Math.round(boxes.reduce((s, b) => s + b.height, 0) / boxes.length),
    order: [...boxes].sort((a, b) => a.top - b.top).map((b) => b.name),
    inSchema: cards.filter((c) => c.getAttribute('itemprop') === 'review' && scope && scope.contains(c)).length,
  };
})())`;

const b = await launch({ width: 1440, height: 900 });
const size = async (w, h, mobile) => { await b.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile }); await b.sleep(1200); };
const desktop = async (label) => {
  const r = JSON.parse(await b.evalJs(PROBE));
  check(`${label}: all 10 reviews show`, r.count === 10, `${r.count}`);
  check(`${label}: two columns`, r.columns === 2, `${r.columns}`);
  check(`${label}: column bottoms within one card height`, r.diff < r.avg, `differ by ${r.diff}px, average card ${r.avg}px`);
  check(`${label}: every review still in the business schema`, r.inSchema === 10, `${r.inSchema}`);
};
const phone = async (label) => {
  const r = JSON.parse(await b.evalJs(PROBE));
  check(`${label}: one column`, r.columns === 1, `${r.columns}`);
  check(`${label}: original order`, JSON.stringify(r.order) === JSON.stringify(ORIGINAL), r.order.join(' | '));
  check(`${label}: every review still in the business schema`, r.inSchema === 10, `${r.inSchema}`);
};

await b.goto('http://localhost:4496/reviews/'); await b.sleep(2500);
await desktop('1440');
await size(1024, 900, false); await desktop('1024');
await size(390, 844, true); await phone('390');
await size(1440, 900, false); await desktop('back to 1440');
await b.close();

// Loaded at phone width from the start (no resize).
const m = await launch({ width: 390, height: 844, mobile: true });
await m.goto('http://localhost:4496/reviews/'); await m.sleep(2500);
const r = JSON.parse(await m.evalJs(PROBE));
check('390 on load: one column', r.columns === 1, `${r.columns}`);
check('390 on load: original order', JSON.stringify(r.order) === JSON.stringify(ORIGINAL), r.order.join(' | '));
await m.close();
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
