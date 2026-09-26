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

  var CARDS = [
    { icon: 'shield', title: 'Virus &amp; Malware Removal', paras: ['Computers and the threats', 'fights viruses and malware'], list: true },
    { icon: 'laptop', title: 'New Computer Setup', paras: ['So you have a new computer'], list: true },
    { icon: 'wifi', title: 'Internet &amp; Home Wi-Fi', paras: ['Whether your home internet'] },
    { icon: 'network', title: 'Home &amp; Small-Office Networks', paras: ['When asked to set up a shared', 'There are multiple ways', 'The way homes and small businesses'], optional: ['There are multiple ways'] },
    { icon: 'gauge', title: 'Tune-Ups &amp; Maintenance', paras: ['Your computer, like any machine'] },
    { icon: 'drive', title: 'Data Recovery', paras: ['Have you lost your data'], list: true }
  ];

  // Subheadings the card titles replace. Everything else in the body must be
  // claimed by a card or the CTA, or transform() throws.
  var REMOVABLE = /^(PC Repair Service .+ Virginia|Best Computer Repair Chesterfield VA|Internet, Home (&|and) Wireless Networking|Home Networking|Wireless Networking|New Computer Setup|Tune-Ups (&|and) Data Recovery)$/;

  function isHeading(e) { return /^h[2-4]$/.test(e.tag); }

  function transform(html) {
    if (html.indexOf('class="btg-cards"') !== -1) throw new Error('Already transformed');
    var els = split(html);
    var heroIdx = -1, endIdx = -1;
    els.forEach(function (e, i) {
      if (heroIdx < 0 && e.tag === 'section' && /class="btg-hero"/.test(e.html)) heroIdx = i;
      if (endIdx < 0 && isHeading(e) && e.text.indexOf('Proudly Serving') === 0) endIdx = i;
    });
    if (heroIdx < 0) throw new Error('No hero section');
    if (endIdx < 0 || endIdx < heroIdx) throw new Error('No "Proudly Serving" heading after the hero');
    // Block-editor posts wrap each block in <!-- wp:… --> comments. The
    // Proudly Serving heading keeps its opener; delimiters inside the region
    // are dropped and the grid + CTA become one Custom HTML block.
    var blocks = /<!-- \/?wp:/.test(html);
    if (blocks && els[endIdx - 1].tag === '#comment' && /^<!-- wp:/.test(els[endIdx - 1].html)) endIdx--;
    var region = els.slice(heroIdx + 1, endIdx);
    var claimed = [];
    function claim(e) { if (claimed.indexOf(e) === -1) claimed.push(e); return e; }

    function findP(anchor, optional) {
      var hits = region.filter(function (e) { return e.tag === 'p' && e.text.indexOf(anchor) !== -1; });
      if (hits.length > 1) throw new Error('Anchor found ' + hits.length + ' times: "' + anchor + '"');
      if (!hits.length) { if (optional) return null; throw new Error('Missing anchor: "' + anchor + '"'); }
      return claim(hits[0]);
    }

    var cards = CARDS.map(function (c) {
      var ps = c.paras.map(function (a) { return findP(a, (c.optional || []).indexOf(a) !== -1); }).filter(Boolean);
      var parts = ps.slice();
      if (c.list) {
        var ul = null;
        for (var i = region.indexOf(ps[ps.length - 1]) + 1; i < region.length; i++) {
          if (region[i].tag === 'ul') { ul = region[i]; break; }
          if (region[i].tag === 'p') break;
        }
        if (!ul) throw new Error('No checklist after "' + c.paras[c.paras.length - 1] + '"');
        parts.push(claim(ul));
      }
      var first = splitFirstSentence(ps[0].html);
      var body = first.restHtml + parts.slice(1).map(function (e) { return e.html.trim(); }).join('');
      return '<article class="btg-card btg-card--' + c.icon + '">' +
        '<h3 class="btg-card-title">' + c.title + '</h3>' +
        '<p class="btg-card-summary">' + first.sentence + '</p>' +
        '<details><summary>Read more</summary>' + body + '</details></article>';
    });

    var q = region.filter(function (e) { return e.tag === 'p' && e.text.indexOf('Have any questions?') === 0; });
    if (q.length !== 1) throw new Error('Expected one "Have any questions?" paragraph, found ' + q.length);
    var phone = region.slice(region.indexOf(q[0]) + 1).filter(function (e) { return e.tag !== '#comment'; })[0];
    if (!phone || phone.tag !== 'p' || phone.text !== '844-TEKGUY-0') throw new Error('Phone paragraph not right after "Have any questions?"');
    var cta = '<div class="btg-cards-cta">' + claim(q[0]).html.trim() + claim(phone).html.trim() + '</div>';

    region.forEach(function (e) {
      if (isHeading(e) && REMOVABLE.test(e.text)) claim(e);
      if (e.tag === '#comment' && /^<!-- \/?wp:/.test(e.html)) claim(e);
    });
    var left = region.filter(function (e) { return claimed.indexOf(e) === -1; });
    if (left.length) throw new Error('Unmapped content: ' + left.map(function (e) { return (e.text || e.html).slice(0, 50); }).join(' | '));

    var grid = '<div class="btg-cards">' + cards.join('') + '</div>\n\n' + cta;
    // Nested delimiters (e.g. wp:list-item inside a moved list) would parse
    // as broken inner blocks of the Custom HTML block; they render nothing.
    if (blocks) grid = '<!-- wp:html -->\n' + grid.replace(/<!-- \/?wp:[\s\S]*?-->\s*/g, '') + '\n<!-- /wp:html -->';
    return html.slice(0, els[heroIdx].end) + '\n\n' + grid + '\n\n' + html.slice(els[endIdx].start);
  }

  return { text: text, split: split, splitFirstSentence: splitFirstSentence, CARDS: CARDS, REMOVABLE: REMOVABLE, transform: transform };
});
