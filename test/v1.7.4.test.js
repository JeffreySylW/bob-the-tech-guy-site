// test/v1.7.4.test.js — run: node --test test/v1.7.4.test.js
// SEO pass: block dead widget scripts; business schema gains hours, url and real profiles (never an address).
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../dist/btg.js');
const I = window.BTGInit, S = window.BTGSchema, H = window.BTGHours;
const noSlider = { querySelector: () => null }, slider = { querySelector: (s) => (s === 'rs-module' ? {} : null) };

test('dead widget scripts are blocked: Twitter, Facebook, the empty Instagram feed, crypto', () => {
  for (const u of ['https://platform.twitter.com/widgets.js', 'https://connect.facebook.net/en_US/all.js#xfbml=1',
    'https://bobthetechguy.com/wp-content/plugins/easy-twitter-feed-widget/lib/js/widget-loader.js',
    'https://bobthetechguy.com/wp-content/plugins/instagram-feed/js/sbi-scripts.min.js?ver=6.1',
    'https://files.coinmarketcap.com/static/widget/currency.js']) assert.strictEqual(I.isBlockedScript(u, noSlider), true, u);
  for (const u of ['https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.7.4/dist/btg.js', 'https://bobthetechguy.com/wp-includes/js/jquery/jquery.min.js', '']) assert.strictEqual(I.isBlockedScript(u, noSlider), false, u);
});

test('slider code is blocked only on pages without a slider', () => {
  const rs = 'https://bobthetechguy.com/wp-content/plugins/revslider/sr6/assets/js/rs6.min.js?ver=6.7.18';
  const rb = 'https://bobthetechguy.com/wp-content/plugins/revslider/sr6/assets/js/rbtools.min.js?ver=6.7.18';
  assert.strictEqual(I.isBlockedScript(rs, noSlider), true);
  assert.strictEqual(I.isBlockedScript(rb, noSlider), true);
  assert.strictEqual(I.isBlockedScript(rs, slider), false);
});

test('opening hours for schema come from the one weekly schedule', () => {
  assert.deepStrictEqual(H.schemaHours(), [
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Tuesday'], opens: '09:30', closes: '19:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Wednesday', 'Thursday', 'Friday'], opens: '09:30', closes: '17:00' },
    { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Saturday'], opens: '12:00', closes: '15:00' },
  ]);
});

test('LocalBusiness schema: hours, url and real profiles, still no street address', () => {
  const s = S.buildLocalBusiness(I.SCHEMA);
  assert.strictEqual(s.url, 'https://bobthetechguy.com/');
  assert.deepStrictEqual(s.openingHoursSpecification, H.schemaHours());
  assert.ok(s.sameAs.includes('https://maps.google.com/?cid=12486145650775343960'));
  assert.ok(s.sameAs.includes('https://www.facebook.com/BobTheTechGuy'));
  assert.ok(s.sameAs.includes('https://www.veteranownedbusiness.com/business/24505/bob-the-tech-guy'));
  assert.strictEqual(s.address, undefined);
  assert.doesNotMatch(JSON.stringify(s), /Broadway|streetAddress/);
});

test('page titles: city keywords on main and service pages, short enough for Google, others untouched', () => {
  const T = (p) => I.pageTitle(p);
  assert.strictEqual(T('/'), 'Computer Repair in Chesterfield, VA | Bob The Tech Guy');
  assert.strictEqual(T('/about/'), 'About Bob Dyer, Marine Veteran Tech | Bob The Tech Guy');
  assert.strictEqual(T('/services-2/'), 'Computer & IT Services in Chesterfield, VA | Bob The Tech Guy');
  assert.strictEqual(T('/contact-2/'), 'Contact Bob The Tech Guy | Chesterfield & Richmond, VA');
  assert.strictEqual(T('/reviews/'), 'Customer Reviews | Bob The Tech Guy, Chesterfield VA');
  assert.strictEqual(T('/testimonials/'), 'Customer Testimonials | Bob The Tech Guy, Chesterfield VA');
  assert.strictEqual(T('/gallery/'), 'Photo Gallery | Bob The Tech Guy, Chesterfield VA');
  assert.strictEqual(T('/northern-new-jersey/'), 'Computer Repair in Northern New Jersey | Bob The Tech Guy');
  assert.strictEqual(T('/networking/'), 'Networking in Chesterfield, VA | Bob The Tech Guy');
  assert.strictEqual(T('/data-recovery-service/'), 'Data Recovery Service in Chesterfield, VA | Bob The Tech Guy');
  assert.strictEqual(T('/software-installation-and-configuration/'), 'Software Setup in Chesterfield, VA | Bob The Tech Guy');
  const services = window.BTGSearch.PAGES.filter((p) => p.type === 'SERVICE').map((p) => p.url.replace('https://bobthetechguy.com', ''));
  assert.strictEqual(services.length, 15);
  for (const p of services.concat(['/', '/about/', '/services-2/', '/contact-2/', '/reviews/', '/testimonials/', '/gallery/', '/northern-new-jersey/'])) {
    assert.ok(T(p) && T(p).length <= 70, p + ' ' + T(p));
  }
  for (const p of ['/search/', '/support/', '/customer-log-in/', '/pc-repair-service-chester-virginia/']) assert.strictEqual(T(p), null, p);
});
