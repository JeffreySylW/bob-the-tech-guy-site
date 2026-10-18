// Browser tests for the Remote Support service page and its menu entry. Run: node test/e2e/remote-support.e2e.mjs
// (stand-in: test/e2e/pages/remote-support.html = a real service page with tools/remote-support-page.js as its content
// and the extra WordPress menu entry the live site gets.)
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const out = process.env.TEMP + '/btg-e2e'; mkdirSync(out, { recursive: true });
const server = await serve(4500);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };

for (const [w, h, mobile] of [[1440, 900, false], [390, 844, true]]) {
  const b = await launch({ width: w, height: h, mobile });
  await b.goto('http://localhost:4500/remote-support/'); await b.sleep(3000);
  check(`${w}: one visible h1 and the call button`, await b.evalJs(`(() => { const h = [...document.querySelectorAll('h1')].filter((x) => x.offsetParent); return h.length === 1 && /Fixed remotely/.test(h[0].innerText) && !!document.querySelector('.btg-hero-cta[href="tel:8448354890"]'); })()`));
  check(`${w}: the card says how it works and links to the Support App page`, await b.evalJs(`(() => { const c = document.querySelector('.btg-include-card.btg-card--remote'); return !!c && c.querySelectorAll('li').length === 3 && !!c.querySelector('a[href="https://bobthetechguy.com/support/"]') && /turned on and connected to the internet/.test(c.innerText); })()`));
  check(`${w}: nothing promised beyond Bob's facts (no price, hours or guarantees)`, await b.evalJs(`!/\\$|per hour|guarantee|24\\/7|within \\d|same.day/i.test(document.querySelector('.btg-hero').parentElement.innerText.slice(0, 4000).split('Related services')[0])`));
  check(`${w}: related services row sits above the call-to-action`, await b.evalJs(`(() => { const r = document.querySelector('.btg-related'), c = document.querySelector('.btg-cta-block'); return !!r && !!c && r.compareDocumentPosition(c) & 4 && r.querySelectorAll('.btg-related-link').length >= 3; })()`));
  check(`${w}: page title, description and Service schema`, await b.evalJs(`(() => { const d = (document.querySelector('meta[name=description]') || {}).content || ''; const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).find((x) => x['@type'] === 'Service'); return document.title === 'Remote Computer Support | Bob The Tech Guy' && d.length >= 110 && d.length <= 160 && !!ld && ld.name === 'Remote Support'; })()`));
  // The "Request a visit" button every service page gets would contradict this page: it asks for remote support instead,
  // and the contact form it opens is pre-filled to match.
  check(`${w}: the request button says "Request remote support" and carries the service name`, await b.evalJs(`(() => { const a = document.querySelector('.btg-request-btn'); return !!a && a.textContent === 'Request remote support' && /[?&]service=Remote(\\+|%20)Support/.test(a.getAttribute('href')); })()`));
  await b.goto('http://localhost:4500/contact-2/?service=Remote%20Support'); await b.sleep(2500);
  check(`${w}: the contact form opens pre-filled for remote support, not for a visit`, await b.evalJs(`(() => { const f = document.querySelector('.wpcf7'); const s = f && f.querySelector('[name="your-subject"]'), m = f && f.querySelector('[name="your-message"]'); return !!s && !!m && s.value === 'Request remote support' && /^I would like to request remote support\\./.test(m.value) && !/visit/i.test(s.value + m.value); })()`));
  await b.goto('http://localhost:4500/computer-tune-up/?x=1'); await b.sleep(2500);
  check(`${w}: other services keep "Request a visit"`, await b.evalJs(`(() => { const a = document.querySelector('.btg-request-btn'); return !!a && a.textContent === 'Request a visit'; })()`));
  await b.goto('http://localhost:4500/remote-support/'); await b.sleep(2500);
  check(`${w}: no photo on this page, no sideways scroll`, await b.evalJs(`!document.querySelector('.btg-photo-fig') && document.documentElement.scrollWidth <= innerWidth`));
  // The Services menu (desktop; phones use the hamburger menu): the panel is built on first hover. The new page is in
  // "Setup & Software", there are 16 links in all, and no stray "More" group.
  if (!mobile) {
    const at = JSON.parse(await b.evalJs(`JSON.stringify((() => { const r = document.querySelector('li.btg-has-panel > a').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })())`));
    await b.move(at[0], at[1]); await b.sleep(700);
    const dd = JSON.parse(await b.evalJs(`JSON.stringify((() => { const p = document.querySelector('#btg-services-panel'); if (!p) return null; const groups = [...p.querySelectorAll('.btg-panel')].map((g) => ({ name: g.querySelector('.btg-panel-title').textContent, links: [...g.querySelectorAll('.btg-panel-link')].map((a) => a.getAttribute('href').split('/').filter(Boolean).pop()) })); const a = p.querySelector('a[href$="/remote-support/"]'); return { open: !p.hidden, groups, icon: a && a.className, text: a && a.textContent }; })())`) || 'null');
    const setup = dd && dd.groups.find((g) => /Setup/.test(g.name));
    check(`${w}: menu lists Remote Support last in Setup & Software, 16 links, no "More" group`, !!dd && dd.open && !!setup && setup.links[setup.links.length - 1] === 'remote-support' && dd.groups.reduce((n, g) => n + g.links.length, 0) === 16 && !dd.groups.some((g) => /More/.test(g.name)), dd ? dd.groups.map((g) => g.name + ':' + g.links.length).join(' ') : 'no panel');
    check(`${w}: its menu link uses the remote icon and the name "Remote Support"`, !!dd && /btg-card--remote/.test(dd.icon || '') && dd.text === 'Remote Support');
    await b.shot(`${out}/remote-support-menu-${w}.png`);
  }
  await b.shot(`${out}/remote-support-${w}.png`);
  await b.close();
}
server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
