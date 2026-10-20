// Browser test for v1.8.21 (SEO audit 2026-10-19 fixes). Run: node test/e2e/audit-fixes.e2e.mjs
// ?head=1 serves the page with the Avada head field as tools/loader.js headBlock() builds it (business JSON-LD included).
import serve from './serve.mjs';
import { launch } from './cdp.mjs';
const server = await serve(4521);
const results = [];
const check = (name, ok, info = '') => { results.push(ok); console.log((ok ? 'ok   ' : 'FAIL ') + name + (info ? '  ' + info : '')); };
const LD = `JSON.stringify([...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => { try { const j = JSON.parse(s.textContent); return [j['@type'], j['@id'] || '', !!j.address, s.parentNode.tagName]; } catch (e) { return ['bad']; } }))`;
async function open(path, w = 1440, h = 900) {
  const b = await launch({ width: w, height: h, mobile: w < 768 });
  const errors = [];
  await b.send('Runtime.enable');
  b.on('Runtime.exceptionThrown', (p) => errors.push((p.exceptionDetails.exception && p.exceptionDetails.exception.description || p.exceptionDetails.text || '').slice(0, 120)));
  await b.goto('http://localhost:4521' + path); await b.sleep(3000);
  return { b, errors };
}

// The business block comes from the head field once, the bundle doesn't add a second; Service schema still from the bundle.
for (const [path, svc] of [['/', false], ['/memory-install/', true], ['/about/', false], ['/notfound/', false]]) {
  const { b, errors } = await open(path + '?head=1');
  const ld = JSON.parse(await b.evalJs(LD));
  const biz = ld.filter((x) => x[1] === 'https://bobthetechguy.com/#business');
  check(`${path} head field: exactly one business JSON-LD, in <head>, no address`, biz.length === 1 && biz[0][3] === 'HEAD' && !biz[0][2], JSON.stringify(ld));
  check(`${path} head field: ${svc ? 'Service schema still added by the bundle' : 'no Service schema'}`, ld.filter((x) => x[0] === 'Service').length === (svc ? 1 : 0), JSON.stringify(ld));
  check(`${path} head field: bundle finished, no script errors`, (await b.evalJs(`document.documentElement.classList.contains('btg-ready')`)) && errors.length === 0, errors.join(' | '));
  await b.close();
}
// Without the head field (an old cached page, or the field reverted) the bundle still adds the business block.
{
  const { b } = await open('/memory-install/');
  const ld = JSON.parse(await b.evalJs(LD));
  check('no head field: bundle adds the one business block itself', ld.filter((x) => x[1] === 'https://bobthetechguy.com/#business').length === 1, JSON.stringify(ld));
  await b.close();
}

// Landmarks and anchors (Lighthouse: crawlable links, link names, main landmark), at desktop and phone width.
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const path of ['/', '/memory-install/']) {
    const { b } = await open(path + '?head=1', w, h);
    const r = JSON.parse(await b.evalJs(`JSON.stringify({
      bars: [...document.querySelectorAll('a.fusion-icon-bars')].map((a) => a.getAttribute('aria-label')),
      search: [...document.querySelectorAll('a.fusion-main-menu-icon')].map((a) => (a.getAttribute('role') || '') + '|' + (a.getAttribute('aria-label') || '') + '|' + a.hasAttribute('href')),
      load: [...document.querySelectorAll('a.fusion-one-page-text-link')].map((a) => (a.getAttribute('role') || '') + '|' + a.getAttribute('aria-hidden')),
      mains: document.querySelectorAll('main, [role="main"]').length, mainIsMain: (document.getElementById('main') || {}).getAttribute?.('role'),
      // Lighthouse crawlable-anchors: an <a> with no href fails unless it has a role.
      bareAnchors: [...document.querySelectorAll('a:not([href]):not([role]):not([name])')].map((a) => a.className).filter((c) => c !== undefined),
      h2Empty: [...document.querySelectorAll('h2')].filter((x) => !x.textContent.trim()).length,
      scrollOk: document.documentElement.scrollWidth <= innerWidth
    })`));
    check(`${w} ${path}: mobile menu link named "Menu"`, r.bars.length > 0 && r.bars.every((x) => x === 'Menu'), JSON.stringify(r.bars));
    check(`${w} ${path}: search icon is a named button`, r.search.every((x) => x === 'button|Search|false'), JSON.stringify(r.search));
    check(`${w} ${path}: page-load link hidden from the accessibility tree`, r.load.every((x) => x === 'presentation|true'), JSON.stringify(r.load));
    check(`${w} ${path}: exactly one main landmark, on #main`, r.mains === 1 && r.mainIsMain === 'main', JSON.stringify([r.mains, r.mainIsMain]));
    check(`${w} ${path}: no anchors without href or role`, r.bareAnchors.length === 0, JSON.stringify(r.bareAnchors));
    check(`${w} ${path}: no H2 without text (the audit's "empty" ones were scroll-animated, not empty)`, r.h2Empty === 0, String(r.h2Empty));
    check(`${w} ${path}: no horizontal page scroll`, r.scrollOk);
    await b.close();
  }
}

// The mobile menu still opens from the named link (attributes only, Avada's handler unchanged).
{
  const { b } = await open('/?head=1', 390, 844);
  const opened = await b.evalJs(`(async () => { const a = [...document.querySelectorAll('a.fusion-icon-bars')].find((x) => x.offsetParent !== null); if (!a) return 'no visible menu link'; a.click(); await new Promise((r) => setTimeout(r, 600)); const n = document.querySelector('.fusion-mobile-nav-holder, .btg-mobile-nav, .btg-drawer'); return n ? getComputedStyle(n).display + ' ' + n.className : 'no menu'; })()`);
  console.log('     (mobile menu after click: ' + opened + ')');
  await b.close();
}

// VOB badge: the WebP loads at its 150x32 box in the footer.
{
  const { b } = await open('/about/?head=1');
  await b.evalJs(`document.querySelector('.btg-vet img')?.scrollIntoView()`); await b.sleep(1200);
  const v = JSON.parse(await b.evalJs(`JSON.stringify([...document.querySelectorAll('.btg-vet img')].map((i) => [i.currentSrc.split('/').pop(), i.complete && i.naturalWidth, i.naturalHeight, Math.round(i.getBoundingClientRect().width), Math.round(i.getBoundingClientRect().height)]))`));
  // Its box is 150x32 (the footer badge's CSS draws it a little smaller, as it did the PNG): the 300px file covers 2x.
  check('VOB logo: WebP 300x64 loaded, drawn at most 150px wide, shape kept', v.length > 0 && v.every((x) => x[0] === 'vob-logo-300x64.webp' && x[1] === 300 && x[2] === 64 && x[3] <= 150 && Math.abs(x[3] / x[4] - 300 / 64) < 0.3), JSON.stringify(v));
  await b.close();
}

server.close();
const bad = results.filter((x) => !x).length; console.log(`${results.length - bad}/${results.length} passed`); process.exit(bad ? 1 : 0);
