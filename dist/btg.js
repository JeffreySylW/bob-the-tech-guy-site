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

  return { PAGES: PAGES, norm: norm, esc: esc, rank: rank };
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

  return { LOGO_SVG: LOGO_SVG, ICON_SVG: ICON_SVG, GROUPS: GROUPS, groupLinks: groupLinks, panelsHtml: panelsHtml };
})();


(function () {
  // Guards against the Node test environment's minimal `document` stub,
  // which has no querySelector/readyState/addEventListener — this file is
  // required directly by bundle/test/init.test.js to exercise the pure
  // BTGInit functions above without wanting this auto-run to fire.
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function' || typeof document.addEventListener !== 'function') {
    return;
  }

  function run() {
    window.BTGInit.fixTelLinks(document);
    window.BTGInit.addCtaDigits(document);
    window.BTGInit.addHeroTrust(document);
    window.BTGInit.removeDuplicateTitleBar(document);
    window.BTGInit.removeHomeSlider(document);
    window.BTGInit.injectSchemaAndMeta(document, window);
  }
  if (document.readyState !== 'loading') {
    run();
  } else {
    document.addEventListener('DOMContentLoaded', run);
  }
})();
