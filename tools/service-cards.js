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

  function heroHtml(h) {
    return '<section class="btg-hero">\n' +
      '  <p class="btg-hero-eyebrow">' + h.eyebrow + '</p>\n' +
      '  <h1 class="btg-hero-title">' + h.title + '</h1>\n' +
      '  <p class="btg-hero-lede">' + h.lede + '</p>\n' +
      '  <a class="btg-hero-cta" href="tel:8448354890">844-TEKGUY-0</a>\n' +
      '</section>';
  }

  function transformService(html, r) {
    if (html.indexOf('class="btg-cards"') !== -1) throw new Error('Already transformed');
    var c = chunks(html), blocks = c.blocks, claimed = [];
    function claim(b) { if (claimed.indexOf(b) === -1) claimed.push(b); return b; }
    function one(list, what) {
      if (list.length !== 1) throw new Error((list.length ? 'Found ' + list.length + ' times' : 'Missing anchor') + ': "' + what + '"');
      return claim(list[0]);
    }
    function findP(anchor) { return one(blocks.filter(function (b) { return b.kind === 'p' && b.text.indexOf(anchor) !== -1; }), anchor); }
    function findHeading(textStart) { return one(blocks.filter(function (b) { return b.kind === 'block' && /^h[2-4]$/.test(b.tag) && b.text.indexOf(textStart) === 0; }), textStart); }
    function list(items) { return '<ul class="btg-checklist">' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul>'; }

    var out = [];
    (r.keepBefore || []).forEach(function (t) { out.push(findHeading(t).html); });
    if (r.topChecklist) out.push(list(r.topChecklist.map(function (a) { return itemHtml(findP(a).html); })));

    out.push('<div class="btg-cards">' + r.cards.map(function (cd) {
      var ps = cd.anchors.map(findP).filter(function (p, i, all) { return all.indexOf(p) === i; });
      var first = C.splitFirstSentence('<p>' + ps[0].html + '</p>');
      var body = first.restHtml + ps.slice(1).map(function (p) { return '<p>' + p.html + '</p>'; }).join('');
      return '<article class="btg-card btg-card--' + cd.icon + '">' +
        '<h3 class="btg-card-title">' + cd.title + '</h3>' +
        '<p class="btg-card-summary">' + first.sentence + '</p>' +
        '<details><summary>Read more</summary>' + body + '</details></article>';
    }).join('') + '</div>');

    var cta = findHeading('Have any questions?');
    if (r.listHeading) {
      var h = findHeading(r.listHeading);
      out.push(h.html);
      var items = [];
      for (var i = blocks.indexOf(h) + 1; i < blocks.indexOf(cta); i++) {
        var b = blocks[i];
        if (b.kind !== 'p' || !b.text) continue;
        if ((r.merge || []).some(function (m) { return b.text.indexOf(m) === 0; })) {
          if (!items.length) throw new Error('Merge target has no previous item: ' + b.text.slice(0, 40));
          items[items.length - 1] += ' ' + itemHtml(claim(b).html);
        } else if (/^(•|\*)/.test(b.text)) {
          items.push(itemHtml(claim(b).html));
        }
      }
      if (!items.length) throw new Error('No list items under "' + r.listHeading + '"');
      out.push(list(items));
    }
    (r.after || []).forEach(function (a) { out.push('<p>' + findP(a).html + '</p>'); });

    var ctaHtml = cta.html;
    if (r.ctaFix) {
      if (ctaHtml.indexOf(r.ctaFix[0]) === -1) throw new Error('CTA fix target not found: ' + r.ctaFix[0]);
      ctaHtml = ctaHtml.replace(r.ctaFix[0], r.ctaFix[1]);
    }
    var call = one(blocks.filter(function (b) { return b.kind === 'p' && b.text === 'Call Today!'; }), 'Call Today!');
    var phones = findP('844-TEKGUY-0 /');
    out.push('<div class="btg-cta-block">' + ctaHtml + '<p>' + call.html + '</p><p>' + phones.html + '</p></div>');

    blocks.forEach(function (b) {
      if (b.kind === 'p' && !b.text) claim(b);
      if (b.kind === 'p' && (r.removeSubheads || []).indexOf(b.text) !== -1) claim(b);
    });
    var left = blocks.filter(function (b) { return claimed.indexOf(b) === -1; });
    if (left.length) throw new Error('Unmapped content: ' + left.map(function (b) { return b.text.slice(0, 50); }).join(' | '));

    return heroHtml(r.hero) + '\n\n' + out.join('\n') + '\n\n' + c.tail;
  }

  return { chunks: chunks, itemHtml: itemHtml, addLoader: addLoader, transformService: transformService };
});
