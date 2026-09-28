// tools/nj-posts.js
// The New Jersey area posts each carry four linked banner images with the old logo baked in.
// transform() removes them (image and its link), tidies the blank lines and adds the bundle loader;
// verify() proves nothing else changed. Bob's words and other links are untouched.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./loader.js'));
  else root.BTGNjPosts = factory(root.BTGLoader);
})(typeof self !== 'undefined' ? self : this, function (BTGLoader) {
  'use strict';
  var UPLOADS = 'https://bobthetechguy.com/wp-content/uploads/';
  var BANNER = /<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>/g;

  function loader(version) { return BTGLoader.loaderBlock(version); }
  function text(h) { return h.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
  function tagCounts(h) {
    var c = {}, m, re = /<(\/?[a-zA-Z][a-zA-Z0-9]*)/g;
    while ((m = re.exec(h))) { var k = m[1].toLowerCase(); c[k] = (c[k] || 0) + 1; }
    return c;
  }
  function hrefs(h) { var o = [], m, re = /href="([^"]*)"/g; while ((m = re.exec(h))) o.push(m[1]); return o; }

  function transform(raw, version) {
    if (/btg-loader/.test(raw)) throw new Error('Already has the loader');
    var body = raw.replace(BANNER, function (m) {
      var src = (/<img\b[^>]*\ssrc="([^"]*)"/.exec(m) || [])[1] || '';
      if (src.indexOf(UPLOADS) !== 0 || text(m)) throw new Error('Unexpected image: ' + src.slice(0, 80));
      return '';
    });
    if (/<img\b/i.test(body)) throw new Error('Unexpected image outside a plain link');
    // Blank or &nbsp;-only lines left around the removed banners collapse into one paragraph break.
    return body.replace(/(\r?\n[ \t]*(?:&nbsp;)?[ \t]*){3,}/g, '\r\n\r\n').replace(/\s+$/, '') + loader(version);
  }

  // Safety gate: [] means safe to save.
  function verify(before, after, version) {
    var problems = [], tail = loader(version);
    if (!after.endsWith(tail)) problems.push('Loader missing or changed');
    var body = after.endsWith(tail) ? after.slice(0, after.length - tail.length) : after;
    if (text(body) !== text(before)) problems.push('Visible text differs from the original');
    var n = (before.match(BANNER) || []).length, b = tagCounts(before), a = tagCounts(body), names = {};
    Object.keys(b).concat(Object.keys(a)).forEach(function (k) { names[k] = 1; });
    Object.keys(names).forEach(function (k) {
      var want = (k === 'a' || k === '/a' || k === 'img') ? n : 0;
      if ((b[k] || 0) - (a[k] || 0) !== want) problems.push('Tag count changed beyond the banners: <' + k + '>');
    });
    var bh = hrefs(before), ah = hrefs(body);
    var removed = bh.slice(), i;
    ah.forEach(function (h) { i = removed.indexOf(h); if (i >= 0) removed.splice(i, 1); else problems.push('Link added: ' + h); });
    if (removed.length !== n || !removed.every(function (h) { return h.indexOf(UPLOADS) === 0; })) problems.push('A link other than a banner link was removed');
    if (/<img\b/i.test(body)) problems.push('An image is still in the page');
    return problems;
  }

  return { transform: transform, verify: verify, loader: loader };
});
