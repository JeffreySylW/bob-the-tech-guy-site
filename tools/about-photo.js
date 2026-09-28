// tools/about-photo.js
// About page (2): Bob's portrait beside the first story paragraph. The paragraph is moved into a two-column
// block, never rewritten; verify() proves the words, links and everything after it are unchanged.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./markup-guard.js'));
  else root.BTGAboutPhoto = factory(root.BTGGuard);
})(typeof self !== 'undefined' ? self : this, function (G) {
  'use strict';
  var PORTRAIT = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.5.9/dist/brand/bob-portrait.jpg';
  var ALT = 'Bob Dyer, Bob the Tech Guy';
  var FIGURE = '<figure class="btg-bob-photo"><img src="' + PORTRAIT + '" alt="' + ALT + '" width="402" height="402"></figure>';
  function text(h) { return h.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
  function tailStart(s) { var i = s.indexOf('<!-- btg-loader'); return i < 0 ? s.length : i; }

  function transform(raw) {
    if (raw.indexOf('btg-bob-intro') !== -1) throw new Error('Already has the portrait');
    var i = raw.indexOf('</section>');
    if (i < 0) throw new Error('Hero not found');
    i += 10;
    var rest = raw.slice(i), m = /^(\s*)([\s\S]*?)(\r?\n\r?\n)/.exec(rest);
    if (!m || m[2].indexOf('Bob Dyer') !== 0) throw new Error('Unexpected first block: ' + (m ? m[2].slice(0, 40) : ''));
    return raw.slice(0, i) + m[1] + '<div class="btg-bob-intro">' + FIGURE + '<div class="btg-bob-story">\n\n' + m[2] + '\n\n</div></div>' + m[3] + rest.slice(m[0].length);
  }

  // Safety gate: [] means safe to save.
  function verify(before, after) {
    var problems = [], t = tailStart(before);
    if (!after.endsWith(before.slice(t))) problems.push('Loader tail changed');
    var b = before.slice(0, t), a = after.slice(0, after.length - (before.length - t));
    if (text(a) !== text(b)) problems.push('Visible text differs from the original');
    if (G.links(a).join('\n') !== G.links(b).join('\n')) problems.push('Links differ from the original');
    var imgs = function (h) { return (h.match(/<img\b/gi) || []).length; };
    if (imgs(a) !== imgs(b) + 1 || a.indexOf(PORTRAIT) === -1) problems.push('Expected exactly one added image (the portrait)');
    G.markupProblems(a).forEach(function (p) { problems.push(p); });
    return problems;
  }

  return { PORTRAIT: PORTRAIT, transform: transform, verify: verify };
});
