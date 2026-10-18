// tools/remote-support-page.js — the Remote Support service page (Bob's request, 2026-10-17).
// Only Bob's own facts are used: he has licensed remote-access software, it works only when the customer's PC is reachable
// over the internet, and it is an option alongside his on-site service. The download link is the existing Support page.
// No prices, hours or promises about what can be fixed remotely: add those only when Bob supplies them.
// The bundle loads from Avada's <head> field, so (unlike the older page tools) no loader block is appended.
module.exports = function remoteSupportContent() {
  return '<section class="btg-hero">\n' +
    '  <p class="btg-hero-eyebrow">Services &middot; Remote Support</p>\n' +
    '  <h1 class="btg-hero-title">Fixed remotely, <strong>without a visit</strong>.</h1>\n' +
    '  <p class="btg-hero-lede">Bob can connect to your computer over the internet and fix the problem remotely.</p>\n' +
    '  <a class="btg-hero-cta" href="tel:8448354890">844-TEKGUY-0</a>\n' +
    '</section>\n\n' +
    '<div class="btg-split btg-split--stacked">\n' +
    '<div class="btg-split-text">\n' +
    '<p>Bob has licensed remote-access software, so he can connect to your computer over the internet and work on the problem without a visit. Remote support is an option alongside his on-site service.</p>\n' +
    '</div>\n' +
    '<div class="btg-include-card btg-card--remote">\n' +
    '<h2 class="entry-title">How remote support works:</h2>\n' +
    '<ul class="btg-checklist">\n' +
    '<li>Bob connects to your computer over the internet using licensed remote-access software.</li>\n' +
    '<li>Your computer needs to be turned on and connected to the internet.</li>\n' +
    '<li>To get started, download the <a href="https://bobthetechguy.com/support/">Bob The Tech Guy Support App</a> or call 844-TEKGUY-0.</li>\n' +
    '</ul>\n' +
    '</div>\n' +
    '</div>\n\n' +
    '<div class="btg-cta-block">\n' +
    '<h3 class="entry-title">Have any questions? Need a quote for Remote Support?</h3>\n' +
    '<p><strong>Call Today!</strong></p>\n' +
    '<p><strong><a href="tel:844-TEKGUY-0">844-TEKGUY-0</a> / <a href="tel:(862)210-5656">(862)210-5656</a></strong></p>\n' +
    '</div>\n';
};
