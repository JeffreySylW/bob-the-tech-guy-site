// tools/home-reorder.js
// Homepage (page 2318): move the "Certified Computer Repair" paragraph and the
// SEO paragraphs above the "Need A Quote?" box, and label the Services button
// "All Services". Moves text; adds only "All ".
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BTGHomeReorder = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var BTN = '<span style="color:#ffffff">Services</span>[/button]';
  var BTN_NEW = '<span style="color:#ffffff">All Services</span>[/button]';
  var QUOTE = 'title="Need Computer Repair Services? Need A Quote? "';

  function once(s, needle, what) {
    var at = s.indexOf(needle);
    if (at < 0 || s.indexOf(needle, at + 1) !== -1) throw new Error(what + (at < 0 ? ' not found' : ' found more than once'));
    return at;
  }
  function textBlock(s, needle, what) {
    var at = once(s, needle, what);
    var start = s.lastIndexOf('[fusion_text]', at), end = s.indexOf('[/fusion_text]', at) + 14;
    if (start < 0 || end < 14) throw new Error(what + ' is not inside a text block');
    return [start, end];
  }

  function reorderHome(s) {
    if (s.indexOf(BTN_NEW) !== -1) throw new Error('Already reordered');
    var cert = textBlock(s, '<strong>Certified Computer Repair Services.', 'Certified paragraph');
    var seo = textBlock(s, '[fusion_text]So you have a new computer', 'SEO block');
    var quote = s.lastIndexOf('[tagline_box', once(s, QUOTE, 'Quote box'));
    if (!(cert[1] <= quote && quote < seo[0])) throw new Error('Unexpected order: Certified < Quote box < SEO block expected');
    once(s, BTN, 'Services button');
    var out = s.slice(0, cert[0]) + s.slice(cert[1], quote) + s.slice(cert[0], cert[1]) + s.slice(seo[0], seo[1]) + s.slice(quote, seo[0]) + s.slice(seo[1]);
    return out.replace(BTN, BTN_NEW);
  }

  // Safety gate: [] means safe.
  function verifyHome(before, after) {
    var problems = [];
    if (after.split(BTN_NEW).length !== 2) problems.push('"All Services" label missing or duplicated');
    var restored = after.replace(BTN_NEW, BTN);
    if (restored.length !== before.length) problems.push('Length changed by ' + (after.length - before.length) + ' (expected +4)');
    if (restored.split('').sort().join('') !== before.split('').sort().join('')) problems.push('Characters changed, not just reordered');
    var cert = after.indexOf('<strong>Certified Computer Repair Services.'), seo = after.indexOf('[fusion_text]So you have a new computer'), quote = after.indexOf(QUOTE);
    if (!(cert < seo && seo < quote)) problems.push('Blocks are not in the order Certified, SEO, Quote box');
    var tailAt = before.indexOf('<!-- btg-loader');
    if (tailAt >= 0 && !after.endsWith(before.slice(tailAt))) problems.push('Loader tail changed');
    return problems;
  }

  return { reorderHome: reorderHome, verifyHome: verifyHome };
});
