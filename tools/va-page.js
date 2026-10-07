// tools/va-page.js — the one "Chesterfield & Greater Richmond" page that replaces nine near-identical town posts
// (about 90% identical after swapping the city name). Same shape as tools/nj-page.js. Bob's own lines come from his
// existing Chesterfield page (tagline) and About page (the move). The service-area map is filled in by btg.js
// (.btg-zone-slot).
const L = require('./loader.js');
const SERVICES = require('./search-pages.js').filter((p) => p.type === 'SERVICE');
const TOWNS = ['Chesterfield', 'Richmond', 'Midlothian', 'Chester', 'Bon Air', 'Brandermill', 'Woodlake', 'Moseley', 'Colonial Heights'];
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

module.exports = function vaPageContent(version) {
  return '<section class="btg-hero">\n' +
    '  <p class="btg-hero-eyebrow">Now open in Chesterfield, VA</p>\n' +
    '  <h1 class="btg-hero-title">Best computer repair in <strong>Chesterfield, Virginia</strong>.</h1>\n' +
    '  <p class="btg-hero-lede">Diagnostics, virus removal, and networking for homes and small businesses.</p>\n' +
    '  <a class="btg-hero-cta" href="tel:8448354890">844-TEKGUY-0</a>\n' +
    '</section>\n\n' +
    '<div class="btg-nj-intro"><p>In July 2026, Bob and his family made the move from New Jersey to Chesterfield, Virginia, and Bob the Tech Guy came with them. The company now serves the greater Richmond area — Chesterfield, Midlothian, Chester, Bon Air, Colonial Heights and beyond — while continuing to take care of its loyal customers back in northern New Jersey. Two locations, same Bob, same promise: professional service at reasonable rates, done right the first time.</p></div>\n\n' +
    '<h2 class="btg-nj-h">Services</h2>\n' +
    '<ul class="btg-sr-list">' + SERVICES.map((p) => '<li><a class="btg-sr-item btg-card--' + p.icon + '" href="' + p.url + '"><span class="btg-search-ico btg-card--' + p.icon + '"></span><span class="btg-sr-title">' + esc(p.title) + '</span></a></li>').join('') + '</ul>\n\n' +
    '<h2 class="btg-nj-h">Towns we serve</h2>\n' +
    '<ul class="btg-nj-towns">' + TOWNS.map((t) => '<li>' + t + '</li>').join('') + '</ul>\n\n' +
    '<div class="btg-zone-slot"></div>\n\n' +
    '<div class="btg-cta-block"><p><strong>Have any questions? Need a quote? Call Today!</strong></p><p><strong><a href="tel:8448354890">844-TEKGUY-0</a></strong></p></div>' +
    L.loaderBlock(version);
};
