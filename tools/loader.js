// tools/loader.js — the loader block every page ends with.
// The inline style hides the old theme header and page area until btg.js has rebuilt them (no flash of the old
// design); a CSS-only timer reveals everything after 1.5s if the bundle never arrives.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BTGLoader = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var PREHIDE = '<style>html:not(.btg-ready) .fusion-header-wrapper,html:not(.btg-ready) #main{visibility:hidden;animation:btg-reveal 0s 1.5s forwards}@keyframes btg-reveal{to{visibility:visible}}</style>';
  // A copy at the very top of the content: the end-of-page loader arrives ~20KB after the old header, and on a
  // slow connection the browser paints in between. ponytail: still after the header; the real fix is the loader in <head> (admin).
  var EARLY = '<!-- btg-early -->\n' + PREHIDE + '\n';
  function cdn(v) { return 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@' + v + '/dist/btg.'; }
  function loaderBlock(v) {
    return '\n\n<!-- btg-loader v1 -->\n' + PREHIDE + '\n<link rel="stylesheet" href="' + cdn(v) + 'css">\n<script src="' + cdn(v) + 'js"></script>';
  }
  // Move an existing loader to version `to` and add the pre-hide style if it is missing.
  function upgrade(content, from, to) {
    var a = cdn(from), n = content.split(a).length - 1;
    if (!/<!-- btg-loader v1 -->/.test(content) || n !== 2) throw new Error('No standard loader at ' + from + ' found (' + n + ' references)');
    var out = content.split(a).join(cdn(to));
    if (out.indexOf('btg-reveal') === -1) out = out.replace('<!-- btg-loader v1 -->\n', '<!-- btg-loader v1 -->\n' + PREHIDE + '\n');
    return out.indexOf('<!-- btg-early -->') === 0 ? out : EARLY + out;
  }
  return { PREHIDE: PREHIDE, EARLY: EARLY, loaderBlock: loaderBlock, upgrade: upgrade };
});
