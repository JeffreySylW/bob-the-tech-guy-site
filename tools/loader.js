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
  // The site-wide loader for Avada's "Space before </head>" field: one copy on every front-end page (issue #3).
  // `defer` keeps the 100KB script from blocking the parser; the bundle starts once the page is parsed.
  function headBlock(v) {
    return '<!-- btg-head v1 -->\n' + PREHIDE + '\n<link rel="stylesheet" href="' + cdn(v) + 'css">\n<script defer src="' + cdn(v) + 'js"></script>\n';
  }
  // Take a page's own loader (and the early pre-hide copy) back out once headBlock() serves every page.
  var LOADER_END = /\n\n<!-- btg-loader v1 -->\n(?:<style>[^\n]*<\/style>\n)?<link rel="stylesheet" href="https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v[0-9.]+\/dist\/btg\.css">\n<script src="https:\/\/cdn\.jsdelivr\.net\/gh\/JeffreySylW\/bob-the-tech-guy-site@v[0-9.]+\/dist\/btg\.js"><\/script>$/;
  function strip(content) {
    var out = content.indexOf(EARLY) === 0 ? content.slice(EARLY.length) : content;
    if (!LOADER_END.test(out)) throw new Error('No standard loader at the end of the page');
    return out.replace(LOADER_END, '');
  }
  // Move an existing loader to version `to` and add the pre-hide style if it is missing.
  function upgrade(content, from, to) {
    var a = cdn(from), n = content.split(a).length - 1;
    if (!/<!-- btg-loader v1 -->/.test(content) || n !== 2) throw new Error('No standard loader at ' + from + ' found (' + n + ' references)');
    var out = content.split(a).join(cdn(to));
    if (out.indexOf('btg-reveal') === -1) out = out.replace('<!-- btg-loader v1 -->\n', '<!-- btg-loader v1 -->\n' + PREHIDE + '\n');
    return out.indexOf('<!-- btg-early -->') === 0 ? out : EARLY + out;
  }
  return { PREHIDE: PREHIDE, EARLY: EARLY, loaderBlock: loaderBlock, headBlock: headBlock, strip: strip, upgrade: upgrade };
});
