// Pre-release check for Bob's helper on the REAL site: opens https://bobthetechguy.com in headless Edge and answers the
// page's jsDelivr btg.js/btg.css requests with this working copy, so the widget talks to the deployed Worker from Bob's own
// origin. Changes nothing on the site. It makes real Claude calls (a few, costing well under a cent) and NEVER submits the
// request form. Run: node test/e2e/helper-live.mjs
import { launch } from './cdp.mjs';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const files = { 'btg.js': ['application/javascript', readFileSync(path.join(root, 'dist/btg.js'))], 'btg.css': ['text/css', readFileSync(path.join(root, 'dist/btg.css'))] };
const lastBot = `[...document.querySelectorAll('.btg-hp-bot')].pop().innerText`;
const waitReply = async (b) => { for (let t = 0; t < 120 && await b.evalJs(`!!document.querySelector('.btg-hp-typing')`); t++) await b.sleep(250); };

for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile: m });
  const swapped = [], posts = [];
  await b.send('Fetch.enable', { patterns: [{ urlPattern: '*cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@*/dist/btg.*' }] });
  b.on('Fetch.requestPaused', (p) => {
    const name = p.request.url.split('/').pop().split('?')[0], f = files[name];
    if (!f) return b.send('Fetch.continueRequest', { requestId: p.requestId });
    swapped.push(name);
    b.send('Fetch.fulfillRequest', { requestId: p.requestId, responseCode: 200, responseHeaders: [{ name: 'content-type', value: f[0] }, { name: 'access-control-allow-origin', value: '*' }], body: f[1].toString('base64') });
  });
  await b.send('Network.enable');
  b.on('Network.requestWillBeSent', (p) => { if (p.request.method === 'POST') posts.push(p.request.url); });
  await b.goto('https://bobthetechguy.com/?btg-helper-check=' + Date.now()); await b.sleep(1500);
  check(w + ' the page ran this working copy of btg.js and btg.css', swapped.includes('btg.js') && swapped.includes('btg.css'), swapped.join(','));
  await b.evalJs(`document.querySelector('.btg-hp-launch').click()`); await b.sleep(200);
  check(w + ' question box shown (HELPER_API set)', await b.evalJs(`!!document.querySelector('#btg-hp-q')`));
  await b.evalJs(`(() => { const i = document.querySelector('#btg-hp-q'); i.value = 'My laptop is really slow and full of pop-ups'; i.form.requestSubmit(); })()`);
  await waitReply(b);
  const reply = await b.evalJs(lastBot);
  check(w + ' live Worker answered from bobthetechguy.com (not the fallback)', reply && !/can't answer right now/.test(reply) && !/goes over with you himself/.test(reply), reply);
  check(w + ' with service cards and the request chips', await b.evalJs(`document.querySelectorAll('.btg-hp-card').length >= 1 && !!document.querySelector('.btg-hp-chips')`),
    await b.evalJs(`[...document.querySelectorAll('.btg-hp-card-title')].map((x) => x.innerText).join(', ')`));
  await b.evalJs(`[...document.querySelectorAll('.btg-hp-chips button')].find((x) => x.innerText === 'Send Bob a request').click()`); await b.sleep(300);
  const summary = await b.evalJs(`[...document.querySelectorAll('.btg-hp-form')].pop().elements.summary.value`);
  check(w + ' request form pre-filled with the AI summary (not submitted)', summary && summary.length > 10, summary);
  check(w + ' only POSTs were to the Worker (the CF7 form was never sent)', posts.length >= 1 && posts.every((u) => u.startsWith('https://bob-helper.bobthetechguy.workers.dev/chat')), posts.join(' '));
  check(w + ' no horizontal scroll, panel header in view', await b.evalJs(`document.documentElement.scrollWidth <= innerWidth && document.querySelector('.btg-hp-panel').scrollTop === 0`));
  await b.shot(`${out}/helper-live-${w}.png`);
  await b.close();
}
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
