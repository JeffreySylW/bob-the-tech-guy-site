// Browser test for Bob's helper, phase 2: the question box, Worker replies with service cards, the AI summary in the
// request form, the error fallback and the chat limit. The Worker is mocked by serve.mjs (/__helper-api); nothing calls Claude.
// Run: node test/e2e/helper-ai.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const PORT = 4474, BASE = 'http://localhost:' + PORT;
const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const ask = (q) => `(() => { const i = document.querySelector('#btg-hp-q'); i.value = ${JSON.stringify(q)}; i.form.requestSubmit(); return true; })()`;
const lastBot = `[...document.querySelectorAll('.btg-hp-bot')].pop().innerText`;
const waitReply = async (b) => { await b.sleep(150); for (let t = 0; t < 80 && await b.evalJs(`!!document.querySelector('.btg-hp-typing')`); t++) await b.sleep(50); await b.sleep(100); };

// Without a Worker address (today's bundle) there is no question box: phase 1 only.
let server = await serve(PORT);
let b = await launch({ width: 1440, height: 900 });
await b.goto(BASE + '/'); await b.sleep(500);
await b.evalJs(`document.querySelector('.btg-hp-launch').click()`); await b.sleep(150);
check('no HELPER_API: no question box, phase 1 greeting', await b.evalJs(`!document.querySelector('.btg-hp-ask') && /Pick what's going on and I'll point you/.test(document.querySelector('.btg-hp-bot').innerText)`));
await b.close(); server.close();

process.env.BTG_HELPER_API = '/__helper-api';
server = await serve(PORT);
const chats = async () => (await fetch(BASE + '/__helper-log')).json();
for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  b = await launch({ width: w, height: h, mobile: m });
  await b.goto(BASE + '/'); await b.sleep(500);
  await b.evalJs(`document.querySelector('.btg-hp-launch').click()`); await b.sleep(150);
  check(w + ' question box in the footer, above both phones and the privacy line', await b.evalJs(`(() => { const f = document.querySelector('.btg-hp-foot'), a = f.querySelector('.btg-hp-ask');
    return !!a && f.firstElementChild === a && a.querySelector('input').maxLength === 500 && !!a.querySelector('label') && f.innerText.includes('Chats are answered by an AI service') && f.innerText.includes('844-TEKGUY-0'); })()`));
  check(w + ' AI greeting mentions typing a question', await b.evalJs(`/type your question below/.test(document.querySelector('.btg-hp-bot').innerText)`));

  const before = (await chats()).length;
  await b.evalJs(`[...document.querySelectorAll('.btg-hp-chips button')][3].click()`); await b.sleep(150); // Wi-Fi chip
  await b.evalJs(ask('My wifi keeps dropping every evening, call me 804-555-0100')); await waitReply(b);
  const sent = (await chats())[before];
  check(w + ' the chip and the typed question go to the Worker as one alternating chat', sent && JSON.stringify(sent.messages.map((x) => x.role)) === '["user","assistant","user"]' &&
    sent.messages[0].content === 'Wi-Fi trouble' && /keeps dropping/.test(sent.messages[2].content), JSON.stringify(sent && sent.messages));
  check(w + ' reply shown, unknown slug dropped, two real cards plus next-step chips', await b.evalJs(`(() => { const t = ${lastBot}; const cards = [...document.querySelectorAll('.btg-hp-cards-wrap')].pop().querySelectorAll('.btg-hp-card');
    return t === 'Bob sets up and fixes home Wi-Fi and routers.' && cards.length === 2 && cards[0].querySelector('.btg-hp-card-title').innerText === 'Networking' && !!document.querySelector('.btg-hp-chips'); })()`));
  check(w + ' question box is ready again, typing dots gone', await b.evalJs(`!document.querySelector('#btg-hp-q').disabled && !document.querySelector('.btg-hp-typing')`));
  await b.shot(`${out}/helper-ai-${w}-reply.png`);

  await b.evalJs(`[...document.querySelectorAll('.btg-hp-cards-wrap')].pop().querySelector('.btg-hp-request').click()`); await b.sleep(150);
  check(w + ' request form pre-filled with the AI summary and the chosen service', await b.evalJs(`[...document.querySelectorAll('.btg-hp-form')].pop().elements.summary.value === 'Wi-Fi keeps dropping in the evening. Interested in: Networking.'`));

  await b.evalJs(ask('this will error')); await waitReply(b);
  check(w + ' Worker error: apology plus both phone numbers, request chips, box usable', await b.evalJs(`(() => { const t = ${lastBot}; return /can't answer right now/.test(t) && /844-TEKGUY-0/.test(t) && /210-5656/.test(t) && !!document.querySelector('.btg-hp-chips') && !document.querySelector('#btg-hp-q').disabled; })()`));
  await b.evalJs(ask('how much does a tune up cost')); await waitReply(b);
  const last = (await chats()).pop();
  check(w + ' after an error the next question is joined to the unanswered one (chat stays alternating)', last.messages.every((x, i) => x.role === (i % 2 ? 'assistant' : 'user')) && /this will error\nhow much/.test(last.messages.slice(-1)[0].content));
  check(w + ' price question: the no-price line', await b.evalJs(`${lastBot} === 'Bob gives a price once he has looked at the job.'`));
  check(w + ' no horizontal scroll', !(await b.evalJs(`document.documentElement.scrollWidth > innerWidth`)));
  check(w + ' panel header still in view after the form and several replies', await b.evalJs(`(() => { const p = document.querySelector('.btg-hp-panel'), h = p.querySelector('.btg-hp-head').getBoundingClientRect(); return p.scrollTop === 0 && h.top >= p.getBoundingClientRect().top - 1 && h.bottom > 0; })()`));
  await b.shot(`${out}/helper-ai-${w}-price.png`);

  await b.evalJs(`document.querySelector('.btg-hp-restart').click()`); await b.sleep(100);
  for (let i = 0; i < 12; i++) {
    await b.evalJs(ask('wifi question ' + i));
    for (let t = 0; t < 40 && await b.evalJs(`!!document.querySelector('.btg-hp-typing')`); t++) await b.sleep(50);
  }
  check(w + ' after 12 questions the box locks and points to the request form', await b.evalJs(`(() => { const i = document.querySelector('#btg-hp-q'); return i.disabled && /Chat limit reached/.test(i.placeholder); })()`));
  const capped = (await chats()).pop();
  check(w + ' restart cleared the old chat; no chat over 12 visitor turns was sent', capped.messages.filter((x) => x.role === 'user').length === 12 && capped.messages[0].content === 'wifi question 0');
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
