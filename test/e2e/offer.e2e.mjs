// Browser test for Bob's monthly offer (vault "Ad Pop-up", 2026-11-02): pop-up after 8 s, new customers first, then the season's,
// one per visit, never on Contact, helper launcher above the dim, phone bottom card, footer strip, decorations clear of the text.
// Run: node test/e2e/offer.e2e.mjs   (screenshots in %TEMP%/btg-e2e/offer-*.png)
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const PORT = 4473, BASE = 'http://localhost:' + PORT;
const server = await serve(PORT);
const results = [];
const check = (name, ok, info = '') => { results.push(!!ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const until = async (b, js, ms = 4000) => { for (let t = 0; t < ms && !(await b.evalJs(js)); t += 100) await b.sleep(100); return b.evalJs(js); };

// Runs before the bundle on every load: pins the clock to local noon on `day`, optionally makes the 8 s timer fire at once,
// optionally blocks localStorage (as some private modes do).
let scriptId = null;
async function setup(b, day, { fast = true, blocked = false } = {}) {
  if (scriptId) await b.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: scriptId });
  const source = `(() => { const R = Date, off = new R('${day}T12:00:00').getTime() - R.now();
    window.Date = class extends R { constructor(...a) { super(...(a.length ? a : [R.now() + off])); } static now() { return R.now() + off; } };
    ${fast ? 'const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => st(f, ms === 8000 ? 30 : ms, ...a);' : ''}
    ${blocked ? "Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });" : ''} })()`;
  scriptId = (await b.send('Page.addScriptToEvaluateOnNewDocument', { source })).result.identifier;
}
// A new visit: seen offers as given, a fresh session.
async function visit(b, path, seen) {
  await b.goto(BASE + '/__blank'); // a page loaded with the current setup, so storage is writable even after a "blocked" run
  await b.evalJs(`(() => { try { sessionStorage.clear(); localStorage.clear(); ${seen ? `localStorage.setItem('btg-offer-seen', ${JSON.stringify(JSON.stringify(seen))});` : ''} } catch (e) {} })()`);
  await b.goto(BASE + path);
}
const popup = `(() => { const o = document.querySelector('.btg-offer'); return o ? o.className.match(/btg-offer--(new|spring|fall|holiday)/)[1] : null; })()`;
const stripKey = `(() => { const s = document.querySelector('.fusion-footer .btg-offer-strip'); return s ? s.className.match(/btg-offer--(\\w+)/)[1] : null; })()`;
const seenNow = `localStorage.getItem('btg-offer-seen')`;
// Every decoration's box against every text box (and the icon, x and buttons): none may overlap.
const decorClear = (root) => `(() => { const r = document.querySelector('${root}'); if (!r) return 'missing';
  const deco = [...r.querySelectorAll('.btg-od-piece, .btg-od-orn, .btg-od-orn i')].map((e) => e.getBoundingClientRect());
  const text = [...r.querySelectorAll('.btg-offer-kicker, .btg-offer-title, .btg-offer-body, .btg-offer-fine, .btg-offer-go, .btg-offer-later, .btg-offer-x, .btg-offer-ico, .btg-offer-nav button')];
  const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  const bad = [];
  text.forEach((t) => { const range = document.createRange(); range.selectNodeContents(t);
    const rects = t.matches('.btg-offer-kicker, .btg-offer-title, .btg-offer-body, .btg-offer-fine') ? [...range.getClientRects()] : [t.getBoundingClientRect()];
    rects.forEach((tr) => deco.forEach((d) => { if (hit(tr, d)) bad.push(t.className); })); });
  return deco.length ? (bad.length ? bad.join(',') : true) : 'no decorations'; })()`;
const THEMES = [['new', '2026-06-01', []], ['spring', '2027-03-15', ['new']], ['fall', '2026-11-02', ['new']], ['holiday', '2026-12-10', ['new']]];

// ---------- Desktop 1440 ----------
let b = await launch({ width: 1440, height: 900 });
await b.goto(BASE + '/');

// 8 s delay, real timers.
await setup(b, '2026-11-02', { fast: false });
await visit(b, '/', null);
await b.evalJs(`new MutationObserver(() => { if (!window.__shownAt && document.querySelector('.btg-offer')) window.__shownAt = performance.now(); }).observe(document.body, { childList: true })`);
const t0 = Date.now();
check('strip: the footer shows the new-customer offer at once', (await b.evalJs(stripKey)) === 'new');
await b.sleep(Math.max(0, 6500 - (Date.now() - t0)));
check('delay: no pop-up ~6.5 s after load', (await b.evalJs(popup)) === null);
const shown = await until(b, `!!document.querySelector('.btg-offer')`, 5000);
const at = (await b.evalJs(`window.__shownAt - performance.getEntriesByType('navigation')[0].loadEventEnd`)) / 1000;
check('delay: the pop-up shows 8 s after the page loads', shown && at >= 7.95 && at < 8.6, at.toFixed(2) + ' s after the load event');
check('priority: in fall, a first visit gets the new-customer offer', (await b.evalJs(popup)) === 'new');

await b.sleep(400); // let the 0.3 s entrance animation finish
// Desktop dialog: centred, see-through, dim under the launcher, focus trapped, Esc closes.
const geo = await b.evalJs(`(() => { const o = document.querySelector('.btg-offer').getBoundingClientRect(), d = document.querySelector('.btg-offer-dim'), l = document.querySelector('.btg-hp-launch').getBoundingClientRect();
  const atL = document.elementFromPoint(l.left + l.width / 2, l.top + l.height / 2);
  const dr = d.getBoundingClientRect(); return { vw: innerWidth, vh: innerHeight, dx: Math.round(dr.left + dr.width / 2), dy: Math.round(dr.top + dr.height / 2), w: Math.round(o.width), cx: Math.round(o.left + o.width / 2), cy: Math.round(o.top + o.height / 2), dim: getComputedStyle(d).backgroundColor,
    box: getComputedStyle(document.querySelector('.btg-offer')).backgroundColor, role: document.querySelector('.btg-offer').getAttribute('role'),
    modal: document.querySelector('.btg-offer').getAttribute('aria-modal'), launcherOnTop: !!atL && !!atL.closest('.btg-hp-launch'),
    inert: document.querySelector('.fusion-footer, #wrapper, main') ? !!document.querySelector('.fusion-footer, #wrapper, main').closest('[inert]') : null,
    focusIn: document.querySelector('.btg-offer').contains(document.activeElement) }; })()`);
check('desktop: centred 500px dialog, aria-modal', geo.w === 500 && Math.abs(geo.cx - geo.dx) <= 2 && Math.abs(geo.cy - geo.dy) <= 2 && geo.role === 'dialog' && geo.modal === 'true', JSON.stringify(geo));
check('desktop: see-through box rgba(24,28,21,.8) over a 40% dim', geo.box === 'rgba(24, 28, 21, 0.8)' && geo.dim === 'rgba(0, 0, 0, 0.4)');
check('desktop: the helper launcher stays on top of the dim; the page behind is inert', geo.launcherOnTop && geo.inert === true);
check('desktop: focus moves into the dialog', geo.focusIn);
let trapped = true;
for (let i = 0; i < 6; i++) { await b.key('Tab', 'Tab', 9); trapped = trapped && await b.evalJs(`document.querySelector('.btg-offer').contains(document.activeElement)`); }
check('desktop: Tab stays inside the dialog', trapped);
check('desktop: decorations clear of the text (new = none)', (await b.evalJs(decorClear('.btg-offer'))) === 'no decorations');
await b.shot(`${out}/offer-1440-new.png`);
await b.key('Escape', 'Escape', 27); await b.sleep(100);
check('desktop: Esc closes it, the page is no longer inert', await b.evalJs(`!document.querySelector('.btg-offer, .btg-offer-dim') && !document.querySelector('[inert]')`));

// Slider (Jeff, 2026-11-02): every running offer in one pop-up, new customers first; arrows wrap, dots jump, no auto-rotate.
await setup(b, '2026-11-02');
await visit(b, '/', null); await until(b, popup); await b.sleep(400);
const slides = `[...document.querySelectorAll('.btg-offer .btg-offer-dot')].map((d) => d.getAttribute('aria-label') + '=' + d.getAttribute('aria-current')).join('|')`;
check('slider: first visit in fall lists new customers then fall, opens on new customers', (await b.evalJs(slides)) === 'Offer 1 of 2: New customers=true|Offer 2 of 2: Fall clean-up=false');
check('slider: the new-customer disclaimer', (await b.evalJs(`document.querySelector('.btg-offer .btg-offer-fine').textContent`)) === 'Only applies if you haven’t purchased any services from Bob before · Can’t be combined with other discounts');
check('seen: both running offers recorded when shown, no cookies', (await b.evalJs(seenNow)) === '["new","fall-2026"]' && (await b.evalJs('document.cookie')) === '');
await b.evalJs(`document.querySelector('.btg-offer [data-step="1"]').focus(); document.querySelector('.btg-offer [data-step="1"]').click()`); await b.sleep(100);
check('slider: next arrow shows the fall offer, its theme and its dim decorations; focus stays on the arrow; announced', await b.evalJs(`(() => { const o = document.querySelector('.btg-offer');
  return /btg-offer--fall/.test(o.className) && o.querySelector('.btg-offer-title').textContent === '10% off a fall clean-up' && document.querySelectorAll('.btg-offer-dim .btg-od-piece').length > 0 &&
    document.activeElement === o.querySelector('[data-step="1"]') && o.querySelector('.btg-offer-sr').textContent === 'Offer 2 of 2: 10% off a fall clean-up'; })()`));
check('slider: still one offer on screen at a time (never combined)', await b.evalJs(`document.querySelectorAll('.btg-offer .btg-offer-title').length === 1`));
await b.evalJs(`document.querySelector('.btg-offer [data-step="1"]').click()`);
check('slider: next on the last offer wraps to the first', (await b.evalJs(popup)) === 'new');
await b.evalJs(`document.querySelector('.btg-offer [data-i="1"]').click()`);
check('slider: a dot jumps to its offer', (await b.evalJs(popup)) === 'fall' && (await b.evalJs(slides)).endsWith('Fall clean-up=true'));
await b.evalJs(`document.querySelector('.btg-offer [data-step="-1"]').click()`);
check('slider: previous goes back', (await b.evalJs(popup)) === 'new');
check('slider: "Maybe later" still closes after sliding', await b.evalJs(`document.querySelector('.btg-offer-later').click(), !document.querySelector('.btg-offer')`));

// Same visit, next page: no second pop-up; the strip lists both offers, new customers first.
await setup(b, '2026-11-02');
await b.goto(BASE + '/computer-tune-up/'); await b.sleep(400);
check('one per visit: no pop-up on the next page of the same visit', (await b.evalJs(popup)) === null);
check('strip: lists both offers with arrows, starts on new customers', (await b.evalJs(stripKey)) === 'new' && (await b.evalJs(`document.querySelectorAll('.btg-offer-strip .btg-offer-dot').length`)) === 2);
await b.evalJs(`document.querySelector('.btg-offer-strip [data-step="1"]').click()`);
check('strip: its arrow shows the fall offer', (await b.evalJs(stripKey)) === 'fall' && (await b.evalJs(`document.querySelector('.btg-offer-strip .btg-offer-kicker').textContent`)) === 'Current offer · Fall clean-up');

// Next visit with both seen: no pop-up.
await b.evalJs(`sessionStorage.clear()`); await b.goto(BASE + '/'); await b.sleep(400);
check('both seen: no pop-up on the next visit', (await b.evalJs(popup)) === null);

// A returning visitor who saw only the new-customer offer (say in summer): the pop-up opens on the season's offer.
await visit(b, '/', ['new']);
check('returning: opens on the unseen fall offer, new customers one arrow away', (await until(b, popup)) === 'fall' && (await b.evalJs(slides)) === 'Offer 1 of 2: New customers=false|Offer 2 of 2: Fall clean-up=true');
check('no stacking: the fall fine print says it can\'t be combined', /^Ends November 15 · Can’t be combined with other discounts$/.test(await b.evalJs(`document.querySelector('.btg-offer .btg-offer-fine').textContent`)));
await b.click(40, 450); await b.sleep(100);
check('desktop: a click on the backdrop closes it', (await b.evalJs(popup)) === null && (await b.evalJs(seenNow)) === '["new","fall-2026"]');

// Only one offer running (June): no arrows or dots.
await setup(b, '2026-06-01');
await visit(b, '/', null); await until(b, popup);
check('one offer: no slider controls in the pop-up or the strip', await b.evalJs(`!document.querySelector('.btg-offer-nav') && document.querySelector('.btg-offer-strip').getAttribute('aria-label') === 'Current offer'`));
await b.key('Escape', 'Escape', 27);
await setup(b, '2026-11-02');

// "Maybe later" and x close too.
await visit(b, '/', null); await until(b, popup);
await b.evalJs(`document.querySelector('.btg-offer-later').click()`);
check('desktop: "Maybe later" closes it', (await b.evalJs(popup)) === null);
await visit(b, '/', null); await until(b, popup);
await b.evalJs(`document.querySelector('.btg-offer-x').click()`);
check('desktop: x closes it', (await b.evalJs(popup)) === null);

// Helper interplay: a real click on the launcher closes the offer (counted as seen) and opens the helper.
await visit(b, '/', null); await until(b, popup);
const l = await b.evalJs(`(() => { const r = document.querySelector('.btg-hp-launch').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`);
await b.click(l[0], l[1]); await b.sleep(200);
check('helper: clicking the launcher closes the offer and opens the helper with focus inside', await b.evalJs(`!document.querySelector('.btg-offer, .btg-offer-dim') && !document.querySelector('.btg-hp-panel').hidden &&
  document.querySelector('.btg-hp-panel').contains(document.activeElement) && !document.querySelector('[inert]')`) && (await b.evalJs(seenNow)) === '["new","fall-2026"]');
await b.evalJs(`document.querySelector('.btg-hp-close').click()`);
// Helper already open when the timer fires: no pop-up, and the offer stays unseen.
await setup(b, '2026-11-02', { fast: false });
await visit(b, '/', null);
await b.evalJs(`document.querySelector('.btg-hp-launch').click()`);
await b.sleep(9000);
check('helper: no pop-up over an open helper panel, offer left unseen', (await b.evalJs(popup)) === null && (await b.evalJs(seenNow)) === null);

// Contact page: never a pop-up, the strip is still there.
await setup(b, '2026-11-02');
await visit(b, '/contact-2/', null); await b.sleep(500);
check('contact: no pop-up on /contact-2/, nothing marked seen', (await b.evalJs(popup)) === null && (await b.evalJs(seenNow)) === null && (await b.evalJs(stripKey)) === 'new');

// Storage blocked: no pop-up at all, the strip still shows.
await setup(b, '2026-11-02', { blocked: true });
await b.goto(BASE + '/'); await b.sleep(500);
check('storage blocked: no pop-up, strip shows the new-customer offer', (await b.evalJs(popup)) === null && (await b.evalJs(stripKey)) === 'new');

// Date windows (with the new-customer offer already seen).
for (const [day, want] of [['2026-06-01', null], ['2027-03-01', 'spring'], ['2027-04-30', 'spring'], ['2026-09-15', 'fall'], ['2026-11-15', 'fall'], ['2026-11-17', null], ['2026-11-20', 'holiday'], ['2026-12-31', 'holiday'], ['2027-01-05', null]]) {
  await setup(b, day);
  await visit(b, '/', ['new']); await b.sleep(300);
  check(`window ${day}: pop-up ${want || 'none'}`, (await b.evalJs(popup)) === want && (await b.evalJs(stripKey)) === 'new' &&
    (await b.evalJs(`document.querySelectorAll('.btg-offer-strip .btg-offer-dot').length`)) === (want ? 2 : 0));
}

// Each theme: screenshot the pop-up and the strip, decorations clear of the text.
for (const [key, day, seen] of THEMES) {
  await setup(b, day);
  await visit(b, '/', seen); await until(b, popup);
  if (key !== 'new') check(`desktop ${key}: pop-up decorations clear of the text`, (await b.evalJs(decorClear('.btg-offer'))) === true, String(await b.evalJs(decorClear('.btg-offer'))));
  if (key !== 'new') await b.shot(`${out}/offer-1440-${key}.png`);
  await b.key('Escape', 'Escape', 27);
  if (key !== 'new') await b.evalJs(`document.querySelector('.btg-offer-strip [data-step="1"]').click()`); // the strip opens on new customers
  await b.evalJs(`window.scrollTo(0, document.querySelector('.btg-offer-strip').getBoundingClientRect().top + scrollY - 260)`); await b.sleep(300);
  if (key !== 'new') check(`desktop ${key}: strip decorations clear of the text`, (await b.evalJs(decorClear('.btg-offer-strip'))) === true, String(await b.evalJs(decorClear('.btg-offer-strip'))));
  check(`desktop ${key}: strip fits the footer row, no side scroll`, await b.evalJs(`(() => { const s = document.querySelector('.btg-offer-strip').getBoundingClientRect(); return s.width > 900 && s.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; })()`));
  await b.shot(`${out}/offer-1440-strip-${key}.png`);
}
// Discount on the forms (Jeff, 2026-11-02): No discount or one running offer; fills form 16906's hidden discount fields.
await setup(b, '2026-11-02');
await visit(b, '/', ['new', 'fall-2026']);
check('offer buttons: Book links pre-select their discount on the Contact form', await b.evalJs(`(() => { const a = document.querySelector('.btg-offer-strip .btg-offer-go').getAttribute('href');
  document.querySelector('.btg-offer-strip [data-step="1"]').click(); return a === '/contact-2/?offer=new#btg-request' && document.querySelector('.btg-offer-strip .btg-offer-go').getAttribute('href') === '/contact-2/?offer=fall#btg-request'; })()`));
const discState = `(() => { const f = document.querySelector('.wpcf7 form'), d = f && f.querySelector('.btg-disc'); if (!d) return null;
  const send = f.querySelector('[type=submit]'); const fd = new FormData(f);
  return { opts: [...d.querySelectorAll('input[type=radio]')].map((r) => r.value + (r.checked ? '*' : '')).join(','), discount: fd.get('discount'), tag: fd.get('discount-tag'),
    aboveSend: !!(d.compareDocumentPosition(send) & Node.DOCUMENT_POSITION_FOLLOWING), legend: d.querySelector('legend').textContent }; })()`;
await b.goto(BASE + '/contact-2/?offer=fall'); await b.sleep(300);
let ds = await b.evalJs(discState);
check('contact: ?offer=fall pre-selects fall; the form posts it in discount and discount-tag; the choice sits above Send', ds && ds.opts === ',new,fall*' && ds.discount === '10% fall clean-up' && ds.tag === ' - 10% fall clean-up' && ds.aboveSend, JSON.stringify(ds));
await b.evalJs(`document.querySelector('.btg-disc input[value=""]').click()`);
ds = await b.evalJs(discState);
check('contact: choosing No discount posts none and an empty subject tag', ds.discount === 'none' && ds.tag === '' && ds.opts === '*,new,fall', JSON.stringify(ds));
await b.evalJs(`document.querySelector('.btg-disc input[value="new"]').click()`);
ds = await b.evalJs(discState);
check('contact: the new-customer choice says who it is for', ds.discount === '10% new customers' && /only if you haven’t purchased any services from Bob before/.test(await b.evalJs(`document.querySelector('.btg-disc').textContent`)));
await b.evalJs(`document.querySelector('.btg-disc').scrollIntoView({ block: 'center' })`); await b.sleep(200);
await b.shot(`${out}/offer-1440-contact-discount.png`);
await b.goto(BASE + '/contact-2/'); await b.sleep(300);
check('contact: without ?offer, No discount is selected', (await b.evalJs(discState)).opts === '*,new,fall');
await setup(b, '2026-06-01');
await b.goto(BASE + '/contact-2/?offer=fall'); await b.sleep(300);
ds = await b.evalJs(discState);
check('contact: an offer that is not running is not offered or pre-selected', ds.opts === '*,new' && ds.discount === 'none', JSON.stringify(ds));

// Helper: the same choice in its request form, sent with the request.
await setup(b, '2026-11-02');
await visit(b, '/computer-tune-up/', ['new', 'fall-2026']);
await b.evalJs(`document.querySelector('.btg-hp-launch').click()`); await b.sleep(200);
await b.evalJs(`[...document.querySelectorAll('.btg-hp-chips button')].pop().click()`); await b.sleep(200);
check('helper: the request form offers No discount, new customers and fall', (await b.evalJs(`[...document.querySelectorAll('.btg-hp-form .btg-disc input')].map((r) => r.value + (r.checked ? '*' : '')).join(',')`)) === '*,new,fall');
await b.evalJs(`(() => { const f = [...document.querySelectorAll('.btg-hp-form')].pop(); f.elements.name.value = 'Disc Tester'; f.elements.phone.value = '804 555 0100'; f.elements.summary.value = 'Slow laptop';
  f.querySelector('[name=area][value=va]').click(); f.querySelector('[name=discount][value=fall]').click(); f.querySelector('.btg-disc').scrollIntoView({ block: 'center' }); })()`);
await b.sleep(150);
await b.shot(`${out}/offer-1440-helper-discount.png`);
await b.evalJs(`[...document.querySelectorAll('.btg-hp-form')].pop().querySelector('.btg-hp-send').click()`);
await until(b, `!document.querySelector('.btg-hp-form')`, 8000);
const lastPost = (await (await fetch(BASE + '/__cf7')).json()).pop() || {};
check('helper: the request reaches the form with discount and discount-tag', lastPost['your-name'] === 'Disc Tester' && lastPost.discount === '10% fall clean-up' && lastPost['discount-tag'] === ' - 10% fall clean-up' && lastPost.source === 'AI helper', JSON.stringify({ d: lastPost.discount, t: lastPost['discount-tag'] }));

await b.close();

// ---------- Phones ----------
for (const [w, h] of [[390, 844], [360, 740]]) {
  b = await launch({ width: w, height: h, mobile: true });
  scriptId = null;
  await b.goto(BASE + '/');
  for (const [key, day, seen] of THEMES) {
    await setup(b, day);
    await visit(b, '/', seen);
    check(`${w} ${key}: bottom card pops up`, (await until(b, popup)) === key);
    const g = await b.evalJs(`(() => { const o = document.querySelector('.btg-offer'), r = o.getBoundingClientRect(), l = document.querySelector('.btg-hp-launch').getBoundingClientRect();
      return { l: Math.round(r.left), r: Math.round(innerWidth - r.right), gap: Math.round(innerHeight - r.bottom), aboveLauncher: r.bottom <= l.top - 6, top: Math.round(r.top),
        role: o.getAttribute('role'), dim: !!document.querySelector('.btg-offer-dim'), inert: !!document.querySelector('[inert]'), focus: o.contains(document.activeElement),
        scroll: document.documentElement.scrollWidth <= innerWidth }; })()`);
    check(`${w} ${key}: full width, 68px up, above the launcher, no dim, non-modal, focus left alone`, g.l === 12 && g.r === 12 && g.gap === 68 && g.aboveLauncher && g.top > h * 0.25 &&
      g.role === 'region' && !g.dim && !g.inert && !g.focus && g.scroll, JSON.stringify(g));
    if (key !== 'new') check(`${w} ${key}: card decorations clear of the text`, (await b.evalJs(decorClear('.btg-offer'))) === true, String(await b.evalJs(decorClear('.btg-offer'))));
    await b.shot(`${out}/offer-${w}-${key}.png`);
    if (key === 'new') {
      await b.evalJs(`document.querySelector('.btg-hp-launch').click()`); await b.sleep(150);
      check(`${w}: the card hides while the helper panel is open`, await b.evalJs(`getComputedStyle(document.querySelector('.btg-offer')).display === 'none'`));
      await b.evalJs(`document.querySelector('.btg-hp-close').click()`); await b.sleep(150);
      check(`${w}: and comes back when the helper closes`, await b.evalJs(`getComputedStyle(document.querySelector('.btg-offer')).display !== 'none'`));
      await b.evalJs(`document.querySelector('.btg-offer .btg-offer-go').focus()`); await b.key('Escape', 'Escape', 27);
      check(`${w}: Esc while focused closes the card`, (await b.evalJs(popup)) === null);
    } else {
      await b.evalJs(`document.querySelector('.btg-offer-x').click()`);
      check(`${w} ${key}: x closes the card`, (await b.evalJs(popup)) === null);
    }
    if (key !== 'new') await b.evalJs(`document.querySelector('.btg-offer-strip [data-step="1"]').click()`);
    await b.evalJs(`window.scrollTo(0, document.querySelector('.btg-offer-strip').getBoundingClientRect().top + scrollY - 120)`); await b.sleep(300);
    check(`${w} ${key}: strip stacked inside the screen, no side scroll`, await b.evalJs(`(() => { const s = document.querySelector('.btg-offer-strip').getBoundingClientRect(); return s.left >= 0 && s.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth; })()`));
    if (w === 390) await b.shot(`${out}/offer-${w}-strip-${key}.png`);
  }
  await b.close();
}

server.close();
const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
