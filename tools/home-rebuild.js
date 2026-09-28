// tools/home-rebuild.js
// Rebuilds the homepage body (page 2318) from Avada builder shortcodes into the
// bundle's card markup: announcement, services, why-choose, reviews, about,
// call-to-action, badges. Bob's words, links and images are moved, never changed.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards-transform.js'), require('./markup-guard.js'));
  else root.BTGHomeRebuild = factory(root.BTGCards, root.BTGGuard);
})(typeof self !== 'undefined' ? self : this, function (C, G) {
  'use strict';

  function attr(tag, name) {
    var m = new RegExp('(?:^|\\s)' + name + '="([^"]*)"').exec(tag);
    return m ? m[1] : '';
  }
  function one(s, re, what) {
    var all = s.match(new RegExp(re.source, 'g')) || [];
    if (all.length !== 1) throw new Error('Expected exactly one ' + what + ', found ' + all.length);
    return re.exec(s);
  }
  function unwrap(html) { return html.replace(/^\s*<center>\s*|\s*<\/center>\s*$/g, '').replace(/^<em>|<\/em>$/g, '').trim(); }
  var ICON = { 'fa-flag': 'flag', 'fa-wrench': 'tool', 'fa-star': 'star', 'fa-home': 'home' };
  var SVC_ICON = ['box', 'gauge', 'shield', 'wifi'];

  function tailStart(s) { var i = s.indexOf('<!-- btg-loader'); return i < 0 ? s.length : i; }

  function parse(s) {
    if (s.indexOf('class="btg-home-') !== -1) throw new Error('Already rebuilt');
    var start = s.indexOf('[tagline_box'), end = tailStart(s);
    if (start < 0) throw new Error('No builder content found');
    var body = s.slice(start, end), used = body;
    function take(re, what) { var m = one(used, re, what); used = used.replace(m[0], ' '); return m; }
    function takeAll(re, n, what) {
      var all = [], m, g = new RegExp(re.source, 'g');
      while ((m = g.exec(used))) all.push(m);
      if (all.length !== n) throw new Error('Expected ' + n + ' ' + what + ', found ' + all.length);
      all.forEach(function (x) { used = used.replace(x[0], ' '); });
      return all;
    }
    var model = { hero: s.slice(0, start), tail: s.slice(end) };
    var t1 = take(/\[tagline_box([^\]]*title="Now Open[^\]]*)\]\[\/tagline_box\]/, 'announcement');
    model.announce = { link: attr(t1[1], 'link'), title: attr(t1[1], 'title'), text: attr(t1[1], 'description'), button: attr(t1[1], 'button') };
    var titles = takeAll(/\[title [^\]]*\]([^[]*)\[\/title\]/, 3, 'section titles');
    model.kicker = titles[0][1].trim(); model.whyTitle = titles[1][1].trim(); model.reviewsTitle = titles[2][1].trim();
    model.servicesTitle = C.text(take(/\[fusion_text\]\s*<center><h2><strong>([^<]*)<\/strong><\/h2><\/center>\s*\[\/fusion_text\]/, 'services heading')[1]);
    model.services = takeAll(/\[button ([^\]]*)\]([\s\S]*?)\[\/button\]\s*\[fusion_text\]([\s\S]*?)\[\/fusion_text\]/, 4, 'service buttons').map(function (m, i) {
      return { link: attr(m[1], 'link'), label: C.text(m[2]), text: unwrap(m[3]).replace(/^<em>|<\/em>$/g, ''), icon: SVC_ICON[i] };
    });
    model.reasons = takeAll(/\[content_box ([^\]]*)\]([\s\S]*?)\[\/content_box\]/, 4, 'why-choose boxes').map(function (m) {
      return { title: attr(m[1], 'title'), text: m[2].trim(), icon: ICON[attr(m[1], 'icon')] || 'star' };
    });
    model.rating = unwrap(take(/\[fusion_text\]\s*(<center><strong>Rated[\s\S]*?)\[\/fusion_text\]/, 'rating line')[1]).replace(/^<strong>|<\/strong>$/g, '');
    model.quotes = takeAll(/\[testimonial ([^\]]*)\]([\s\S]*?)\[\/testimonial\]/, 6, 'reviews').map(function (m) {
      return { name: attr(m[1], 'name'), text: m[2].trim() };
    });
    model.more = unwrap(take(/\[fusion_text\]\s*(<center><a [^>]*reviews[\s\S]*?)\[\/fusion_text\]/, 'reviews link')[1]);
    model.lead = take(/\[fusion_text\]\s*(<strong>Certified[\s\S]*?)\[\/fusion_text\]/, 'certified paragraph')[1].trim();
    model.seo = take(/\[fusion_text\]\s*(So you have a new[\s\S]*?)\[\/fusion_text\]/, 'SEO paragraphs')[1].trim().split(/\n\s*\n/).map(function (p) { return p.trim(); });
    var t2 = take(/\[tagline_box([^\]]*title="Need Computer Repair[^\]]*)\]\[\/tagline_box\]/, 'call-to-action box');
    model.cta = { link: attr(t2[1], 'link'), title: attr(t2[1], 'title').trim(), text: attr(t2[1], 'description').trim(), button: attr(t2[1], 'button') };
    model.badges = take(/\[imageframe [^\]]*\]\s*(<img [^>]*>)\s*\[\/imageframe\]/, 'badge image')[1];
    // Only empty layout containers may remain.
    var left = used.replace(/\[\/?(one_fourth|five_sixth|testimonials|content_boxes)[^\]]*\]/g, ' ');
    if (C.text(left.replace(/\[[^\]]*\]/g, ' '))) throw new Error('Unmapped content: ' + C.text(left).slice(0, 80));
    if (/\[[a-z_]+/.test(left)) throw new Error('Unmapped shortcode: ' + left.match(/\[[a-z_]+/)[0]);
    return model;
  }

  function buildHome(s) {
    var m = parse(s), out = [];
    out.push('<div class="btg-home-announce"><a class="btg-home-announce-link" href="' + m.announce.link + '"><strong>' + m.announce.title + '</strong> <span>' + m.announce.text + '</span> <em>' + m.announce.button + '</em></a></div>');
    out.push('<section class="btg-home-services"><p class="btg-home-kicker">' + m.kicker + '</p><h2 class="btg-home-title">' + m.servicesTitle + '</h2><div class="btg-home-grid">' +
      m.services.map(function (x) { return '<a class="btg-home-svc btg-card--' + x.icon + '" href="' + x.link + '"><strong>' + x.label + '</strong> <span>' + x.text + '</span></a>'; }).join('') + '</div></section>');
    out.push('<section class="btg-home-why"><h2 class="btg-home-title">' + m.whyTitle + '</h2><div class="btg-home-grid">' +
      m.reasons.map(function (x) { return '<div class="btg-home-reason btg-reason--' + x.icon + '"><h3>' + x.title + '</h3><p>' + x.text + '</p></div>'; }).join('') + '</div></section>');
    out.push('<section class="btg-home-reviews"><h2 class="btg-home-title">' + m.reviewsTitle + '</h2><p class="btg-home-rating">' + m.rating + '</p><div class="btg-home-quotes">' +
      m.quotes.map(function (x) { return '<figure class="btg-home-quote"><blockquote>' + x.text + '</blockquote><figcaption>' + x.name + '</figcaption></figure>'; }).join('') + '</div><p class="btg-home-more">' + m.more + '</p></section>');
    out.push('<section class="btg-home-about"><p class="btg-home-lead">' + m.lead + '</p><div class="btg-home-seo">' + m.seo.map(function (p) { return '<p>' + p + '</p>'; }).join('') + '</div></section>');
    out.push('<div class="btg-home-cta"><p class="btg-home-cta-text"><strong>' + m.cta.title + '</strong> <span>' + m.cta.text + '</span></p><a class="btg-home-cta-btn" href="' + m.cta.link + '">' + m.cta.button + '</a></div>');
    out.push('<p class="btg-home-badges">' + m.badges + '</p>');
    return m.hero + out.join('\n') + '\n\n' + m.tail;
  }

  // Visible text of the original in reading order: attribute texts are placed
  // where the theme renders them (tagline title/description/button, box title
  // before its text, review name after its quote).
  function beforeText(s) {
    var b = s.slice(s.indexOf('[tagline_box'), tailStart(s))
      .replace(/\[tagline_box([^\]]*)\]\[\/tagline_box\]/g, function (x, a) { return ' ' + attr(a, 'title') + ' ' + attr(a, 'description') + ' ' + attr(a, 'button') + ' '; })
      .replace(/\[content_box ([^\]]*)\]([\s\S]*?)\[\/content_box\]/g, function (x, a, t) { return ' ' + attr(a, 'title') + ' ' + t + ' '; })
      .replace(/\[testimonial ([^\]]*)\]([\s\S]*?)\[\/testimonial\]/g, function (x, a, t) { return ' ' + t + ' ' + attr(a, 'name') + ' '; })
      .replace(/\[[^\]]*\]/g, ' ');
    return C.text(b);
  }
  function hrefs(h) { return (h.match(/href="[^"]*"/g) || []).sort().join(' '); }
  function srcs(h) { return (h.match(/\ssrc="[^"]*"/g) || []).sort().join(' '); }

  // Safety gate: [] means safe to save.
  function verifyHomeRebuild(before, after) {
    var problems = [];
    var start = before.indexOf('[tagline_box');
    if (start < 0) return ['Original page has no builder content to compare against'];
    var hero = before.slice(0, start), tail = before.slice(tailStart(before));
    if (!after.startsWith(hero)) problems.push('Hero changed');
    if (!after.endsWith(tail)) problems.push('Loader tail changed');
    var body = after.slice(hero.length, after.length - tail.length);
    if (C.text(body) !== beforeText(before)) problems.push('Visible text differs from the original (words or order)');
    var beforeBody = before.slice(start, tailStart(before));
    // Links in document order (so two cards cannot trade links): shortcode link
    // attributes count where their tag sits.
    var beforeLinks = [], lm, lre = /href="([^"]*)"|\[(?:button|tagline_box) [^\]]*\]/g;
    while ((lm = lre.exec(beforeBody))) beforeLinks.push(lm[1] !== undefined ? lm[1] : attr(lm[0], 'link'));
    if (G.links(body).join('\n') !== beforeLinks.join('\n')) problems.push('Links differ from the original (or are in a different order)');
    if (srcs(body) !== srcs(beforeBody)) problems.push('Images differ from the original');
    G.markupProblems(body).forEach(function (p) { problems.push(p); });
    if (/\[\/?[a-z_]+[\s\]]/.test(body)) problems.push('Builder shortcode left in the rebuilt body');
    if ((after.slice(0, tailStart(after)).match(/<h1\b/g) || []).length !== 1) problems.push('Expected exactly one h1 (the hero)');
    return problems;
  }

  return { parse: parse, buildHome: buildHome, verifyHomeRebuild: verifyHomeRebuild };
});
