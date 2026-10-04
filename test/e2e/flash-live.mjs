// Diagnostic: on a live page, did the browser paint before the loader's hide-style was parsed?
// Run: node test/e2e/flash-live.mjs [path] [slow]
import { launch } from './cdp.mjs';
const path = process.argv[2] || '/networking/';
const b = await launch({ width: 1440, height: 900 });
await b.send('Network.enable');
if (process.argv[3] === 'slow') await b.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 100000 });
await b.goto('https://bobthetechguy.com/about/'); // warm cache, like clicking from another page
await b.send('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__t = {};
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) {
    const now = performance.now();
    if (n.id === 'main' && !__t.main) __t.main = now;
    if (n.classList && n.classList.contains('fusion-header-wrapper') && !__t.header) __t.header = now;
    if (n.tagName === 'STYLE' && /btg-reveal/.test(n.textContent || '') && !__t.hide) __t.hide = now;
    if (n.tagName === 'SCRIPT' && /btg\\.js/.test(n.src || '') && !__t.js) __t.js = now;
  } }).observe(document, { childList: true, subtree: true });
  new MutationObserver(() => { if (!__t.ready && document.documentElement.classList.contains('btg-ready')) __t.ready = performance.now(); }).observe(document.documentElement, { attributes: true });
` });
await b.goto('https://bobthetechguy.com' + path);
const r = await b.evalJs(`JSON.stringify(Object.assign({}, __t, { fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime, fp: (performance.getEntriesByName('first-paint')[0] || {}).startTime, styleIndex: document.documentElement.innerHTML.indexOf('btg-reveal'), htmlLen: document.documentElement.innerHTML.length }))`);
const t = JSON.parse(r); for (const k in t) if (typeof t[k] === 'number') t[k] = Math.round(t[k]);
console.log(path, JSON.stringify(t));
console.log(t.fp < t.hide ? 'PAINTED BEFORE HIDE-STYLE by ' + (t.hide - t.fp) + 'ms' : 'no early paint');
await b.close();
