// tools/nj-page.js — the one "Northern New Jersey" page that replaces ~375 near-identical NJ area posts.
// Bob's own lines come from the Contact and About pages.
const L = require('./loader.js');
const SERVICES = require('./search-pages.js').filter((p) => p.type === 'SERVICE');
const TOWNS = ['Pompton Lakes', 'Wayne', 'Wyckoff', 'Ramsey', 'Mahwah', 'Oakland', 'Allendale', 'Upper Saddle River', 'Saddle River', 'Waldwick',
  'Midland Park', 'Ridgewood', 'Glen Rock', 'Fair Lawn', 'Paramus', 'Riverdale', 'Butler', 'Wanaque', 'Pequannock', 'Montville', 'Totowa',
  'Bergen County', 'Passaic County'];
// Same Google listing pin as the footer map (NJ address OK to show; never the Virginia one).
const MAP = '<iframe class="btg-nj-map" src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d12042.5344460568!2d-74.288835!3d41.0113919!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0xad47b350a040c358!2sBob+The+Tech+Guy!5e0!3m2!1sen!2sus!4v1453449210878" title="Bob The Tech Guy on Google Maps" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
const esc =(s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

module.exports = function njPageContent(version) {
  return '<section class="btg-hero">\n' +
    '  <p class="btg-hero-eyebrow">Northern New Jersey</p>\n' +
    '  <h1 class="btg-hero-title">Still serving <strong>northern New Jersey</strong>.</h1>\n' +
    '  <p class="btg-hero-lede">Continuing to serve our northern New Jersey customers.</p>\n' +
    '  <a class="btg-hero-cta" href="tel:8622105656">(862) 210-5656</a>\n' +
    '</section>\n\n' +
    '<div class="btg-nj-intro"><p>Bob has seen a great many computer issues since inception in 2006, and has vast experience with troubleshooting any computer issue, including networking issues like cabling and switching. Once you\'re a Bob the Tech Guy customer, chances are you\'ll stay for life.</p></div>\n\n' +
    '<h2 class="btg-nj-h">Services</h2>\n' +
    '<ul class="btg-sr-list">' + SERVICES.map((p) => '<li><a class="btg-sr-item btg-card--' + p.icon + '" href="' + p.url + '"><span class="btg-search-ico btg-card--' + p.icon + '"></span><span class="btg-sr-title">' + esc(p.title) + '</span></a></li>').join('') + '</ul>\n\n' +
    '<h2 class="btg-nj-h">Towns we serve</h2>\n' +
    '<ul class="btg-nj-towns">' + TOWNS.map((t) => '<li>' + t + '</li>').join('') + '</ul>\n\n' +
    MAP + '\n\n' +
    '<div class="btg-cta-block"><p><strong>Have any questions? Need a quote? Call Today!</strong></p><p><strong><a href="tel:8448354890">844-TEKGUY-0</a> / <a href="tel:8622105656">(862) 210-5656</a></strong></p></div>' +
    L.loaderBlock(version);
};
