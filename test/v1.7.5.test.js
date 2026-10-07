// test/v1.7.5.test.js — run: node --test test/v1.7.5.test.js
// Virginia consolidation: eight town posts fold into /best-computer-repair-chesterfield-va/.
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const I = window.BTGInit, Z = window.BTGZone, S = window.BTGSearch;
const PAGE = '/best-computer-repair-chesterfield-va/';

test('vaTarget: the eight town posts point at the Chesterfield page; nothing else does', () => {
  for (const t of ['midlothian', 'chester', 'bon-air', 'brandermill', 'woodlake', 'moseley', 'colonial-heights', 'richmond']) {
    assert.strictEqual(I.vaTarget('/pc-repair-service-' + t + '-virginia/'), PAGE, t);
    assert.strictEqual(I.vaTarget('/pc-repair-service-' + t + '-virginia'), PAGE, t + ' without slash');
  }
  for (const p of [PAGE, '/networking/', '/about/', '/', '/northern-new-jersey/', '/pc-repair-service-wyckoff-new-jersey/', '/wp-content/uploads/pc-repair-service-x-virginia.jpg']) assert.strictEqual(I.vaTarget(p), null, p);
});

// A footer list shaped like the live one: the Chesterfield entry first, then the towns, then an unrelated post.
function footer() {
  const mk = (path, text) => { const a = { pathname: path, hostname: 'bobthetechguy.com', textContent: text, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, closest: (s) => (/li/.test(s) ? li : null) }; const li = { parentNode: ul, a }; a.li = li; return a; };
  const ul = { kids: [], removeChild(li) { this.kids = this.kids.filter((k) => k !== li); } };
  const links = [mk(PAGE, 'Best Computer Repair Chesterfield VA'), mk('/pc-repair-service-chester-virginia/', 'PC Repair Service Chester Virginia'), mk('/pc-repair-service-bon-air-virginia/', 'PC Repair Service Bon Air Virginia'), mk('/new-website-launch/', 'New Website Launch!')];
  ul.kids = links.map((a) => a.li);
  const doc = { querySelectorAll: () => links, querySelector: (s) => (/chesterfield-va/.test(s) ? links[0] : null) };
  return { doc, ul, links };
}
test('rewriteNjLinks also folds town links into the Chesterfield page and keeps one footer entry', () => {
  const f = footer();
  I.rewriteNjLinks(f.doc);
  assert.strictEqual(f.links[1].attrs.href, 'https://bobthetechguy.com' + PAGE);
  assert.deepStrictEqual(f.ul.kids.map((li) => li.a.textContent), ['Best Computer Repair Chesterfield VA', 'New Website Launch!']);
});

test('the Chesterfield page gets a city title and a 110-160 character description', () => {
  assert.strictEqual(I.pageTitle(PAGE), 'Computer Repair in Chesterfield & Richmond, VA | Bob The Tech Guy');
  assert.ok(I.pageTitle(PAGE).length <= 70);
  const d = I.DESCRIPTIONS[PAGE];
  assert.ok(d && d.length >= 110 && d.length <= 160, d && d.length);
});

test('search lists one Virginia area page, not nine', () => {
  const areas = S.PAGES.filter((p) => p.type === 'AREA');
  assert.deepStrictEqual(areas.map((p) => p.url), ['https://bobthetechguy.com' + PAGE]);
  assert.strictEqual(areas[0].title, 'Chesterfield & Richmond VA Service Area');
});

test('the service-area map can fill a slot on the Chesterfield page', () => {
  assert.match(Z.mapHtml(), /^<div class="btg-zone-map btg-zone-big" role="img" aria-label="Map of the Virginia service area: Richmond,/);
  const slot = { innerHTML: '', querySelector: () => null };
  const doc = { querySelector: (s) => (s === '.btg-zone-slot' ? slot : null), querySelectorAll: () => [] };
  Z.init(doc, { location: { pathname: PAGE } });
  assert.match(slot.innerHTML, /btg-zone-map/);
});
