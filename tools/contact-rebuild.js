// tools/contact-rebuild.js
// Contact page (11802): the Virginia and New Jersey blocks become two location
// cards, each ending with its phone number; the "Call or use the form below"
// line moves directly above the form. Text is moved, never changed.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards-transform.js'));
  else root.BTGContact = factory(root.BTGCards);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  function one(s, re, what) {
    var all = s.match(new RegExp(re.source, 'g')) || [];
    if (all.length !== 1) throw new Error('Expected exactly one ' + what + ', found ' + all.length);
    return re.exec(s);
  }

  function rebuild(s) {
    if (s.indexOf('class="btg-locations"') !== -1) throw new Error('Already rebuilt');
    var heroEnd = s.indexOf('</section>') + 10, form = s.indexOf('[contact-form-7');
    if (heroEnd < 10 || form < 0) throw new Error('Hero or form not found');
    var body = s.slice(heroEnd, form), used = body;
    function take(re, what) { var m = one(used, re, what); used = used.replace(m[0], ' '); return m; }
    var vaPhone = take(/<h2 class="entry-title"><strong>(<a href="tel:844-TEKGUY-0">[^<]*<\/a>)<\/strong><\/h2>/, 'Virginia phone');
    var njPhone = take(/<h2 class="entry-title"><strong>(<a href="tel:\(862\)210-5656">[^<]*<\/a>)<\/strong><\/h2>/, 'New Jersey phone');
    var vaTitle = take(/<h3>(Virginia[^<]*)<\/h3>/, 'Virginia heading');
    var vaText = take(/<p>(On-site computer repair[\s\S]*?)<\/p>/, 'Virginia text');
    var lead = take(/<p>(Call or use the form below[^<]*)<\/p>/, 'form lead line');
    var njTitle = take(/<h3>(New Jersey[^<]*)<\/h3>/, 'New Jersey heading');
    var njText = take(/<p>(Continuing to serve[^<]*)<\/p>/, 'New Jersey text');
    if (C.text(used)) throw new Error('Unmapped content: ' + C.text(used).slice(0, 80));
    var card = function (t, p, ph) { return '<div class="btg-location"><h3>' + t[1] + '</h3><p>' + p[1] + '</p><p class="btg-location-phone">' + ph[1] + '</p></div>'; };
    return s.slice(0, heroEnd) + '\n<div class="btg-locations">' + card(vaTitle, vaText, vaPhone) + card(njTitle, njText, njPhone) + '</div>\n' +
      '<p class="btg-contact-lead">' + lead[1] + '</p>\n' + s.slice(form);
  }

  function words(h) { return C.text(h).split(' ').filter(Boolean).sort().join(' '); }
  function hrefs(h) { return (h.match(/href="[^"]*"/g) || []).sort().join(' '); }

  // Safety gate: same words (order may move), same links, form and tail intact.
  function verify(before, after) {
    var problems = [];
    var heroEnd = before.indexOf('</section>') + 10;
    if (after.slice(0, heroEnd) !== before.slice(0, heroEnd)) problems.push('Hero changed');
    var bForm = before.indexOf('[contact-form-7'), aForm = after.indexOf('[contact-form-7');
    if (aForm < 0 || after.slice(aForm) !== before.slice(bForm)) problems.push('Form or tail changed');
    var bBody = before.slice(heroEnd, bForm), aBody = after.slice(heroEnd, aForm < 0 ? after.length : aForm);
    if (words(aBody) !== words(bBody)) problems.push('Words differ from the original');
    if (hrefs(aBody) !== hrefs(bBody)) problems.push('Links differ from the original');
    if (/<[^>]*\s(hidden|aria-hidden|style)(=|>|\s)/.test(aBody)) problems.push('Hidden or styled element');
    return problems;
  }

  return { rebuild: rebuild, verify: verify };
});
