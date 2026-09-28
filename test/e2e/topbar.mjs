// Usage: node test/e2e/topbar.mjs <baseUrl>   e.g. https://bobthetechguy.com or http://localhost:4410
import { launch } from './cdp.mjs';
const base = (process.argv[2] || 'https://bobthetechguy.com').replace(/\/$/, '');
const b = await launch({ width: 1440, height: 900 });
const out = {};
for (const p of ['about', 'testimonials', 'memory-install', '']) {
  await b.goto(`${base}/${p}${p ? '/' : ''}?v=${Date.now()}`);
  out[p || 'home'] = await b.evalJs(`(() => { const e = document.querySelector('.fusion-secondary-header .fusion-contact-info'); if (!e) return null; const s = getComputedStyle(e); return { family: s.fontFamily, size: s.fontSize, weight: s.fontWeight }; })()`);
}
console.log(JSON.stringify(out, null, 1));
await b.close();
