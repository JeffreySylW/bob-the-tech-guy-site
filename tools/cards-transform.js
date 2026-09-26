// tools/cards-transform.js
// Regroups a town post's walls of text into summary cards.
// Spec: docs/superpowers/specs/2026-09-25-town-page-cards-design.md
// Pure string in, string out. Runs under node --test and in the browser
// (loaded from jsDelivr into the signed-in WP tab as window.BTGCards).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BTGCards = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ENTITIES = {
    '&amp;': '&', '&#038;': '&', '&nbsp;': ' ', '&quot;': '"',
    '&#8217;': "'", '&rsquo;': "'", '&#8216;': "'", '&lsquo;': "'",
    '&#8220;': '"', '&#8221;': '"', '&ldquo;': '"', '&rdquo;': '"',
    '&#8211;': '-', '&ndash;': '-', '&#8212;': '-', '&mdash;': '-'
  };

  function text(html) {
    return html
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[#\w]+;/g, function (e) { return ENTITIES[e] || ' '; })
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ').trim();
  }

  // Top-level blocks of a flat post body (plus HTML comments, e.g. the
  // "<!-- btg-loader v1 -->" marker). Anything else at top level is an
  // error: the transform must never silently skip content.
  var BLOCK = /<(section|p|h[1-6]|ul|ol|div|blockquote|script|style|details)\b[^>]*>[\s\S]*?<\/\1\s*>|<link\b[^>]*>|<hr\b[^>]*>|<!--[\s\S]*?-->/y;

  function split(html) {
    var out = [];
    var pos = 0;
    var ws = /\s*/y;
    while (true) {
      ws.lastIndex = pos; ws.exec(html); pos = ws.lastIndex;
      if (pos >= html.length) break;
      BLOCK.lastIndex = pos;
      var m = BLOCK.exec(html);
      if (!m) throw new Error('Unexpected content at ' + pos + ': ' + html.slice(pos, pos + 60));
      out.push({
        tag: m[1] ? m[1].toLowerCase() : (m[0].indexOf('<!--') === 0 ? '#comment' : m[0].match(/^<(\w+)/)[1].toLowerCase()),
        html: m[0], start: pos, end: BLOCK.lastIndex, text: text(m[0])
      });
      pos = BLOCK.lastIndex;
    }
    return out;
  }

  function splitFirstSentence(pHtml) {
    var m = /^<p\b([^>]*)>([\s\S]*)<\/p\s*>$/.exec(pHtml.trim());
    if (!m) throw new Error('Not a paragraph: ' + pHtml.slice(0, 60));
    var attrs = m[1], inner = m[2], inTag = false, cut = inner.length;
    for (var i = 0; i < inner.length; i++) {
      var ch = inner[i];
      if (ch === '<') inTag = true;
      else if (ch === '>') inTag = false;
      else if (!inTag && /[.!?]/.test(ch) && (i + 1 === inner.length || /\s/.test(inner[i + 1]))) { cut = i + 1; break; }
    }
    var sentence = inner.slice(0, cut).trim();
    var open = (sentence.match(/<[a-z][^>]*>/gi) || []).length;
    var close = (sentence.match(/<\/[a-z][^>]*>/gi) || []).length;
    if (open !== close) throw new Error('First sentence has unbalanced tags: ' + sentence.slice(0, 60));
    var rest = inner.slice(cut).trim();
    return { sentence: sentence, restHtml: rest ? '<p' + attrs + '>' + rest + '</p>' : '' };
  }

  return { text: text, split: split, splitFirstSentence: splitFirstSentence };
});
