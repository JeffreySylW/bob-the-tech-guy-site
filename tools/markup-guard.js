// tools/markup-guard.js
// Shared safety checks for rebuilt page bodies: only a fixed set of tags and
// attributes may appear (so nothing can be hidden with hidden/aria-hidden/
// <template>/<details>/screen-reader classes/inline styles), class names must
// be ours, and links are compared in document order.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BTGGuard = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TAGS = ['a', 'b', 'blockquote', 'br', 'div', 'em', 'figcaption', 'figure', 'h2', 'h3', 'i', 'img', 'li', 'p', 'section', 'span', 'strong', 'ul'];
  var ATTRS = ['class', 'href', 'src', 'alt', 'width', 'height', 'rel'];
  var CLASS = /^(btg-[a-z0-9-]+|alignnone|user-name|user-passport-info|user-display-name|profile-user-review-content|t-heavy)$/;

  function markupProblems(html) {
    var problems = [], m, tag = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
    if (/<!--/.test(html)) problems.push('HTML comment in the rebuilt body');
    while ((m = tag.exec(html))) {
      var name = m[2].toLowerCase();
      if (TAGS.indexOf(name) === -1) { problems.push('Tag not allowed: <' + name + '>'); continue; }
      if (m[1]) continue;
      var a, attr = /([^\s=\/]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g, rest = m[3].replace(/\/\s*$/, '');
      while ((a = attr.exec(rest))) {
        var an = a[1].toLowerCase();
        if (ATTRS.indexOf(an) === -1) { problems.push('Attribute not allowed: ' + an + ' on <' + name + '>'); continue; }
        if (an === 'class') {
          (a[2] || '').replace(/^["']|["']$/g, '').split(/\s+/).filter(Boolean).forEach(function (c) {
            if (!CLASS.test(c)) problems.push('Class not allowed: ' + c);
          });
        }
      }
    }
    return problems;
  }

  function links(html) { var out = [], m, re = /href="([^"]*)"/g; while ((m = re.exec(html))) out.push(m[1]); return out; }

  return { markupProblems: markupProblems, links: links };
});
