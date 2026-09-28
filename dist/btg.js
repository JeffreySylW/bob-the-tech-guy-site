/* 01-accordion.js */
window.BTGAccordion = (function () {
  function toggle(button) {
    var item = button.closest('.btg-faq-item');
    var answer = item.querySelector('.btg-faq-answer');
    var isOpen = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', String(!isOpen));
    if (isOpen) {
      answer.setAttribute('hidden', '');
    } else {
      answer.removeAttribute('hidden');
    }
  }

  function init(root) {
    root = root || document;
    root.querySelectorAll('.btg-faq-question').forEach(function (button) {
      button.addEventListener('click', function () {
        toggle(button);
      });
    });
  }

  return { init: init };
})();

/* 02-sticky-cta.js */
window.BTGStickyCTA = (function () {
  function init(phoneNumber, phoneHref) {
    var bar = document.createElement('div');
    bar.className = 'btg-sticky-cta';
    bar.setAttribute('hidden', '');

    var link = document.createElement('a');
    link.className = 'btg-sticky-cta-link';
    link.href = phoneHref;
    link.textContent = 'Call ' + phoneNumber;

    bar.appendChild(link);
    document.body.appendChild(bar);

    var THRESHOLD = 400;
    function onScroll() {
      if (window.scrollY > THRESHOLD) {
        bar.removeAttribute('hidden');
      } else {
        bar.setAttribute('hidden', '');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  return { init: init };
})();

/* 03-scroll-reveal.js */
window.BTGScrollReveal = (function () {
  function init(root) {
    root = root || document;
    var elements = root.querySelectorAll('[data-btg-reveal]');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || typeof IntersectionObserver === 'undefined') {
      elements.forEach(function (el) {
        el.classList.add('btg-revealed');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('btg-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  return { init: init };
})();

/* 04-schema-meta.js */
window.BTGSchema = (function () {
  function buildLocalBusiness(opts) {
    // Deliberately built field-by-field from an allowlist, never by spreading
    // `opts` — that's what guarantees an address can't sneak in through a
    // future caller mistake.
    return {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: opts.name,
      telephone: opts.telephone,
      areaServed: opts.areaServed,
      priceRange: opts.priceRange,
      sameAs: opts.sameAs,
    };
  }

  function inject(opts) {
    var schema = buildLocalBusiness(opts);
    var script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  return { buildLocalBusiness: buildLocalBusiness, inject: inject };
})();

window.BTGMeta = (function () {
  function setDescription(text) {
    var tag = document.head.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', 'description');
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', text);
  }

  return { setDescription: setDescription };
})();

/* 05-init.js */
window.BTGInit = (function () {
  // Removes the Avada theme's own auto-rendered page-title bar
  // (.fusion-page-title-bar, which wraps an <h1 class="entry-title">) when
  // this page has a .btg-hero — the hero is the page's one canonical <h1>,
  // and this element isn't reachable at Editor level through WordPress's
  // REST API (its per-page "hide title bar" setting is unregistered custom
  // postmeta), so it's cleaned up here at runtime instead. Scoped strictly
  // to hero pages: a page with no .btg-hero is never touched.
  function removeDuplicateTitleBar(doc) {
    var hero = doc.querySelector('.btg-hero');
    if (!hero) return false;
    var bar = doc.querySelector('.fusion-page-title-bar');
    if (bar && bar.parentNode) {
      bar.parentNode.removeChild(bar);
      return true;
    }
    return false;
  }

  // Removes the homepage's old Revolution Slider banner ("KEEP YOUR SYSTEM
  // CLEAN AND RUNNING FAST!" etc.) so the new hero is the first thing
  // visitors see instead of a second, lower-quality banner stacked above
  // it. The slider is rendered by the theme via an Avada "Fusion Page
  // Options > Sliders" page setting — the same unregistered-postmeta
  // situation as the duplicate title bar — into a #sliders-container div
  // that exists on every page but is only ever populated (has children) on
  // the homepage; every other in-scope page already renders it empty, so
  // checking for children rather than hardcoding a page ID keeps this
  // correct even if that changes. Scoped strictly to hero pages, same as
  // removeDuplicateTitleBar.
  function removeHomeSlider(doc) {
    var hero = doc.querySelector('.btg-hero');
    if (!hero) return false;
    var slider = doc.getElementById('sliders-container');
    if (slider && slider.children && slider.children.length > 0 && slider.parentNode) {
      slider.parentNode.removeChild(slider);
      return true;
    }
    return false;
  }


  function injectSchemaAndMeta(doc, win) {
    if (win.BTGSchema) {
      win.BTGSchema.inject({
        name: 'Bob The Tech Guy',
        telephone: '+18448354890',
        areaServed: [
          'Chesterfield VA', 'Midlothian VA', 'Chester VA', 'Bon Air VA',
          'Brandermill VA', 'Woodlake VA', 'Moseley VA', 'Colonial Heights VA',
          'Richmond VA', 'Pompton Lakes NJ',
        ],
        priceRange: '$$',
        sameAs: [],
      });
    }
    if (win.BTGMeta) {
      var lede = doc.querySelector('.btg-hero-lede');
      var desc = (lede && lede.textContent && lede.textContent.trim())
        || (doc.title ? doc.title + ' — Bob The Tech Guy computer repair.' : 'Computer repair and networking services from Bob The Tech Guy.');
      win.BTGMeta.setDescription(desc);
    }
  }

  // Old Avada buttons link to "tel:844-TEKGUY-0"; many phones won't dial
  // letters. Converts vanity letters to keypad digits sitewide.
  function fixTelLinks(doc) {
    var keypad = 'ABC2DEF3GHI4JKL5MNO6PQRS7TUV8WXYZ9';
    var links = doc.querySelectorAll('a[href^="tel:"]');
    Array.prototype.forEach.call(links, function (a) {
      var num = a.getAttribute('href').slice(4);
      if (!/[a-z]/i.test(num)) return;
      var digits = num.toUpperCase().replace(/[A-Z]/g, function (c) {
        return keypad.slice(keypad.indexOf(c)).match(/\d/)[0];
      }).replace(/\D/g, '');
      a.setAttribute('href', 'tel:+1' + digits.slice(-10));
    });
  }

  // "844-TEKGUY-0" alone can't be typed on many phones; show the digits
  // (from the CTA's tel: href) on a second line of the button.
  function addCtaDigits(doc) {
    var cta = doc.querySelector('.btg-hero-cta');
    if (!cta || !/[a-z]/i.test(cta.textContent)) return;
    var d = cta.getAttribute('href').replace(/\D/g, '').slice(-10);
    var span = doc.createElement('span');
    span.className = 'btg-hero-cta-digits';
    span.textContent = '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
    cta.appendChild(span);
  }

  // Trust line under the hero CTA. Claims already made elsewhere on the
  // site only ("Rated 5 stars across every review", Veteran Owned badges).
  function addHeroTrust(doc) {
    var hero = doc.querySelector('.btg-hero');
    if (!hero || hero.querySelector('.btg-hero-trust')) return;
    var cta = hero.querySelector('.btg-hero-cta');
    if (!cta) return;
    var p = doc.createElement('p');
    p.className = 'btg-hero-trust';
    // Stars hidden from screen readers (aria-label on a <p> is ignored).
    p.innerHTML = '<span aria-hidden="true">★★★★★</span> 5-star rated · Veteran-owned &amp; operated';
    cta.parentNode.insertBefore(p, cta.nextSibling);
  }

  return {
    addHeroTrust: addHeroTrust,
    addCtaDigits: addCtaDigits,
    fixTelLinks: fixTelLinks,
    removeDuplicateTitleBar: removeDuplicateTitleBar,
    removeHomeSlider: removeHomeSlider,
    injectSchemaAndMeta: injectSchemaAndMeta,
  };
})();

/* 06-search.js */
window.BTGSearch = (function () {
  /* search-data:start */
  var PAGES = [
    {"title":"Networking","url":"https://bobthetechguy.com/networking/","type":"SERVICE","icon":"wifi","keywords":["wifi","router","internet","wireless","network","modem"]},
    {"title":"Computer Set Up","url":"https://bobthetechguy.com/computer-set-up/","type":"SERVICE","icon":"laptop","keywords":["new","setup","install","accounts","office"]},
    {"title":"Computer Tune Up","url":"https://bobthetechguy.com/computer-tune-up/","type":"SERVICE","icon":"gauge","keywords":["slow","speed","cleanup","maintenance","sluggish","dust"]},
    {"title":"Anti-Virus","url":"https://bobthetechguy.com/anti-virus/","type":"SERVICE","icon":"shield","keywords":["virus","malware","spyware","ransomware","infected","hacked"]},
    {"title":"Backup Solutions","url":"https://bobthetechguy.com/backup-solutions/","type":"SERVICE","icon":"cloud","keywords":["backup","cloud","files","restore"]},
    {"title":"Data Recovery Service","url":"https://bobthetechguy.com/data-recovery-service/","type":"SERVICE","icon":"drive","keywords":["recover","lost","deleted","files","crashed","drive"]},
    {"title":"Software Installation and Configuration","url":"https://bobthetechguy.com/software-installation-and-configuration/","type":"SERVICE","icon":"box","keywords":["software","programs","apps","office","install"]},
    {"title":"Screen Replacement","url":"https://bobthetechguy.com/screen-replacement/","type":"SERVICE","icon":"screen","keywords":["screen","cracked","broken","laptop","display"]},
    {"title":"Parental Controls","url":"https://bobthetechguy.com/parental-controls/","type":"SERVICE","icon":"lock","keywords":["kids","children","parental","filter","safety"]},
    {"title":"Printer Solutions","url":"https://bobthetechguy.com/printer-solutions/","type":"SERVICE","icon":"printer","keywords":["printer","printing","scanner"]},
    {"title":"Operating System Install","url":"https://bobthetechguy.com/operating-system-install/","type":"SERVICE","icon":"window","keywords":["windows","mac","linux","os","reinstall","upgrade"]},
    {"title":"Hardware Repair & Upgrades","url":"https://bobthetechguy.com/hardware-repair-upgrades/","type":"SERVICE","icon":"tool","keywords":["repair","fix","broken","upgrade","diagnostics"]},
    {"title":"Hardware Install","url":"https://bobthetechguy.com/hardware-install/","type":"SERVICE","icon":"plug","keywords":["graphics","card","drive","webcam","install"]},
    {"title":"Memory Install","url":"https://bobthetechguy.com/memory-install/","type":"SERVICE","icon":"chip","keywords":["ram","memory","slow","upgrade","speed"]},
    {"title":"Email Setup","url":"https://bobthetechguy.com/email-setup/","type":"SERVICE","icon":"mail","keywords":["email","outlook","mail","gmail"]},
    {"title":"Best Computer Repair Chesterfield VA","url":"https://bobthetechguy.com/best-computer-repair-chesterfield-va/","type":"AREA","icon":"pin","keywords":["repair","computer","pc","near"]},
    {"title":"PC Repair Service Bon Air Virginia","url":"https://bobthetechguy.com/pc-repair-service-bon-air-virginia/","type":"AREA","icon":"pin","keywords":["repair","computer","pc","near"]},
    {"title":"PC Repair Service Brandermill Virginia","url":"https://bobthetechguy.com/pc-repair-service-brandermill-virginia/","type":"AREA","icon":"pin","keywords":["repair","computer","pc","near"]},
    {"title":"PC Repair Service Chester Virginia","url":"https://bobthetechguy.com/pc-repair-service-chester-virginia/","type":"AREA","icon":"pin","keywords":["repair","computer","pc","near"]},
    {"title":"PC Repair Service Colonial Heights Virginia","url":"https://bobthetechguy.com/pc-repair-service-colonial-heights-virginia/","type":"AREA","icon":"pin","keywords":["repair","computer","pc","near"]},
    {"title":"PC Repair Service Midlothian Virginia","url":"https://bobthetechguy.com/pc-repair-service-midlothian-virginia/","type":"AREA","icon":"pin","keywords":["repair","computer","pc","near"]},
    {"title":"PC Repair Service Moseley Virginia","url":"https://bobthetechguy.com/pc-repair-service-moseley-virginia/","type":"AREA","icon":"pin","keywords":["repair","computer","pc","near"]},
    {"title":"PC Repair Service Richmond Virginia","url":"https://bobthetechguy.com/pc-repair-service-richmond-virginia/","type":"AREA","icon":"pin","keywords":["repair","computer","pc","near"]},
    {"title":"PC Repair Service Woodlake Virginia","url":"https://bobthetechguy.com/pc-repair-service-woodlake-virginia/","type":"AREA","icon":"pin","keywords":["repair","computer","pc","near"]},
    {"title":"Home","url":"https://bobthetechguy.com/","type":"PAGE","icon":"page","keywords":["home","bob"]},
    {"title":"About","url":"https://bobthetechguy.com/about/","type":"PAGE","icon":"page","keywords":["bob","veteran","story","experience"]},
    {"title":"Reviews","url":"https://bobthetechguy.com/reviews/","type":"PAGE","icon":"page","keywords":["reviews","rating","stars"]},
    {"title":"Testimonials","url":"https://bobthetechguy.com/testimonials/","type":"PAGE","icon":"page","keywords":["customers","reviews"]},
    {"title":"Contact","url":"https://bobthetechguy.com/contact-2/","type":"PAGE","icon":"page","keywords":["contact","email","phone","call","quote"]}
  ];
  /* search-data:end */

  function norm(s) {
    return String(s).toLowerCase().replace(/&amp;/g, '&')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9& ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  // Per query word: title word starts with it (3) > title contains it (2) > a keyword starts with it (1).
  function score(words, page) {
    var title = norm(page.title), tw = title.split(' '), kw = (page.keywords || []).map(norm), total = 0;
    words.forEach(function (q) {
      if (tw.some(function (w) { return w.indexOf(q) === 0; })) total += 3;
      else if (title.indexOf(q) !== -1) total += 2;
      else if (kw.some(function (k) { return k.indexOf(q) === 0; })) total += 1;
    });
    return total;
  }

  function rank(query, pages, limit) {
    var q = norm(query);
    if (q.length < 2) return [];
    var words = q.split(' ');
    return pages.map(function (p, i) { return { p: p, s: score(words, p), i: i }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s || a.i - b.i; })
      .slice(0, limit || 5)
      .map(function (x) { return x.p; });
  }

  var SEARCH_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38792f" stroke-width="2.2" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';

  // Results page (/search/?q=...): a page we control, so it wears the current header and cards.
  var SITE = 'https://bobthetechguy.com/';
  function item(p) {
    return '<li><a class="btg-sr-item btg-card--' + p.icon + '" href="' + esc(p.url) + '"><span class="btg-search-ico btg-card--' + p.icon + '" aria-hidden="true"></span>' +
      '<span class="btg-sr-title">' + esc(p.title) + '</span><span class="btg-search-type">' + p.type + '</span></a></li>';
  }
  function browseHtml() {
    var groups = (window.BTGHeader && window.BTGHeader.GROUPS) || [];
    return '<h2 class="btg-sr-h">Browse all services</h2>' + groups.map(function (g) {
      var items = g.items.map(function (it) {
        return PAGES.filter(function (p) { return p.url === SITE + it[0] + '/'; })[0];
      }).filter(Boolean);
      return '<h3 class="btg-sr-group">' + g.name + '</h3><ul class="btg-sr-list">' + items.map(item).join('') + '</ul>';
    }).join('');
  }
  function resultsHtml(query) {
    var q = String(query || '').trim(), out = '';
    if (norm(q).length < 2) return browseHtml();
    var found = rank(q, PAGES, 12);
    if (found.length) out += '<p class="btg-sr-count">' + found.length + (found.length === 1 ? ' page matches' : ' pages match') + ' \u201C' + esc(q) + '\u201D</p><ul class="btg-sr-list">' + found.map(item).join('') + '</ul>';
    else out += '<p class="btg-sr-none">No pages match \u201C' + esc(q) + '\u201D. Try a simpler word, or pick a service below.</p>' + browseHtml();
    out += '<p class="btg-sr-more">Not what you need? <a href="' + SITE + '?s=' + encodeURIComponent(q) + '">Search the full site text</a> or call <a href="tel:8448354890">844-TEKGUY-0</a>.</p>';
    return out;
  }
  function initPage(doc, win) {
    var box = doc.querySelector('.btg-search-page');
    if (!box || box.getAttribute('data-btg')) return false;
    box.setAttribute('data-btg', '1');
    var m = /[?&]q=([^&]*)/.exec(win.location.search || ''), q = '';
    try { q = m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; } catch (e) { q = ''; }
    box.innerHTML = '<form class="btg-sr-form" role="search" action="/search/" method="get"><input class="btg-sr-input" type="search" name="q" aria-label="Search this site" placeholder="What do you need help with?" value="' + esc(q) + '"><button class="btg-sr-go" type="submit">Search</button></form><div class="btg-sr-body" aria-live="polite">' + resultsHtml(q) + '</div>';
    return true;
  }

  function init(doc, win) {
    var btn = doc.querySelector('.btg-search-btn'), header = doc.querySelector('.fusion-header');
    if (!btn || !header || doc.querySelector('.btg-search')) return false;
    var box = doc.createElement('div');
    box.className = 'btg-search';
    box.hidden = true;
    box.innerHTML = '<form class="btg-search-form" role="search" action="/search/" method="get">' +
      '<input id="btg-search-input" class="btg-search-input" type="search" name="q" placeholder="Search" aria-label="Search" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="btg-search-list" aria-autocomplete="list">' +
      '<ul id="btg-search-list" class="btg-search-list" role="listbox" hidden></ul>' +
      '<p class="btg-search-status" role="status" aria-live="polite"></p></form>';
    header.appendChild(box);
    var input = box.querySelector('input'), list = box.querySelector('ul'), form = box.querySelector('form'), status = box.querySelector('[role=status]'), active = -1;

    function options() { return list.querySelectorAll('[role=option]'); }
    function openBox() { box.hidden = false; btn.setAttribute('aria-expanded', 'true'); input.focus(); }
    function closeBox() { box.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
    function render() {
      var q = input.value, items = rank(q, PAGES, 5);
      active = -1;
      input.removeAttribute('aria-activedescendant');
      if (norm(q).length < 2) { list.hidden = true; list.innerHTML = ''; status.textContent = ''; input.setAttribute('aria-expanded', 'false'); return; }
      var html = items.map(function (p, i) {
        return '<li role="option" id="btg-opt-' + i + '" class="btg-search-opt" data-url="' + esc(p.url) + '">' +
          '<span class="btg-search-ico btg-card--' + p.icon + '" aria-hidden="true"></span>' +
          '<span class="btg-search-title">' + esc(p.title) + '</span><span class="btg-search-type">' + p.type + '</span></li>';
      }).join('');
      if (!items.length) html += '<li class="btg-search-empty" role="presentation">No matching pages. Press Enter to search the whole site.</li>';
      html += '<li role="option" id="btg-opt-all" class="btg-search-all">Search all pages for "' + esc(q) + '" &rarr;</li>';
      list.innerHTML = html;
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      status.textContent = items.length ? items.length + (items.length === 1 ? ' suggestion' : ' suggestions') : 'No matching pages. Press Enter to search the whole site.';
    }
    function highlight(i) {
      var o = options();
      if (!o.length) return;
      active = (i + o.length) % o.length;
      for (var k = 0; k < o.length; k++) { o[k].classList.toggle('is-active', k === active); o[k].setAttribute('aria-selected', String(k === active)); }
      input.setAttribute('aria-activedescendant', o[active].id);
    }
    function go(el) {
      if (!el || el.id === 'btg-opt-all') form.submit();
      else win.location.href = el.getAttribute('data-url');
    }
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(active + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(active - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (active >= 0) go(options()[active]); else if (norm(input.value).length >= 2) go(null); else status.textContent = 'Type at least 2 letters to search.'; }
      else if (e.key === 'Escape') { e.preventDefault(); closeBox(); }
    });
    list.addEventListener('mousedown', function (e) {
      var el = e.target.closest('[role=option]');
      if (el) { e.preventDefault(); go(el); }
    });
    btn.addEventListener('click', function () { if (box.hidden) openBox(); else closeBox(); });
    // A click anywhere outside the panel and its button closes it.
    doc.addEventListener('mousedown', function (e) {
      if (!box.hidden && !box.contains(e.target) && !btn.contains(e.target)) { box.hidden = true; btn.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-expanded', 'false'); status.textContent = ''; }
    });
    doc.addEventListener('keydown', function (e) {
      var a = doc.activeElement;
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || (a &&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable))) return;
      e.preventDefault();
      openBox();
    });
    return true;
  }

  return { PAGES: PAGES, norm: norm, esc: esc, rank: rank, resultsHtml: resultsHtml, initPage: initPage, init: init, SEARCH_ICON: SEARCH_ICON };
})();


/* 07-header.js */
window.BTGHeader = (function () {
  var LOGO_SVG = '<svg class="btg-logo" viewBox="0 0 212 66" width="176" height="55" aria-hidden="true" focusable="false">' +
    '<text x="4" y="24" font-family="Roboto Slab, Georgia, serif" font-size="14" letter-spacing="3.5" class="btg-logo-top">BOB THE</text>' +
    '<text x="2" y="51" font-family="Roboto Slab, Georgia, serif" font-weight="700" font-size="30" class="btg-logo-main">Tech <tspan class="btg-logo-accent">Guy</tspan></text>' +
    '<path d="M4 60h122l8-8h58" fill="none" stroke="#54aa47" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle class="btg-logo-pad" cx="197" cy="52" r="5" fill="#54aa47"/>' +
    '<circle cx="197" cy="52" r="9.5" fill="none" stroke="#54aa47" stroke-opacity=".35" stroke-width="2"/></svg>';
  var ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1c201b"/>' +
    '<text x="15" y="44" font-family="Georgia, serif" font-weight="700" font-size="34" fill="#fff">B</text>' +
    '<path d="M13 53h24l5-5h9" fill="none" stroke="#6ec95f" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="52" cy="48" r="4" fill="#6ec95f"/></svg>';
  // Keep equal to tools/services-index.js GROUPS (test/header.test.js enforces it).
  var GROUPS = [
    { name: 'Repairs &amp; Upgrades', items: [['hardware-repair-upgrades', 'tool'], ['screen-replacement', 'screen'], ['memory-install', 'chip'], ['hardware-install', 'plug'], ['computer-tune-up', 'gauge'], ['data-recovery-service', 'drive']] },
    { name: 'Setup &amp; Software', items: [['computer-set-up', 'laptop'], ['operating-system-install', 'window'], ['software-installation-and-configuration', 'box'], ['printer-solutions', 'printer'], ['email-setup', 'mail']] },
    { name: 'Security &amp; Networking', items: [['networking', 'wifi'], ['anti-virus', 'shield'], ['backup-solutions', 'cloud'], ['parental-controls', 'lock']] }
  ];

  function slugOf(href) { var m = /\/([a-z0-9-]+)\/?$/.exec(href || ''); return m ? m[1] : ''; }

  function groupLinks(links) {
    var used = [];
    var out = GROUPS.map(function (g) {
      var items = [];
      g.items.forEach(function (it) {
        links.forEach(function (l) {
          if (slugOf(l.href) === it[0] && used.indexOf(l) === -1) { used.push(l); items.push({ href: l.href, text: l.text, icon: it[1] }); }
        });
      });
      return { name: g.name, items: items };
    }).filter(function (g) { return g.items.length; });
    var more = links.filter(function (l) { return used.indexOf(l) === -1; }).map(function (l) { return { href: l.href, text: l.text, icon: 'page' }; });
    if (more.length) out.push({ name: 'More', items: more });
    return out;
  }

  function panelsHtml(groups) {
    var esc = window.BTGSearch.esc;
    return '<div class="btg-panels">' + groups.map(function (g) {
      return '<section class="btg-panel"><h2 class="btg-panel-title">' + g.name + '</h2><ul class="btg-panel-list">' +
        g.items.map(function (i) { return '<li><a class="btg-panel-link btg-card--' + i.icon + '" href="' + esc(i.href) + '">' + esc(i.text) + '</a></li>'; }).join('') +
        '</ul></section>';
    }).join('') + '</div>';
  }

  function buildDropdown(doc, nav, header) {
    var svc = nav && nav.querySelector('a[href$="/services-2/"]');
    if (!svc) return;
    var li = svc.closest('li');
    var links = [].map.call(li.querySelectorAll('.sub-menu a'), function (a) { return { href: a.href, text: a.textContent.trim() }; });
    if (!links.length) return;
    var panel = doc.createElement('div');
    panel.className = 'btg-dropdown';
    panel.id = 'btg-services-panel';
    panel.hidden = true;
    panel.innerHTML = panelsHtml(groupLinks(links));
    li.classList.add('btg-has-panel');
    svc.setAttribute('aria-expanded', 'false');
    svc.setAttribute('aria-controls', panel.id);
    // Avada copies this menu into its phone menu after we run; that copy has no
    // panel, so drop the copied ARIA from it.
    var stripClones = function () {
      [].forEach.call(doc.querySelectorAll('.fusion-mobile-nav-holder [aria-controls="' + panel.id + '"]'), function (a) {
        a.removeAttribute('aria-controls');
        a.removeAttribute('aria-expanded');
      });
    };
    setTimeout(stripClones, 0);
    if (doc.defaultView) doc.defaultView.addEventListener('load', stripClones);
    var t;
    // Attached on first open: Avada clones this menu into its mobile menu on
    // ready, and the clone must not carry a second copy of the panel.
    function open() {
      clearTimeout(t);
      if (!panel.parentNode) li.appendChild(panel);
      panel.hidden = false;
      svc.setAttribute('aria-expanded', 'true');
    }
    function close() { clearTimeout(t); panel.hidden = true; svc.setAttribute('aria-expanded', 'false'); }
    function later(fn) { clearTimeout(t); t = setTimeout(fn, 150); }
    li.addEventListener('mouseenter', function () { later(open); });
    li.addEventListener('mouseleave', function () { later(close); });
    // Returning focus to Services after Escape must not reopen the panel.
    var returning = false;
    svc.addEventListener('focus', function () { if (!returning) open(); });
    li.addEventListener('focusout', function (e) { if (!li.contains(e.relatedTarget)) close(); });
    li.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); close(); returning = true; svc.focus(); returning = false; }
    });
  }

  function init(doc, win) {
    var header = doc.querySelector('.fusion-header');
    if (!header || header.getAttribute('data-btg-header')) return false;
    header.setAttribute('data-btg-header', '1');
    var row = header.querySelector('.fusion-row') || header;

    var logo = header.querySelector('.fusion-logo-link');
    if (logo) {
      [].forEach.call(logo.querySelectorAll('img'), function (i) { i.parentNode.removeChild(i); });
      logo.insertAdjacentHTML('afterbegin', LOGO_SVG);
      logo.setAttribute('aria-label', 'Bob The Tech Guy — home');
    }
    if (doc.head) {
      var icon = doc.createElement('link');
      icon.rel = 'icon';
      icon.type = 'image/svg+xml';
      icon.href = 'data:image/svg+xml,' + encodeURIComponent(ICON_SVG);
      doc.head.appendChild(icon);
    }

    var nav = doc.querySelector('.fusion-secondary-main-menu .fusion-main-menu') || doc.querySelector('.fusion-header .fusion-main-menu');
    // Avada fills its mobile menu from the menu beside it (holder.parent().find('.fusion-main-menu'))
    // and toggles it inside .fusion-secondary-main-menu, so that whole row moves into the logo row
    // intact; CSS gives it display: contents so the menu joins the one-row layout.
    var sec = nav && nav.closest('.fusion-secondary-main-menu');
    if (sec) row.appendChild(sec); else if (nav) row.appendChild(nav);
    var tools = doc.createElement('div');
    tools.className = 'btg-header-tools';
    tools.innerHTML = '<button type="button" class="btg-search-btn" aria-label="Search" aria-expanded="false">' + window.BTGSearch.SEARCH_ICON + '</button>' +
      '<a class="btg-call" href="tel:8448354890">844-TEKGUY-0<small>(844) 835-4890</small></a>';
    row.appendChild(tools);
    var mob = header.querySelector('.fusion-mobile-menu-icons');
    if (mob) tools.appendChild(mob);

    // A failed panel build leaves the theme's own Services submenu working.
    try { buildDropdown(doc, nav, header); } catch (e) { if (win.console) win.console.error('btg: Services panel', e); }

    var wrapper = doc.querySelector('.fusion-header-wrapper');
    if (wrapper) {
      // Stick the main header row; let the top bar above it scroll away.
      // The top bar's height changes as fonts load, so re-measure rather than fix it once.
      var pin = function () { wrapper.style.top = -(header.getBoundingClientRect().top - wrapper.getBoundingClientRect().top) + 'px'; };
      var onScroll = function () { wrapper.classList.toggle('btg-scrolled', (win.pageYOffset || 0) > 80); pin(); };
      win.addEventListener('scroll', onScroll, { passive: true });
      win.addEventListener('resize', pin);
      win.addEventListener('load', pin);
      onScroll();
    }
    doc.documentElement.classList.add('btg-header-on');
    return true;
  }

  return { LOGO_SVG: LOGO_SVG, ICON_SVG: ICON_SVG, GROUPS: GROUPS, groupLinks: groupLinks, panelsHtml: panelsHtml, init: init };
})();


(function () {
  // Guards against the Node test environment's minimal `document` stub,
  // which has no querySelector/readyState/addEventListener — this file is
  // required directly by bundle/test/init.test.js to exercise the pure
  // BTGInit functions above without wanting this auto-run to fire.
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function' || typeof document.addEventListener !== 'function') {
    return;
  }

  // Each enhancement runs on its own, so one failing (e.g. after a theme update)
  // never stops the others; the page itself always works without them.
  function safely(fn) { try { fn(); } catch (e) { if (window.console) console.warn('btg:', e); } }
  function run() {
    safely(function () { window.BTGInit.fixTelLinks(document); });
    safely(function () { window.BTGInit.addCtaDigits(document); });
    safely(function () { window.BTGInit.addHeroTrust(document); });
    safely(function () { window.BTGInit.removeDuplicateTitleBar(document); });
    safely(function () { window.BTGInit.removeHomeSlider(document); });
    safely(function () { window.BTGInit.injectSchemaAndMeta(document, window); });
    safely(function () { window.BTGHeader.init(document, window); });
    safely(function () { window.BTGSearch.init(document, window); });
    safely(function () { window.BTGSearch.initPage(document, window); });
  }
  if (document.readyState !== 'loading') {
    run();
  } else {
    document.addEventListener('DOMContentLoaded', run);
  }
})();
