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
  // Where the untouchable tail (per-page style block, then the loader) starts.
  function tailStart(html) {
    var at = html.search(/<style>\/\* btg-styles \*\/|<!-- btg-loader/);
    return at < 0 ? html.length : at;
  }

  function chunks(html) {
    var at = tailStart(html);
    var head = html.slice(0, at);
    var tail = html.slice(at);
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

  // Small Services pages: intro paragraph(s) beside a "Services Include" card.
  // Spec: docs/superpowers/specs/2026-09-27-services-split-and-index-design.md
  var LONG_LIST = 8;
  var EMBED = /<(img|iframe|video|embed|object)\b/i;
  var STACK_RATIO = 0.5; // calibrated on the 9 pages' rendered heights at 1440px
  function transformSplit(html, r) {
    if (html.indexOf('class="btg-hero"') !== -1) throw new Error('Already transformed');
    var c = chunks(html), blocks = c.blocks, claimed = [];
    function claim(b) { if (claimed.indexOf(b) === -1) claimed.push(b); return b; }
    function one(list, what) {
      if (list.length !== 1) throw new Error((list.length ? 'Found ' + list.length + ' times' : 'Missing anchor') + ': "' + what + '"');
      return claim(list[0]);
    }
    function heading(start) { return one(blocks.filter(function (b) { return b.kind === 'block' && /^h[2-4]$/.test(b.tag) && b.text.indexOf(start) === 0; }), start); }

    var h = heading(r.listHeading), cta = heading('Have any questions?');
    var hi = blocks.indexOf(h), ci = blocks.indexOf(cta);
    var banner = null, intro = [], items = [], notes = [];
    blocks.slice(0, hi).forEach(function (b) {
      if (b.kind !== 'p') return;
      if (!b.text) {
        if (/<img\b/.test(b.html)) { if (banner) throw new Error('Two images before the list'); banner = claim(b); }
        else claim(b);
        return;
      }
      intro.push(claim(b));
    });
    if (!intro.length) throw new Error('No intro paragraph before "' + r.listHeading + '"');
    blocks.slice(hi + 1, ci).forEach(function (b) {
      if (b.kind !== 'p') return;
      if (EMBED.test(b.html)) throw new Error('Image or embed inside the list: ' + b.html.slice(0, 60));
      claim(b);
      if (!b.text) return;
      if (/^(•|\*)/.test(b.text)) {
        if (notes.length) throw new Error('List item after a note: ' + b.text.slice(0, 40));
        items.push(itemHtml(b.html));
      } else notes.push(b);
    });
    if (!items.length) throw new Error('No list items under "' + r.listHeading + '"');
    var call = one(blocks.filter(function (b) { return b.kind === 'p' && b.text === 'Call Today!'; }), 'Call Today!');
    var phones = one(blocks.filter(function (b) { return b.kind === 'p' && b.text.indexOf('844-TEKGUY-0 /') !== -1; }), '844-TEKGUY-0 /');
    blocks.forEach(function (b) { if (b.kind === 'p' && !b.text && !EMBED.test(b.html)) claim(b); });
    var left = blocks.filter(function (b) { return claimed.indexOf(b) === -1; });
    if (left.length) throw new Error('Unmapped content: ' + left.map(function (b) { return b.text.slice(0, 50); }).join(' | '));

    var out = heroHtml(r.hero) + '\n\n';
    if (banner) out += '<p class="btg-banner">' + banner.html + '</p>\n';
    // Stack (paragraph above a full-width card) when the card would tower over the
    // paragraph beside it: a long list, or list text over half the intro's length.
    var introLen = C.text(intro.map(function (p) { return p.html; }).join(' ')).length;
    var listLen = C.text(items.join(' ')).length;
    var stacked = items.length > LONG_LIST || listLen > introLen * STACK_RATIO;
    out += '<div class="btg-split' + (stacked ? ' btg-split--stacked' : '') + '">' +
      '<div class="btg-split-text">' + intro.map(function (p) { return '<p>' + p.html + '</p>'; }).join('') + '</div>' +
      '<div class="btg-include-card btg-card--' + r.icon + '">' + h.html +
      '<ul class="btg-checklist">' + items.map(function (i) { return '<li>' + i + '</li>'; }).join('') + '</ul></div></div>\n';
    notes.forEach(function (n) { out += '<p class="btg-note">' + n.html + '</p>\n'; });
    out += '<div class="btg-cta-block">' + cta.html + '<p>' + call.html + '</p><p>' + phones.html + '</p></div>';
    return out + (c.tail ? '\n\n' + c.tail : '');
  }

  function norm(t) { return C.text(t).replace(GLYPH, '').replace(/^[✓•*]\s*/, '').replace(/\s+/g, ' ').trim(); }
  function sentences(t) { return t ? t.split(/(?<=[.!?]['")]*)\s+(?=\S)/) : []; }
  function bag(list) { var m = {}; list.forEach(function (s) { m[s] = (m[s] || 0) + 1; }); return m; }

  // Text units of the explicit-markup output (p, li, headings, summary).
  function outputUnits(html) {
    var head = html.slice(0, tailStart(html));
    var re = /<(p|li|h[1-6]|summary)\b[^>]*>([\s\S]*?)<\/\1>/g, m, out = [];
    while ((m = re.exec(head))) out.push(norm(m[2]));
    return out.filter(Boolean);
  }

  // Safety gate before any save: [] means safe.
  function verifyService(before, after, r) {
    var cards = r.cards || [];
    var problems = [];
    var c = chunks(before);
    var units = [];
    c.blocks.forEach(function (b) {
      var t = norm(b.html);
      if (!t || (r.removeSubheads || []).indexOf(t) !== -1) return;
      if (b.kind === 'p' && (r.merge || []).some(function (m) { return t.indexOf(m) === 0; })) { units[units.length - 1] += ' ' + t; return; }
      units.push(r.ctaFix ? t.replace(norm(r.ctaFix[0]), norm(r.ctaFix[1])) : t);
    });
    var added = [r.hero.eyebrow, r.hero.title, r.hero.lede].concat(cards.map(function (cd) { return cd.title; }))
      .concat(cards.map(function () { return 'Read more'; })).map(norm);
    var expect = bag([].concat.apply([], units.concat(added).map(sentences)));
    var got = bag([].concat.apply([], outputUnits(after).map(sentences)));
    Object.keys(expect).concat(Object.keys(got)).forEach(function (s) {
      var e = expect[s] || 0, g = got[s] || 0, msg = 'Sentence "' + s.slice(0, 60) + '" expected ' + e + ', found ' + g;
      if (e !== g && problems.indexOf(msg) === -1) problems.push(msg);
    });

    // Card membership and order: each card's sentences, in order, equal its anchors' paragraphs.
    var articles = after.match(/<article class="btg-card[\s\S]*?<\/article>/g) || [];
    if (articles.length !== cards.length) problems.push('Expected ' + cards.length + ' cards, found ' + articles.length);
    cards.forEach(function (cd, i) {
      var src = cd.anchors.map(function (a) { return c.blocks.filter(function (b) { return b.kind === 'p' && b.text.indexOf(a) !== -1; })[0]; })
        .filter(function (p, k, all) { return p && all.indexOf(p) === k; });
      var want = [].concat.apply([], src.map(function (p) { return sentences(norm(p.html)); })).join(' | ');
      var body = (articles[i] || '').replace(/<h3 class="btg-card-title">[\s\S]*?<\/h3>|<summary>[\s\S]*?<\/summary>/g, '');
      var have = [].concat.apply([], (body.match(/<p\b[^>]*>[\s\S]*?<\/p>/g) || []).map(function (p) { return sentences(norm(p)); })).join(' | ');
      if (want !== have) problems.push('Card "' + cd.title + '" content differs from its source paragraphs');
    });

    // Built region: from the cards grid / split opening tag up to the CTA block.
    function region(marker) {
      var i = after.indexOf(marker);
      return i < 0 ? '' : after.slice(i + marker.length).split('class="btg-cta-block"')[0].replace(/^[^>]*>/, '');
    }
    var built = region('class="btg-cards"') + region('class="btg-split');
    if (/<[^>]*\s(hidden|style|aria-hidden|open)(=|>|\s|\/)[^>]*>?|screen-reader-text/.test(built)) problems.push('Hidden or styled element inside the cards');

    // Order: the page's sentences, minus the approved additions, read in the original order.
    var addLeft = bag([].concat.apply([], added.map(sentences)));
    var ordered = [].concat.apply([], outputUnits(after).map(sentences)).filter(function (s) {
      if (addLeft[s]) { addLeft[s]--; return false; }
      return true;
    });
    if (ordered.join(' | ') !== [].concat.apply([], units.map(sentences)).join(' | ')) problems.push('Content order differs from the original page');

    // No text outside the checked elements (the hero call button is the one allowed exception).
    var stray = C.text(after.slice(0, tailStart(after))
      .replace(/<a class="btg-hero-cta"[^>]*>[\s\S]*?<\/a>/, '')
      .replace(/<(p|li|h[1-6]|summary)\b[^>]*>[\s\S]*?<\/\1>/g, ''));
    if (stray) problems.push('Text outside checked elements: ' + stray.slice(0, 60));

    // Links: the same hrefs as before, plus the hero call button.
    function hrefs(h) { return (h.match(/href="[^"]*"/g) || []).sort().join(' '); }
    var wantHrefs = (before.slice(0, before.length - c.tail.length).match(/href="[^"]*"/g) || []).concat(['href="tel:8448354890"']).sort().join(' ');
    if (hrefs(after.slice(0, after.length - c.tail.length)) !== wantHrefs) problems.push('Links differ from the original page');

    // Images and embeds: the same src values as before, same count.
    function srcs(h) { return (h.match(/\ssrc="[^"]*"/g) || []).sort().join(' '); }
    if (srcs(after.slice(0, tailStart(after))) !== srcs(before.slice(0, before.length - c.tail.length))) problems.push('Images or embeds differ from the original page');

    // Card titles in recipe order.
    var gotTitles = (after.match(/<h3 class="btg-card-title">[^<]*<\/h3>/g) || []).map(function (t) { return t.replace(/<[^>]+>/g, ''); });
    if (gotTitles.join('|') !== cards.map(function (cd) { return cd.title; }).join('|')) problems.push('Card titles differ from the recipe');
    if (!after.endsWith(c.tail)) problems.push('Style tail changed');
    if (/\b\d{1,6}\s+(?:[A-Z][a-z]+\s+){1,3}(?:St|Street|Rd|Road|Ave|Avenue|Blvd|Boulevard|Dr|Drive|Ln|Lane|Ct|Court|Pkwy|Parkway|Hwy|Highway|Tpke|Turnpike|Pike|Way|Pl|Place)\b/.test(C.text(after))) problems.push('Street-address pattern found');
    return problems;
  }

  return { tailStart: tailStart, chunks: chunks, itemHtml: itemHtml, addLoader: addLoader, transformService: transformService, transformSplit: transformSplit, verifyService: verifyService };
});
