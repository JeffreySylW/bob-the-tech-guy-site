// tools/service-cards.js
// Rebuilds a classic-content Services page (bare paragraphs, block headings,
// trailing <style>/* btg-styles */ block) into hero + summary cards +
// checklist + CTA block, from a recipe in tools/service-recipes.js.
// Spec: docs/superpowers/specs/2026-09-26-services-cards-and-centering-design.md
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards-transform.js'));
  else root.BTGServiceCards = factory(root.BTGCards);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  var CDN = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@';
  var BLOCK = /<(h[1-6]|ul|ol|section|div|blockquote|table)\b[^>]*>[\s\S]*?<\/\1\s*>/g;

  // WordPress turns blank-line-separated text into paragraphs on render;
  // this mirrors that split. The trailing style block (and anything after
  // it) is the tail and is never touched.
  function chunks(html) {
    var at = html.search(/<style>\/\* btg-styles \*\/|<!-- btg-loader/);
    var head = at < 0 ? html : html.slice(0, at);
    var tail = at < 0 ? '' : html.slice(at);
    var blocks = [], last = 0, m;
    function pushText(t) {
      t.split(/\n\s*\n/).forEach(function (p) {
        p = p.trim();
        if (!p) return;
        if (/\n/.test(p)) throw new Error('Paragraph contains a single newline (would render as <br>): ' + p.slice(0, 60));
        blocks.push({ kind: 'p', html: p, text: C.text(p) });
      });
    }
    BLOCK.lastIndex = 0;
    while ((m = BLOCK.exec(head))) {
      pushText(head.slice(last, m.index));
      blocks.push({ kind: 'block', tag: m[1].toLowerCase(), html: m[0], text: C.text(m[0]) });
      last = BLOCK.lastIndex;
    }
    pushText(head.slice(last));
    return { blocks: blocks, tail: tail };
  }

  var GLYPH = /^\s*(?:<span[^>]*>\s*&#10003;\s*<\/span>|•|&bull;|\*)\s*/;

  function itemHtml(pHtml) {
    return pHtml.replace(/<\/?strong>/g, '').replace(GLYPH, '').trim();
  }

  function addLoader(html, version) {
    if (/btg-loader|bob-the-tech-guy-site@/.test(html)) throw new Error('Page already has a loader');
    return html + '\n<!-- btg-loader v1 -->\n' +
      '<link rel="stylesheet" href="' + CDN + version + '/dist/btg.css">\n' +
      '<script src="' + CDN + version + '/dist/btg.js"></script>';
  }

  return { chunks: chunks, itemHtml: itemHtml, addLoader: addLoader };
});
