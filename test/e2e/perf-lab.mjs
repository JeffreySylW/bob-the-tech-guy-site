// Throttled mobile lab test of the LIVE site, same setup as the 2026-10-13 / 10-19 audits:
// headless Edge, 390x844, 1.6 Mbps down / 750 kbps up / 150 ms, 4x CPU, cold cache (fresh profile per run).
// Run: node test/e2e/perf-lab.mjs [runs] [--head file]  -> one JSON line per page per run.
// With --head, the live page's "Space before </head>" block (<!-- btg-head v1 --> ... </head>) is swapped for the
// file's contents before the browser sees it, so a head-field change can be measured before it ships. Both arms
// go through the same interception, so A and B are throttled the same way.
import { readFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const args = process.argv.slice(2);
const runs = Number(args.find((a) => /^\d+$/.test(a)) || 2);
const headFile = args.includes('--head') ? args[args.indexOf('--head') + 1] : null;
const head = headFile ? readFileSync(headFile, 'utf8') : null;
const PAGES = ['/', '/contact-2/', '/networking/', '/best-computer-repair-chesterfield-va/', '/remote-support/'];
const OBSERVE = `window.__lab = { lcp: 0, lcpEl: '', cls: 0 };
new PerformanceObserver((l) => { for (const e of l.getEntries()) { __lab.lcp = e.startTime; __lab.lcpEl = e.element ? e.element.tagName + '.' + e.element.className : ''; } }).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) __lab.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });`;

for (let run = 1; run <= runs; run++) {
  for (const page of PAGES) {
    const b = await launch({ width: 390, height: 844, mobile: true });
    await b.send('Network.enable');
    await b.send('Network.setCacheDisabled', { cacheDisabled: true });
    await b.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    await b.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await b.send('Page.addScriptToEvaluateOnNewDocument', { source: OBSERVE });
    let swapped = 0;
    await b.send('Fetch.enable', { patterns: [{ urlPattern: 'https://bobthetechguy.com/*', resourceType: 'Document', requestStage: 'Response' }] });
    b.on('Fetch.requestPaused', async (p) => {
      const r = await b.send('Fetch.getResponseBody', { requestId: p.requestId });
      let html = r.result.base64Encoded ? Buffer.from(r.result.body, 'base64').toString('utf8') : r.result.body;
      if (head) {
        const i = html.indexOf('<!-- btg-head v1 -->'), j = html.indexOf('</head>', i);
        if (i !== -1 && j !== -1) { html = html.slice(0, i) + head + html.slice(j); swapped++; }
      }
      const headers = p.responseHeaders.filter((h) => !/^(content-length|content-encoding|transfer-encoding)$/i.test(h.name));
      await b.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: p.responseStatusCode, responseHeaders: headers, body: Buffer.from(html).toString('base64') });
    });
    const reqs = [];
    b.on('Network.responseReceived', (p) => reqs.push(p.response.url));
    await b.goto('https://bobthetechguy.com' + page + '?lab=' + Date.now());
    await b.sleep(4000);
    const m = await b.evalJs(`JSON.stringify(Object.assign({}, __lab, { ttfb: performance.getEntriesByType('navigation')[0].responseStart, fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime, dcl: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd, load: performance.getEntriesByType('navigation')[0].loadEventEnd }))`);
    const t = JSON.parse(m); for (const k of ['lcp', 'ttfb', 'fcp', 'dcl', 'load']) t[k] = Math.round(t[k]); t.cls = Math.round(t.cls * 1000) / 1000;
    const fonts = reqs.filter((u) => /\.woff2?($|\?)/.test(u)).map((u) => u.replace(/^https:\/\/[^/]+/, '').slice(-48));
    console.log(JSON.stringify({ run, page, arm: head ? 'B' : 'A', swapped, ...t, requests: reqs.length, fonts }));
    await b.close();
  }
}
