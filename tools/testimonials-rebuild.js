// tools/testimonials-rebuild.js
// Testimonials page (3754): adds the standard hero and turns the five pasted
// testimonials (name/place label + quote) into the homepage's quote cards.
// Hero lines reuse the Reviews page's approved copy; the only other added text
// is the homepage's existing "Read all of our customer reviews »" link.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards-transform.js'), require('./markup-guard.js'));
  else root.BTGTestimonials = factory(root.BTGCards, root.BTGGuard);
})(typeof self !== 'undefined' ? self : this, function (C, G) {
  'use strict';
  var HERO = '<section class="btg-hero">\n' +
    '  <p class="btg-hero-eyebrow">Testimonials</p>\n' +
    '  <h1 class="btg-hero-title">Real reviews from <strong>real customers</strong>.</h1>\n' +
    '  <p class="btg-hero-lede">25 years in business, built on word of mouth and repeat customers.</p>\n' +
    '  <a class="btg-hero-cta" href="tel:8448354890">844-TEKGUY-0</a>\n' +
    '</section>';
  var MORE = '<p class="btg-home-more"><a href="https://bobthetechguy.com/reviews/">Read all of our customer reviews »</a></p>';
  var ITEM = /<li class="user-name">([\s\S]*?)<\/li>[\s\S]*?<em>([\s\S]*?)<\/em>/g;

  function tailStart(s) { var i = s.search(/<style>\/\* btg-styles \*\/|<!-- btg-loader/); return i < 0 ? s.length : i; }

  function parse(s) {
    if (s.indexOf('class="btg-hero"') !== -1) throw new Error('Already rebuilt');
    var head = s.slice(0, tailStart(s)), items = [], m;
    ITEM.lastIndex = 0;
    while ((m = ITEM.exec(head))) items.push({ who: C.text(m[1]), quote: m[2].trim() });
    var left = C.text(head.replace(ITEM, ' ').replace(/&nbsp;/g, ' '));
    if (left) throw new Error('Unmapped content: ' + left.slice(0, 80));
    if (items.length !== 5) throw new Error('Expected 5 testimonials, found ' + items.length);
    return { items: items, tail: s.slice(tailStart(s)) };
  }

  function rebuild(s) {
    var p = parse(s);
    return HERO + '\n\n<div class="btg-home-quotes">' + p.items.map(function (x) {
      return '<figure class="btg-home-quote"><figcaption>' + x.who + '</figcaption><blockquote>' + x.quote + '</blockquote></figure>';
    }).join('') + '</div>\n' + MORE + '\n\n' + p.tail;
  }

  // Safety gate: [] means safe to save.
  function verify(before, after) {
    var problems = [];
    var tail = before.slice(tailStart(before));
    if (!after.endsWith(tail)) problems.push('Tail changed');
    if (after.indexOf(HERO) !== 0) problems.push('Hero missing or changed');
    var full = after.slice(HERO.length, after.length - tail.length);
    if (full.split(MORE).length !== 2) problems.push('Reviews link missing or duplicated');
    var body = full.replace(MORE, ' ');
    var beforeHead = before.slice(0, tailStart(before));
    if (C.text(body) !== C.text(beforeHead.replace(/&nbsp;/g, ' '))) problems.push('Testimonial text differs from the original (words or order)');
    if (G.links(body).join('\n') !== G.links(beforeHead).join('\n')) problems.push('Links differ from the original');
    var srcs = function (h) { return (h.match(/\ssrc="[^"]*"/g) || []).join('\n'); };
    if (srcs(body) !== srcs(beforeHead)) problems.push('Images differ from the original');
    G.markupProblems(full).forEach(function (p) { problems.push(p); });
    if ((body.match(/<figure class="btg-home-quote">/g) || []).length !== 5) problems.push('Expected 5 quote cards');
    return problems;
  }

  return { parse: parse, rebuild: rebuild, verify: verify };
});
