// Browser test for Bob's helper, phase 1: launcher on every page, chips -> service cards -> request form -> confirmation.
// The CF7 form is mocked by serve.mjs (POST .../contact-forms/16906/feedback, read back from /__cf7); nothing reaches the live site.
// Run: node test/e2e/helper.e2e.mjs
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const PORT = 4472, BASE = 'http://localhost:' + PORT;
const server = await serve(PORT);
const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const posts = async () => (await fetch(BASE + '/__cf7')).json();
// Pin the page clock: Tuesday 11 AM ET (open) or Monday (closed).
const pinClock = (iso) => `(() => { const R = Date; window.Date = class extends R { constructor(...a) { super(...(a.length ? a : ['${iso}'])); } static now() { return new R('${iso}').getTime(); } }; })()`;
const lastForm = `[...document.querySelectorAll('.btg-hp-form')].pop()`;
const fill = (sel, v) => `${lastForm}.querySelector('${sel}').value = ${JSON.stringify(v)}`;

for (const [w, h, m] of [[1440, 900, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile: m });
  for (const page of ['/', '/contact-2/', '/computer-tune-up/', '/northern-new-jersey/', '/about/']) {
    await b.goto(BASE + page); await b.sleep(600);
    check(`${w} ${page}: one launcher, bottom-right, labelled "Ask Bob's helper"`, await b.evalJs(`(() => { const l = document.querySelectorAll('.btg-hp-launch'); if (l.length !== 1) return false; const r = l[0].getBoundingClientRect();
      return l[0].innerText.trim() === "Ask Bob's helper" && innerWidth - r.right <= 24 && innerHeight - r.bottom <= 24 && r.width > 100 && getComputedStyle(l[0]).position === 'fixed'; })()`));
  }
  await b.goto(BASE + '/'); await b.sleep(600);
  await b.evalJs(pinClock(m ? '2026-10-26T15:00:00Z' : '2026-10-27T15:00:00Z'));
  await b.evalJs(`document.querySelector('.btg-hp-launch').click()`); await b.sleep(200);
  check(w + ' open: panel shown, launcher hidden, expanded state, focus on the first chip', await b.evalJs(`(() => { const p = document.querySelector('.btg-hp-panel'); return !p.hidden && document.querySelector('.btg-hp-launch').hidden &&
    document.querySelector('.btg-hp-launch').getAttribute('aria-expanded') === 'true' && document.activeElement === p.querySelector('.btg-hp-chips button'); })()`));
  check(w + ' open: six topic chips plus "Something else"', await b.evalJs(`[...document.querySelectorAll('.btg-hp-chips button')].map((x) => x.innerText).join('|') === "It's running slow|Virus or pop-ups|Won't turn on|Wi-Fi trouble|Lost files|Cracked screen|Something else"`));
  check(w + ' open: privacy line and both phone numbers visible', await b.evalJs(`(() => { const f = document.querySelector('.btg-hp-foot'); return f.innerText.includes('Chats are answered by an AI service and deleted within 30 days.') &&
    !!f.querySelector('a[href="tel:+18448354890"]') && !!f.querySelector('a[href="tel:+18622105656"]') && f.getBoundingClientRect().bottom <= innerHeight + 1; })()`));
  const geo = await b.evalJs(`(() => { const r = document.querySelector('.btg-hp-panel').getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), w: Math.round(r.width), vw: innerWidth, vh: innerHeight }; })()`);
  if (m) check(w + ' phone: bottom sheet, full width, docked to the bottom, most of the screen', geo.l === 0 && geo.r === geo.vw && geo.b === geo.vh && geo.t > 40 && geo.t < geo.vh * 0.2, JSON.stringify(geo));
  else check(w + ' desktop: panel bottom-right, 390px wide', geo.r >= geo.vw - 24 && geo.b >= geo.vh - 24 && geo.w === 390 && geo.t > 0, JSON.stringify(geo));
  await b.shot(`${out}/helper-${w}-open.png`);

  await b.evalJs(`document.querySelector('.btg-hp-chips button').click()`); await b.sleep(200);
  check(w + ' slow: three service cards from the site DESCRIPTIONS, each with Read more + Request this service', await b.evalJs(`(() => { const c = [...document.querySelectorAll('.btg-hp-card')]; return c.length === 3 &&
    c.map((x) => x.querySelector('.btg-hp-card-title').innerText).join('|') === 'Computer Tune Up|Memory Install|Remote Support' &&
    c[0].querySelector('p').innerText === window.BTGInit.DESCRIPTIONS['/computer-tune-up/'] && c.every((x) => x.querySelector('a.btg-hp-more').getAttribute('href').startsWith('/') && x.querySelector('.btg-hp-request').innerText === 'Request this service'); })()`));
  check(w + ' slow: the chip shows as the visitor\'s message and the chips are gone', await b.evalJs(`document.querySelector('.btg-hp-me').innerText === "It's running slow" && document.querySelectorAll('.btg-hp-chips').length === 1`));
  await b.shot(`${out}/helper-${w}-cards.png`);

  await b.evalJs(`document.querySelector('.btg-hp-request').click()`); await b.sleep(200);
  check(w + ' request: form with name, phone, email, VA/NJ and a pre-filled, editable summary', await b.evalJs(`(() => { const f = ${lastForm}; return !!f && ['name', 'phone', 'email', 'summary'].every((k) => f.elements[k]) &&
    f.querySelectorAll('[name=area]').length === 2 && f.elements.summary.value === 'Computer running slow. Interested in: Computer Tune Up.' && !f.elements.summary.readOnly && document.activeElement === f.elements.name; })()`));
  const posted = (await posts()).length;
  await b.evalJs(`${lastForm}.querySelector('.btg-hp-send').click()`); await b.sleep(150);
  check(w + ' validation: empty name, contact and area are flagged, nothing posted', await b.evalJs(`(() => { const f = ${lastForm}, vis = (k) => !f.querySelector('.btg-hp-err[data-for=' + k + ']').hidden;
    return vis('name') && vis('contact') && vis('area') && !vis('summary') && f.elements.name.getAttribute('aria-invalid') === 'true' && document.activeElement === f.elements.name; })()`) && (await posts()).length === posted);
  await b.evalJs(fill('[name=name]', 'Jane FAIL Sample')); await b.evalJs(fill('[name=phone]', '804 555 0100'));
  await b.evalJs(`${lastForm}.querySelector('[name=area][value=va]').click()`);
  await b.evalJs(`${lastForm}.querySelector('.btg-hp-send').click()`); await b.sleep(500);
  check(w + ' send failure: the form stays, with a retry message and both phone numbers', await b.evalJs(`(() => { const f = ${lastForm}, e = f.querySelector('.btg-hp-fail'); return !e.hidden && /didn't go through/.test(e.innerText) && /844-TEKGUY-0/.test(e.innerText) && /210-5656/.test(e.innerText) && !f.querySelector('.btg-hp-send').disabled; })()`));
  const before = (await posts()).length;
  await b.evalJs(fill('[name=name]', 'Jane Sample')); await b.evalJs(fill('[name=summary]', 'Computer running slow since last week. Interested in: Computer Tune Up.'));
  await b.evalJs(`${lastForm}.querySelector('.btg-hp-send').click()`); await b.sleep(600);
  const p = (await posts())[before] || {};
  check(w + ' send: posted once to the mocked CF7 16906 with its hidden fields and the four mapped fields', (await posts()).length === before + 1 && p._wpcf7 === '16906' && p._wpcf7_unit_tag === 'wpcf7-f16906-p11802-o1' &&
    p['your-name'] === 'Jane Sample' && p['your-email'] === 'info@bobthetechguy.com' && p['your-subject'] === 'Helper request: Computer Tune Up (VA) - no email, please call' &&
    /Phone: 804 555 0100/.test(p['your-message']) && /Computer running slow since last week/.test(p['your-message']) && p['your-message'].length <= 2000, JSON.stringify(p['your-subject']));
  const conf = await b.evalJs(`[...document.querySelectorAll('.btg-hp-bot')].pop().innerText`);
  check(w + ' confirmation: thanks the visitor, form gone', /Thanks, Jane\. Your request is with Bob\./.test(conf) && await b.evalJs(`!document.querySelector('.btg-hp-form')`), conf);
  if (m) check(w + ' confirmation (Monday, closed): says Bob replies during business hours', /replies during business hours \(Eastern Time\): Tue 9:30 AM–7 PM, Wed–Fri 9:30 AM–5 PM, Sat 12–3 PM/.test(conf));
  else check(w + ' confirmation (Tuesday 11 AM, open): no after-hours line', !/business hours/.test(conf) && /He will reply/.test(conf));
  check(w + ' never shown: prices, turnaround, warranty or the Virginia street address', await b.evalJs(`!/\\$\\d|same[- ]day|guarantee|warrant|Tpke|Turnpike/i.test(document.querySelector('.btg-hp-panel').innerText)`));
  check(w + ' no horizontal scroll with the helper open', !(await b.evalJs(`document.documentElement.scrollWidth > innerWidth`)));
  await b.shot(`${out}/helper-${w}-sent.png`);

  await b.evalJs(`document.querySelector('.btg-hp-restart').click()`); await b.sleep(150);
  await b.evalJs(`[...document.querySelectorAll('.btg-hp-chips button')].pop().click()`); await b.sleep(150);
  check(w + ' "Something else": straight to the form with an empty summary', await b.evalJs(`(() => { const f = ${lastForm}; return !!f && f.elements.summary.value === '' && document.querySelectorAll('.btg-hp-card').length === 0; })()`));
  await b.evalJs(fill('[name=name]', 'Sam')); await b.evalJs(fill('[name=email]', 'sam@example.com')); await b.evalJs(fill('[name=summary]', 'Printer question'));
  await b.evalJs(`${lastForm}.querySelector('[name=area][value=nj]').click()`); await b.evalJs(`${lastForm}.querySelector('.btg-hp-send').click()`); await b.sleep(600);
  const q = (await posts()).pop();
  check(w + ' email request: real reply-to address, NJ in the subject', q['your-email'] === 'sam@example.com' && q['your-subject'] === 'Helper request: General request (NJ)' && /Area: Northern New Jersey/.test(q['your-message']), q['your-subject']);
  await b.shot(`${out}/helper-${w}-form.png`);

  await b.evalJs(`document.querySelector('.btg-hp-panel').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`); await b.sleep(150);
  check(w + ' Escape closes the panel and returns focus to the launcher', await b.evalJs(`document.querySelector('.btg-hp-panel').hidden && !document.querySelector('.btg-hp-launch').hidden && document.activeElement === document.querySelector('.btg-hp-launch')`));
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
