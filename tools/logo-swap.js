// tools/logo-swap.js
// Replaces the old linked "Bob-The-Tech-Guy-3.jpg" logo inside page content
// (About, Contact, Support) with the new wordmark served from the bundle.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BTGLogoSwap = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var OLD_LOGO = /<a href="[^"]*\/Bob-The-Tech-Guy-3\.jpg"[^>]*>\s*<img [^>]*src="[^"]*\/Bob-The-Tech-Guy-3\.jpg"[^>]*>\s*<\/a>/;

  function newLogo(version) {
    return '<img class="alignnone btg-content-logo" src="https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@' + version +
      '/dist/logo.png" alt="Bob The Tech Guy" width="282" height="80">';
  }

  function swapLogo(html, version) {
    var all = html.match(new RegExp(OLD_LOGO.source, 'g')) || [];
    if (all.length !== 1) throw new Error('Expected exactly one old logo, found ' + all.length);
    var out = html.replace(OLD_LOGO, newLogo(version));
    if (/Bob-The-Tech-Guy-3\.jpg/.test(out)) throw new Error('Page still references the old logo after the swap');
    return out;
  }

  return { OLD_LOGO: OLD_LOGO, newLogo: newLogo, swapLogo: swapLogo };
});
