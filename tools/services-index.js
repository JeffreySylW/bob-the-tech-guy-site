// tools/services-index.js
// Rebuilds the Services index (/services-2/, page 11653): the 10 <h1> links
// become three grouped panels listing every page in the menu's Services
// submenu. Spec: docs/superpowers/specs/2026-09-27-services-split-and-index-design.md
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards-transform.js'));
  else root.BTGServicesIndex = factory(root.BTGCards);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  // Group names are approved new words; each item is [slug, icon].
  var GROUPS = [
    { name: 'Repairs &amp; Upgrades', items: [['hardware-repair-upgrades', 'tool'], ['screen-replacement', 'screen'], ['memory-install', 'chip'], ['hardware-install', 'plug'], ['computer-tune-up', 'gauge'], ['data-recovery-service', 'drive']] },
    { name: 'Setup &amp; Software', items: [['computer-set-up', 'laptop'], ['operating-system-install', 'window'], ['software-installation-and-configuration', 'box'], ['printer-solutions', 'printer'], ['email-setup', 'mail']] },
    { name: 'Security &amp; Networking', items: [['networking', 'wifi'], ['anti-virus', 'shield'], ['backup-solutions', 'cloud'], ['parental-controls', 'lock']] }
  ];
  var LINKS = /(?:<h1 class="entry-title"[^>]*><strong><a href="[^"]*">[^<]*<\/a><\/strong><\/h1>\s*)+/g;

  // Submenu items of "Services" in the public page's first menu, in menu order.
  function parseServicesMenu(publicHtml) {
    var re = /<a\s+href="(https:\/\/bobthetechguy\.com\/([a-z0-9-]+)\/)"[^>]*><span class="([^"]*)">([^<]*)<\/span><\/a>/g, m, out = [];
    // Start at the top-level menu item (menu-text span), not any other link to the page.
    while ((m = re.exec(publicHtml)) && !(m[2] === 'services-2' && m[3] === 'menu-text')) { /* skip */ }
    if (!m) throw new Error('Services menu item not found');
    while ((m = re.exec(publicHtml)) && m[3] === '') {
      out.push({ slug: m[2], url: m[1], title: m[4].replace(/&#038;/g, '&amp;') });
    }
    return out;
  }

  function check(menu) {
    var want = [].concat.apply([], GROUPS.map(function (g) { return g.items.map(function (i) { return i[0]; }); }));
    var have = menu.map(function (m) { return m.slug; });
    var missing = want.filter(function (s) { return have.indexOf(s) === -1; });
    var extra = have.filter(function (s) { return want.indexOf(s) === -1; });
    if (missing.length || extra.length || have.length !== want.length) {
      throw new Error('Services menu does not match the groups. Missing: ' + missing.join(', ') + '. Extra: ' + extra.join(', '));
    }
  }

  function panelsHtml(menu) {
    return '<div class="btg-panels">' + GROUPS.map(function (g) {
      return '<section class="btg-panel"><h2 class="btg-panel-title">' + g.name + '</h2><ul class="btg-panel-list">' +
        g.items.map(function (i) {
          var m = menu.filter(function (x) { return x.slug === i[0]; })[0];
          return '<li><a class="btg-panel-link btg-card--' + i[1] + '" href="' + m.url + '">' + m.title + '</a></li>';
        }).join('') + '</ul></section>';
    }).join('') + '</div>';
  }

  function buildIndex(raw, menu) {
    if (raw.indexOf('class="btg-panels"') !== -1) throw new Error('Already transformed');
    check(menu);
    var runs = raw.match(LINKS) || [];
    if (runs.length !== 1) throw new Error('No service link list found (' + runs.length + ' runs)');
    return raw.replace(LINKS, panelsHtml(menu) + '\n');
  }

  // Safety gate before saving: [] means safe.
  function verifyIndex(before, after, menu) {
    var problems = [];
    var runs = before.match(LINKS) || [];
    var start = after.indexOf('<div class="btg-panels">');
    var end = after.indexOf('</div>', after.lastIndexOf('</section>', after.indexOf('<!-- btg-loader') < 0 ? after.length : after.indexOf('<!-- btg-loader'))) + 6;
    if (runs.length !== 1 || start < 0) return ['Panels or original link list not found'];
    var panels = after.slice(start, end);
    if (after.slice(0, start) + after.slice(end).replace(/^\n/, '') !== before.replace(runs[0], '')) problems.push('Content outside the panels changed');
    var links = (panels.match(/<a class="btg-panel-link btg-card--[a-z]+" href="[^"]*">[^<]*<\/a>/g) || []).map(function (a) {
      return a.replace(/<a class="btg-panel-link btg-card--([a-z]+)" href="([^"]*)">([^<]*)<\/a>/, '$1|$2|$3');
    });
    var want = [].concat.apply([], GROUPS.map(function (g) {
      return g.items.map(function (i) { var m = menu.filter(function (x) { return x.slug === i[0]; })[0]; return m ? i[1] + '|' + m.url + '|' + m.title : 'missing ' + i[0]; });
    }));
    if (links.join('\n') !== want.join('\n')) problems.push('Panel links differ from the groups/menu');
    var words = C.text(panels.replace(/<a [^>]*>[^<]*<\/a>/g, ''));
    if (words !== C.text(GROUPS.map(function (g) { return g.name; }).join(' '))) problems.push('Unexpected text in the panels: ' + words.slice(0, 60));
    if (/\s(hidden|style|aria-hidden)(=|>|\s)|screen-reader-text/.test(panels)) problems.push('Hidden or styled element inside the panels');
    var head = after.slice(0, after.indexOf('<!-- btg-loader') < 0 ? after.length : after.indexOf('<!-- btg-loader'));
    if ((head.match(/<h1\b/g) || []).length !== 1) problems.push('Expected exactly one h1 (the hero)');
    return problems;
  }

  return { GROUPS: GROUPS, parseServicesMenu: parseServicesMenu, buildIndex: buildIndex, verifyIndex: verifyIndex };
});
