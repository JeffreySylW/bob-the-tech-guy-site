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
      var lede = doc.querySelector('.btg-hero-lede'), here = (win.location && win.location.pathname) || '/';
      var desc = DESCRIPTIONS[here] || (lede && lede.textContent && lede.textContent.trim())
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

  // Page descriptions (110-160 characters) for search results; the hero lede is only the fallback.
  var DESCRIPTIONS = {
    '/': 'Bob The Tech Guy: on-site computer repair, virus removal and networking for homes and small businesses in Chesterfield, Midlothian and greater Richmond, VA.',
    '/about/': 'Meet Bob Dyer, the Marine Corps veteran behind Bob The Tech Guy, with 25 years of hands-on IT experience, now serving Chesterfield and Richmond, VA.',
    '/services-2/': 'Computer repair, virus removal, data recovery, networking, setup and upgrades. Browse every service Bob The Tech Guy offers homes and small businesses.',
    '/contact-2/': 'Call 844-TEKGUY-0 or send a message to book on-site computer repair in Chesterfield and greater Richmond, VA, or service in northern New Jersey.',
    '/testimonials/': 'Read what customers say about Bob The Tech Guy: honest, on-time computer repair and support that is done right the first time, at a fair price.',
    '/reviews/': 'Customer reviews of Bob The Tech Guy computer repair. Every rated review is five stars, for friendly, knowledgeable service at reasonable rates.',
    '/gallery/': 'Photos from real Bob The Tech Guy jobs: PC builds, upgrades, virus cleanups, data recovery and network installs for homes and small businesses.',
    '/northern-new-jersey/': 'Bob The Tech Guy still serves northern New Jersey: on-site computer repair, virus removal and networking in Pompton Lakes, Wyckoff, Ramsey and nearby.',
    '/customer-log-in/': 'Sign in to your Bob The Tech Guy customer account to view your profile and update your settings, or create a new account in about a minute.',
    '/search/': 'Search Bob The Tech Guy services and pages to find the right help for a slow computer, a virus, Wi-Fi trouble, lost files, a new PC and more.',
    '/networking/': 'Home and small-business networking from Bob The Tech Guy: Wi-Fi setup, wired networks and routers installed and secured on-site in Chesterfield, VA.',
    '/anti-virus/': 'Virus, spyware and malware removal from Bob The Tech Guy. Bob cleans infected computers, installs current protection and explains what he found.',
    '/computer-tune-up/': 'Slow computer? A Bob The Tech Guy tune-up clears junk, fixes slow start-ups, installs critical updates and gets your PC running quickly again.',
    '/computer-set-up/': 'New computer setup by Bob The Tech Guy: updates, user accounts, email, Microsoft Office and printers set up so the computer is ready from day one.',
    '/data-recovery-service/': 'Lost files after a crash, deletion or failing drive? Bob The Tech Guy recovers photos, documents and other files from damaged or failed hard drives.',
    '/backup-solutions/': 'Backup solutions from Bob The Tech Guy: automatic local and cloud backups set up so your photos, documents and business files survive a failure.',
    '/software-installation-and-configuration/': 'Software installation and configuration by Bob The Tech Guy: Microsoft Office, security tools, drivers and business programs installed properly.',
    '/screen-replacement/': 'Cracked or dead laptop screen? Bob The Tech Guy replaces it with the right part and tests the display before your laptop comes back to you.',
    '/parental-controls/': 'Parental controls set up by Bob The Tech Guy: content filters, time limits and safer browsing configured on the computers your family uses.',
    '/printer-solutions/': 'Printer and scanner setup and troubleshooting from Bob The Tech Guy: wired and wireless printers installed, shared on your network and working.',
    '/operating-system-install/': 'Windows, Mac OS and Linux installs and reinstalls from Bob The Tech Guy, with drivers, critical updates and your software set up afterwards.',
    '/hardware-repair-upgrades/': 'Computer hardware repair and upgrades from Bob The Tech Guy: diagnostics, failed parts replaced, and upgrades that make an older PC fast again.',
    '/hardware-install/': 'Hardware installation by Bob The Tech Guy: graphics cards, hard drives, power supplies, webcams and more installed, configured and tested together.',
    '/memory-install/': 'RAM upgrades from Bob The Tech Guy: the right memory installed, verified in BIOS and the operating system, and tested so your computer runs faster.',
    '/email-setup/': 'Email setup by Bob The Tech Guy: Outlook, Gmail and business email accounts configured on your computers so mail arrives, sends and syncs properly.'
  };

  // The ~375 New Jersey area posts were merged into one page; old links to them go there.
  var NJ_PAGE = '/northern-new-jersey/';
  var NJ_SLUG = /(-nj|new-jersey|pompton|pompon|passaic|bergen|pequannock|saddle-river|wanaque|butler|wyckoff|ramsey|mahwah|oakland|allendale|riverdale|totowa|montville|wayne|midland-park|waldwick|ridgewood|glen-rock|fair-lawn|paramus)/;
  function njTarget(path) {
    var m = /^\/([a-z0-9-]+)\/?$/.exec(path || '');
    if (!m || path === NJ_PAGE || !NJ_SLUG.test(m[1])) return null;
    return NJ_PAGE;
  }
  function rewriteNjLinks(doc) {
    var host = 'bobthetechguy.com', seen = {};
    Array.prototype.forEach.call(doc.querySelectorAll('a[href]'), function (a) {
      if (a.hostname && a.hostname.replace(/^www\./, '') !== host) return;
      var t = njTarget(a.pathname);
      if (!t) return;
      a.setAttribute('href', 'https://' + host + t);
      // In footer link lists, keep one "Northern New Jersey" entry.
      var li = a.closest && a.closest('.fusion-footer li');
      if (!li) return;
      if (seen[t]) li.parentNode.removeChild(li); else { seen[t] = true; a.textContent = 'Northern New Jersey'; }
    });
  }

  // The footer holds an old cryptocurrency price widget (admin-only to delete). Stop its script and remove it.
  function isBlockedScript(src) { return /coinmarketcap\.com/i.test(src || ''); }
  function blockCrypto(doc) {
    Array.prototype.forEach.call(doc.querySelectorAll('.coinmarketcap-currency-widget'), function (w) { w.parentNode.removeChild(w); });
  }

  // Service pages: a "Request a visit" button in the closing call box, pre-filling the contact form.
  function requestHref(service) { return '/contact-2/?service=' + encodeURIComponent(service) + '#btg-request'; }
  function addRequestButton(doc, win) {
    var path = (win.location && win.location.pathname) || '/', page = null;
    (window.BTGSearch ? window.BTGSearch.PAGES : []).forEach(function (p) { if (p.type === 'SERVICE' && p.url.replace('https://bobthetechguy.com', '') === path) page = p; });
    var box = doc.querySelector('.btg-cta-block');
    if (!page || !box || box.querySelector('.btg-request-btn')) return false;
    var p = doc.createElement('p');
    p.className = 'btg-cta-request';
    p.innerHTML = '<a class="btg-request-btn" href="' + requestHref(page.title).replace(/&/g, '&amp;') + '">Request a visit</a>';
    box.appendChild(p);
    return true;
  }
  function prefillContact(doc, win) {
    var form = doc.querySelector('.wpcf7');
    if (!form) return false;
    form.id = 'btg-request';
    var m = /[?&]service=([^&#]*)/.exec(win.location.search || '');
    if (!m) return false;
    var service = '';
    try { service = decodeURIComponent(m[1].replace(/\+/g, ' ')).slice(0, 80); } catch (e) { return false; }
    var msg = form.querySelector('[name="your-message"]'), subj = form.querySelector('[name="your-subject"]');
    if (subj && !subj.value) subj.value = 'Request a visit: ' + service;
    if (msg && !msg.value) msg.value = 'I would like to request a visit for ' + service + '.\n\n';
    return true;
  }

  // No customer accounts (v1.6.7): drop the "Customer Log In" menu item, desktop and the mobile copy (menus are admin-only).
  // Runs on the main, mobile and sticky copies; Avada builds the mobile clone late, so run() calls it again on load.
  function fixLoginMenu(doc) {
    Array.prototype.forEach.call(doc.querySelectorAll('li'), function (li) {
      var a = null, i;
      for (i = 0; i < li.children.length; i++) if (li.children[i].tagName === 'A') { a = li.children[i]; break; }
      if (a && a.textContent.trim() === 'Customer Log In' && li.parentNode) li.parentNode.removeChild(li);
    });
  }

  // Privacy note under the contact form.
  var PRIVACY_NOTE = '<p class="btg-privacy-note">We use your name, email and message only to reply about your repair. We don\'t sell this information. Email <a href="mailto:info@bobthetechguy.com">info@bobthetechguy.com</a> to ask us to delete it.</p>';
  function addPrivacyNote(doc) {
    var form = doc.querySelector('.wpcf7');
    if (!form || doc.querySelector('.btg-privacy-note')) return false;
    form.insertAdjacentHTML('afterend', PRIVACY_NOTE);
    return true;
  }

  // Footer: drop the empty Instagram widget and the dead Twitter timeline. The Twitter script may add its iframe late.
  function quietFooter(doc) {
    Array.prototype.forEach.call(doc.querySelectorAll('.fusion-footer .fusion-footer-widget-column'), function (col) {
      var h = col.querySelector('h1, h2, h3, h4, h5, h6, .widget-title');
      var insta = h && /instagram/i.test(h.textContent) && !col.querySelector('img, iframe');
      var tw = /Tweets by/.test(col.textContent) || !!col.querySelector('a.twitter-timeline') ||
        Array.prototype.some.call(col.querySelectorAll('iframe'), function (f) { return (f.getAttribute('src') || '').indexOf('twitter') !== -1; });
      if ((insta || tw) && col.parentNode) col.parentNode.removeChild(col);
    });
  }

  // Home hero: a way back to the New Jersey page, after the trust line (so run() calls this after addHeroTrust).
  function addNjLine(doc, win) {
    if (!win.location || win.location.pathname !== '/') return false;
    var hero = doc.querySelector('section.btg-hero');
    if (!hero || hero.querySelector('.btg-hero-alt')) return false;
    var p = doc.createElement('p');
    p.className = 'btg-hero-alt';
    p.innerHTML = '<a href="https://bobthetechguy.com/northern-new-jersey/">Still serving northern New Jersey &rarr;</a>';
    var trust = hero.querySelector('.btg-hero-trust');
    if (trust) trust.parentNode.insertBefore(p, trust.nextSibling); else hero.appendChild(p);
    return true;
  }

  return {
    DESCRIPTIONS: DESCRIPTIONS,
    fixLoginMenu: fixLoginMenu,
    PRIVACY_NOTE: PRIVACY_NOTE,
    addPrivacyNote: addPrivacyNote,
    quietFooter: quietFooter,
    addNjLine: addNjLine,
    njTarget: njTarget,
    rewriteNjLinks: rewriteNjLinks,
    isBlockedScript: isBlockedScript,
    blockCrypto: blockCrypto,
    requestHref: requestHref,
    addRequestButton: addRequestButton,
    prefillContact: prefillContact,
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

/* 08-account.js */
window.BTGAccount = (function () {
  var esc = window.BTGSearch.esc;
  function loginHtml(redirect) {
    return '<div class="btg-acct-grid"><section class="btg-acct-card"><h2 class="btg-acct-h">Sign in</h2>' +
      '<form class="btg-acct-form" action="/wp-login.php" method="post">' +
      '<label for="btg-log">Username or email</label><input id="btg-log" name="log" type="text" autocomplete="username" required>' +
      '<label for="btg-pwd">Password</label><input id="btg-pwd" name="pwd" type="password" autocomplete="current-password" required>' +
      '<label class="btg-acct-check"><input name="rememberme" type="checkbox" value="forever"> Keep me signed in</label>' +
      '<input type="hidden" name="redirect_to" value="' + esc(redirect) + '">' +
      '<button class="btg-acct-go" type="submit">Log in</button></form>' +
      '<p class="btg-acct-links"><a href="/wp-login.php?action=lostpassword">Forgot your password?</a></p></section>' +
      '<aside class="btg-acct-card btg-acct-side"><h2 class="btg-acct-h">New here?</h2><p>No account needed. Call Bob or send a request and he\u2019ll get back to you.</p>' +
      '<a class="btg-acct-alt" href="/contact-2/#btg-request">Request a visit</a>' +
      '<p class="btg-acct-help">Trouble signing in? Call <a href="tel:8448354890">844-TEKGUY-0</a>.</p></aside></div>';
  }
  function hubHtml() {
    var items = [['/members/me/profile/', 'Your profile', 'View your public profile.', 'page'], ['/members/me/profile/edit/', 'Edit profile', 'Update your name and details.', 'tool'],
      ['/members/me/settings/', 'Account settings', 'Email, password and notifications.', 'gauge'], ['/wp-login.php?action=logout', 'Log out', 'Sign out on this device.', 'lock']];
    return '<p class="btg-acct-in">You are signed in.</p><ul class="btg-sr-list">' + items.map(function (i) {
      return '<li><a class="btg-sr-item btg-acct-tile" href="' + i[0] + '"><span class="btg-search-ico btg-card--' + i[3] + '" aria-hidden="true"></span><span class="btg-acct-t"><strong>' + i[1] + '</strong><small>' + i[2] + '</small></span></a></li>';
    }).join('') + '</ul>';
  }
  function init(doc, win) {
    var box = doc.querySelector('.btg-account');
    if (!box || box.getAttribute('data-btg')) return false;
    box.setAttribute('data-btg', '1');
    box.innerHTML = /(^|\s)logged-in(\s|$)/.test(doc.body.className) ? hubHtml() : loginHtml(win.location.pathname || '/');
    return true;
  }
  return { loginHtml: loginHtml, hubHtml: hubHtml, init: init };
})();


/* 09-bob.js */
window.BTGBob = (function () {
  var PORTRAIT = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.5.9/dist/brand/bob-portrait.jpg';
  var ALT = 'Bob Dyer, Bob the Tech Guy';
  function faceHtml() { return '<img class="btg-hero-face" src="' + PORTRAIT + '" alt="' + ALT + '" width="88" height="88">'; }
  function facePaths() {
    var paths = ['/', '/contact-2/'];
    window.BTGSearch.PAGES.forEach(function (p) { if (p.type === 'SERVICE') paths.push(p.url.replace('https://bobthetechguy.com', '')); });
    return paths;
  }
  // Home, Contact and the service pages get Bob's face above the hero heading.
  function initHero(doc, win) {
    var path = win.location.pathname || '/';
    if (path.charAt(path.length - 1) !== '/') path += '/';
    if (facePaths().indexOf(path) === -1) return false;
    var hero = doc.querySelector('.btg-hero');
    if (!hero || hero.querySelector('.btg-hero-face')) return false;
    hero.insertAdjacentHTML('afterbegin', faceHtml());
    return true;
  }
  // A real photo beside the first card on four service pages (hand-picked; dated or off-topic shots are left out).
  var PHOTO_BASE = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.5.10/dist/brand/photos/';
  var PHOTOS = {
    '/hardware-repair-upgrades/': ['bob-repairing-pc.jpg', 'Bob Dyer repairing a computer', 476, 635],
    '/hardware-install/': ['graphics-card.jpg', 'A graphics card ready to be installed', 600, 800],
    '/memory-install/': ['motherboard-memory.jpg', 'A motherboard with its memory slots', 847, 635],
    '/operating-system-install/': ['os-install.jpg', 'A laptop starting from a system recovery disk', 600, 800]
  };
  function photoFor(path) {
    if (path.charAt(path.length - 1) !== '/') path += '/';
    var p = PHOTOS[path];
    return p ? { src: PHOTO_BASE + p[0], alt: p[1], width: p[2], height: p[3] } : null;
  }
  function initPhoto(doc, win) {
    var photo = photoFor(win.location.pathname || '/');
    var hero = doc.querySelector('.btg-hero'), next = hero && hero.nextElementSibling;
    if (!photo || !next || doc.querySelector('.btg-photo-fig')) return false;
    var fig = doc.createElement('figure');
    fig.className = 'btg-photo-fig';
    fig.innerHTML = '<img src="' + photo.src + '" alt="' + photo.alt + '" width="' + photo.width + '" height="' + photo.height + '">';
    var text = /(^|s)btg-split(s|$)/.test(next.className) && next.querySelector('.btg-split-text');
    if (text) {
      // Split layouts: the photo goes in the empty space under (or beside) the intro text.
      if (/btg-split--stacked/.test(next.className)) fig.className += ' btg-photo-fig--wrap';
      if (/btg-split--stacked/.test(next.className)) text.appendChild(fig); else text.insertBefore(fig, text.firstChild);
      return true;
    }
    var row = doc.createElement('div');
    row.className = 'btg-photo-row';
    next.parentNode.insertBefore(row, next);
    row.appendChild(next);
    row.appendChild(fig);
    return true;
  }
  return { PORTRAIT: PORTRAIT, faceHtml: faceHtml, initHero: initHero, photoFor: photoFor, initPhoto: initPhoto };
})();


/* 10-reviews.js */
window.BTGReviews = (function () {
  var esc = window.BTGSearch.esc;
  // Bob's Google listing (rating and count as of 30 Sep 2026; update them when they change).
  // While url is empty the summary shows the on-site numbers and never mentions Google.
  var GOOGLE = { url: 'https://maps.google.com/?cid=12486145650775343960', rating: 5, count: 28 };
  // Real reviews from the Reviews, Testimonials and home pages (rating 0 = written testimonial, no stars given).
  var REVIEWS = [
   {
    "name": "Frank Abate",
    "place": "",
    "date": "Apr 28, 2022",
    "rating": 5,
    "text": "I had Bob come over and clean up my computer that was clogged with spyware. I decided to upgrade and got confused on what to buy. I turned this over to Bob and he built me a great computer that really moves fast at a great price. He's been very helpful on all things related to keeping my computer going top notch and he is extremely fair and trustworthy. I highly recommend him and am thankful to have him on my support team."
   },
   {
    "name": "Lauren",
    "place": "",
    "date": "Feb 24, 2022",
    "rating": 5,
    "text": "I had an external hard drive that had stopped working, I went to a computer repair store(out of the county) and they told me the drive could not be saved. All of my life’s pictures were on there and I knew I had to find someone else to try to save my drive, I asked a few neighbors and found Bob! He saved my files and photos from my failed hard drive and was able to get them onto a new external drive! If you have an issue with an external drive definitely bring it to Bob to check it out!"
   },
   {
    "name": "George Courter",
    "place": "",
    "date": "Jan 16, 2022",
    "rating": 5,
    "text": "I called Bob about an issue with my Toshiba laptop and he promptly got back to me. I was unable to get on the laptop at all. I had restored it to its new condition by wiping it entirely after it froze up on me. Bob was able to quickly gain access to the computer for me and install several programs so that I could use it once again. Bob is extremely knowledgeable and was able to answer all of my computer related questions with ease. His explanations are easy to follow and he helped me access my photos through Google/Gmail on all my devices. I would highly recommend Bob The Tech Guy for any computer repair or technical installation. Thank you, George Courter"
   },
   {
    "name": "Daniel F. Deraney, Esq.",
    "place": "",
    "date": "Jan 12, 2022",
    "rating": 5,
    "text": "Contacted Bob after the Screen went on my HP G6 Pavilion Laptop. I purchased the Laptop in 2011 when in my 2nd Year of Law School Finals, my previous Laptop crapped out. Something I think that is so so important for Businesses, and something that I practice myself, is trying to save the Customer money, even if it means the Business will not get your Business. Bob did just that by discussing with me the Cost of a New Laptop as an alternative and inquiring why I wanted to repair it. I still decided to move forward for various reasons but I appreciate that move so so much. After agreeing on a reasonable priced quote to repair the issue, vs. quotes I had received elsewhere, Bob was very patient with me in working through my busy schedule AND not being able to part with the Laptop for a very long time because it is my main Computer for my Law Firm. When we hit a time crunch, having the laptop operation on a short deadline, he was responsive, scheduled the drop-off, took care of the repair faster than expected, and coordinated the pick-up after hours. I couldn't be more pleased with his service and am delighted to highly recommend him for your Computer Needs."
   },
   {
    "name": "Selena",
    "place": "",
    "date": "Jan 4, 2021",
    "rating": 5,
    "text": "Bob helped me out with a computer set up for my son. I got an appointment quickly and he was so helpful and kind. He had us up and running in no time and was very reasonably priced. Highly recommend!"
   },
   {
    "name": "Larry Bertola",
    "place": "",
    "date": "May 14, 2020",
    "rating": 5,
    "text": "Great job in a timely manner, thanks"
   },
   {
    "name": "John Penek, MD",
    "place": "",
    "date": "Oct 28, 2019",
    "rating": 5,
    "text": "Bob was very professional. He got the job done in a quick and efficient manor. He was very professional and pleasant. I would definitely call him again."
   },
   {
    "name": "Dianne S.",
    "place": "",
    "date": "Aug 7, 2019",
    "rating": 5,
    "text": "Great job! Saved my computer! Thank you, Bob"
   },
   {
    "name": "jerry hurley",
    "place": "",
    "date": "Dec 28, 2018",
    "rating": 5,
    "text": "I have used the services of Bob the Tech Guy at least 5 or 6 times for a variety of computer and note book and cell phone situations that were from the not so simple to ones that were complex. Each one was handled professionally and tells you why I have used him more than once. When you find gold you don't throw it away."
   },
   {
    "name": "Pete",
    "place": "",
    "date": "Dec 21, 2018",
    "rating": 5,
    "text": "Fast service. Got my lap top working again FAST! Highly recommended."
   },
   {
    "name": "Patty Kapr",
    "place": "",
    "date": "Jun 8, 2018",
    "rating": 5,
    "text": "I have been so pleased with the prompt service and excellent work I have received over the past several months from Bob. My church also used Bob and was extremely pleased. I would highly recommend!"
   },
   {
    "name": "Bill D",
    "place": "",
    "date": "Jun 8, 2018",
    "rating": 5,
    "text": "Thanks Bob for the work you did to get my computer up & running. Going from an old system I was really having problems until you saved the day. In a short a period of time you had things running and we were able to communicate in a language that I could understand. It was easy working with someone like you on site. Thanks again for a great job. I will definitely call you again and would recommend you to my friends!"
   },
   {
    "name": "Rich F.",
    "place": "",
    "date": "Dec 19, 2017",
    "rating": 5,
    "text": "I used Bob The Tech Guy to simplify my business invoicing. Bob created custom excel documents to aid in making the invoicing of my customers quicker. I've also used them to speed up my small business network. They do it all! He's got me as a customer for life! Thanks Bob!!"
   },
   {
    "name": "Robert Papa",
    "place": "",
    "date": "Oct 11, 2016",
    "rating": 5,
    "text": "Very knowledgeable, great service, did a lot of extra work for no additional fees, will definitely use in the future."
   },
   {
    "name": "Abbe Keslinger",
    "place": "Westwood, NJ",
    "date": "Oct 11, 2016",
    "rating": 5,
    "text": "I have been using BobtheTechGuy to repair my laptops. He is really good. He is honest. He knows his stuff. If you are having computer problems I would highly recommend calling him to help you out."
   },
   {
    "name": "Mauricio",
    "place": "",
    "date": "Jul 18, 2016",
    "rating": 5,
    "text": "Thank you BTTG!!!"
   },
   {
    "name": "Mary and Dave Codispoti",
    "place": "",
    "date": "Mar 28, 2016",
    "rating": 5,
    "text": "Bob the Tech Guy is just what you and your computer need. A friendly, on time, guy who knows his way around any computer, printer, fax machine, etc. He will explain the problem(s) and fix them properly. He is honest and his fees are reasonable. We have been customers of his for years and have never been disappointed. Get repairs done right the first time, call Bob!"
   },
   {
    "name": "Drew C.",
    "place": "Pompton Lakes, NJ",
    "date": "",
    "rating": 0,
    "text": "Was having multiple problems with my home PC. Bob the Tech Guy picked it up and within days had it running like new. Cleaned up all the glitches and viruses. Run like new. Thanks Bob, feeling safe online again. If your having problems with your home or office computer system give Bob a call. Have him check it out. Very friendly and professional."
   },
   {
    "name": "Mark M.",
    "place": "Little Falls, NJ",
    "date": "",
    "rating": 0,
    "text": "If you want someone for all your computer needs...Bob the Tech Guy is the Man!! Very reliable with reasonable rates.Your computer doesn't have to be broken to call Bob.....he offers maintenance and management to keep your computer running fast and secure!!! Simply The Best!!!"
   },
   {
    "name": "Ray F.",
    "place": "Riverdale, NJ",
    "date": "",
    "rating": 0,
    "text": "Bob has been fixing my computers for a year now. I have had no problems when they come back; everything was fixed right the first time and at a fair rate. I had computers that crashed and he retrieved the data that I thought was lost. Great work at a great price. Thanks Bob!"
   },
   {
    "name": "Michelle P.",
    "place": "Little Falls, NJ",
    "date": "",
    "rating": 0,
    "text": "If you need any computer repair or you're just looking to do some upgrades, these guys are the ones for the job! My computer was really slow and acting weird, so I called Bob The Tech Guy to come see what was going on. They arrived, diagnosed the issue as malware infecting my PC, and had my PC running smoothly before they left. Prices are very reasonable also, especially when you compare them to other big chain services. I will definitely use them again for any of my future computer needs!"
   },
   {
    "name": "Cassie F.",
    "place": "Pompton Lakes, NJ",
    "date": "",
    "rating": 0,
    "text": "Bob the Tech Guy is very reasonably priced and very patient. He not only repaired my laptops, my daughters and nieces laptops ... but he also helped my 80 yr old father who barely knew how to turn his pc on. Just an overall great experience. Yes I will use his service again for sure."
   }
  ];
  var STAR = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false"><path d="M10 1.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L10 14.8l-5.2 2.8 1-5.8L1.5 7.7l5.9-.8z" fill="#f5b301"/></svg>';
  function stars(n) { var h = ''; for (var i = 0; i < 5; i++) h += STAR; return '<span class="btg-rv-stars" role="img" aria-label="' + n + ' out of 5 stars">' + h + '</span>'; }
  function summaryHtml(g) {
    var rated = REVIEWS.filter(function (r) { return r.rating; });
    if (g && g.url && g.count) {
      return '<div class="btg-rv-sum"><p class="btg-rv-word">Excellent</p>' + stars(5) + '<p class="btg-rv-score"><b>' + Number(g.rating).toFixed(1) + '</b> from ' + g.count + ' Google reviews</p>' +
        '<a class="btg-rv-google" href="' + esc(g.url) + '" rel="noopener">Review us on Google</a></div>';
    }
    var avg = rated.reduce(function (a, r) { return a + r.rating; }, 0) / rated.length;
    return '<div class="btg-rv-sum"><p class="btg-rv-word">Excellent</p>' + stars(5) + '<p class="btg-rv-score"><b>' + avg.toFixed(1) + '</b> out of 5</p>' +
      '<p class="btg-rv-count">' + rated.length + ' star ratings · ' + REVIEWS.length + ' written reviews</p><a class="btg-rv-all" href="/reviews/">Read all reviews</a></div>';
  }
  function cardHtml(r, i) {
    var sub = [r.place, r.date].filter(Boolean).join(' · ');
    var long = r.text.length > 170;
    return '<article class="btg-rv-card" id="btg-rv-' + i + '"><header class="btg-rv-head"><span class="btg-rv-avatar" aria-hidden="true">' + esc(r.name.charAt(0)) + '</span>' +
      '<span><b class="btg-rv-name">' + esc(r.name) + '</b>' + (sub ? '<span class="btg-rv-sub">' + esc(sub) + '</span>' : '') + '</span></header>' +
      (r.rating ? stars(r.rating) : '') + '<p class="btg-rv-text' + (long ? ' is-clamped' : '') + '" id="btg-rv-text-' + i + '">' + esc(r.text) + '</p>' +
      (long ? '<button type="button" class="btg-rv-more" aria-expanded="false" aria-controls="btg-rv-text-' + i + '">Read more</button>' : '') + '</article>';
  }
  function bandHtml(g) {
    return '<section class="btg-rv" aria-label="Customer reviews">' + summaryHtml(g) +
      '<div class="btg-rv-slider"><div class="btg-rv-track" tabindex="0" aria-label="Reviews, scroll sideways for more">' + REVIEWS.map(cardHtml).join('') + '</div>' +
      '<div class="btg-rv-nav"><button type="button" class="btg-rv-prev" aria-label="Previous reviews">&#8249;</button><button type="button" class="btg-rv-next" aria-label="Next reviews">&#8250;</button></div></div></section>';
  }
  // The band goes on the home page only, in place of the old testimonial slider (the Reviews page lists them all).
  function spot(doc, path) {
    var old = path === '/' && doc.querySelector('.fusion-testimonials');
    return old || null;
  }
  function init(doc, win) {
    if (doc.querySelector('.btg-rv')) return false;
    var s = spot(doc, (win.location && win.location.pathname) || '/');
    if (!s) return false;
    var wrap = doc.createElement('div');
    wrap.innerHTML = bandHtml(GOOGLE);
    var band = wrap.firstChild;
    s.parentNode.replaceChild(band, s);
    var track = band.querySelector('.btg-rv-track');
    function page(dir) { track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: 'smooth' }); }
    band.querySelector('.btg-rv-prev').addEventListener('click', function () { page(-1); });
    band.querySelector('.btg-rv-next').addEventListener('click', function () { page(1); });
    band.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.btg-rv-more');
      if (!b) return;
      var open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', String(open));
      doc.getElementById(b.getAttribute('aria-controls')).classList.toggle('is-clamped', !open);
      b.textContent = open ? 'Show less' : 'Read more';
    });
    return true;
  }
  return { GOOGLE: GOOGLE, REVIEWS: REVIEWS, summaryHtml: summaryHtml, cardHtml: cardHtml, bandHtml: bandHtml, init: init };
})();

// Opening hours (from the Google listing, 2026-10-04; Bob to confirm they also apply in Virginia). One weekly schedule,
// in minutes after midnight Eastern Time, drives the home status pill, the contact hours card and the footer list.
window.BTGHours = (function () {
  'use strict';
  var WEEK = [null, null, [570, 1140], [570, 1020], [570, 1020], [570, 1020], [720, 900]]; // Sun..Sat
  var SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function fmt(min) {
    var h = Math.floor(min / 60), m = min % 60, h12 = h % 12 || 12;
    return h12 + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h < 12 ? ' AM' : ' PM');
  }
  function range(r, sep) {
    var a = fmt(r[0]), b = fmt(r[1]);
    if (a.slice(-2) === b.slice(-2)) a = a.slice(0, -3);
    return a + sep + b;
  }
  function et(d) {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    return { day: SHORT.indexOf(p.weekday), min: (Number(p.hour) % 24) * 60 + Number(p.minute) };
  }
  function isOpen(d) { var t = et(d), r = WEEK[t.day]; return !!r && t.min >= r[0] && t.min < r[1]; }
  function status(d) {
    var t = et(d), r = WEEK[t.day], k, n;
    if (r && t.min >= r[0] && t.min < r[1]) return 'Open now · until ' + fmt(r[1]);
    if (r && t.min < r[0]) return 'Opens today at ' + fmt(r[0]);
    for (k = 1; k <= 7; k++) {
      n = (t.day + k) % 7;
      if (WEEK[n]) return (r ? 'Closed now' : 'Closed today') + ' · Opens ' + (k === 1 ? 'tomorrow' : LONG[n]) + ' ' + fmt(WEEK[n][0]);
    }
    return 'By appointment';
  }
  // Consecutive days with the same hours share a row, starting from the first open day after a closed one.
  function footerRows() {
    var label = function (i) { return WEEK[i] ? range(WEEK[i], '–') : 'Closed'; };
    var start = 0, i, rows = [];
    for (i = 0; i < 7; i++) if (WEEK[i] && !WEEK[(i + 6) % 7]) { start = i; break; }
    for (i = 0; i < 7; i++) {
      var d = (start + i) % 7, last = rows[rows.length - 1];
      if (last && last.v === label(d)) last.to = d; else rows.push({ from: d, to: d, v: label(d) });
    }
    return rows.map(function (g) { return [SHORT[g.from] + (g.to !== g.from ? '–' + SHORT[g.to] : ''), g.v]; });
  }
  function weekHtml(d) {
    var today = et(d).day;
    return '<dl class="btg-hours-week">' + [1, 2, 3, 4, 5, 6, 0].map(function (i) {
      var c = i === today ? ' class="is-today"' : '';
      return '<dt' + c + '>' + SHORT[i] + '</dt><dd' + c + '>' + (WEEK[i] ? range(WEEK[i], ' – ') : 'Closed') + '</dd>';
    }).join('') + '</dl>';
  }
  // Home hero: a live open/closed pill under the hero lines.
  function initPill(doc, win) {
    var hero = win.location.pathname === '/' && doc.querySelector('section.btg-hero');
    if (!hero || hero.querySelector('.btg-hours-pill')) return false;
    var now = new Date(), p = doc.createElement('p');
    p.className = 'btg-hours-pill-wrap';
    p.innerHTML = '<span class="btg-hours-pill ' + (isOpen(now) ? 'is-open' : 'is-closed') + '"><span class="btg-hours-now"><span class="btg-hours-dot" aria-hidden="true"></span>' +
      status(now).replace(/ (AM|PM)/g, ' $1') + '</span><a href="/contact-2/#btg-hours">All hours</a></span>';
    var after = hero.querySelector('.btg-hero-alt') || hero.querySelector('.btg-hero-trust');
    if (after) after.parentNode.insertBefore(p, after.nextSibling); else hero.appendChild(p);
    return true;
  }
  return { WEEK: WEEK, status: status, isOpen: isOpen, footerRows: footerRows, weekHtml: weekHtml, initPill: initPill };
})();

// Footer additions (the widgets themselves are admin-only): the first widget becomes a contact block (Virginia details
// with the service-zone map, then the NJ line with Bob's Google pin), quick links fill the column the Instagram/Twitter
// widgets left empty, and a Google rating badge plus hours go under the veteran badge.
window.BTGFooter = (function () {
  'use strict';
  var SITE = 'https://bobthetechguy.com';
  var HOURS = window.BTGHours.footerRows();
  var LINKS = [['Services', '/services-2/'], ['About Bob', '/about/'], ['Gallery', '/gallery/'], ['Testimonials', '/testimonials/'], ['Contact', '/contact-2/']];
  function contactHtml() {
    return '<ul class="btg-foot-contact-list">' +
      '<li>Serving Chesterfield &amp; Greater Richmond, VA</li>' +
      '<li><a href="tel:8448354890">844-TEKGUY-0</a> <span>(844) 835-4890</span></li>' +
      '<li><a href="mailto:info@bobthetechguy.com">info@bobthetechguy.com</a></li></ul>' +
      '<div class="btg-foot-zone btg-zone-map" role="img" aria-label="Map of the Virginia service area"></div>' +
      '<ul class="btg-foot-contact-list btg-foot-nj"><li>Northern NJ: <a href="tel:8622105656">(862) 210-5656</a> &middot; <a href="' + SITE + '/northern-new-jersey/">NJ service area</a></li></ul>' +
      // Bob's Google listing pin. Its card shows the NJ address, which is fine; the Virginia address is never shown.
      '<iframe class="btg-foot-map" src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d12042.5344460568!2d-74.288835!3d41.0113919!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0xad47b350a040c358!2sBob+The+Tech+Guy!5e0!3m2!1sen!2sus!4v1453449210878" title="Bob The Tech Guy on Google Maps" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
  }
  function linksHtml() {
    return '<ul class="btg-foot-links">' + LINKS.map(function (l) { return '<li><a href="' + SITE + l[1] + '">' + l[0] + '</a></li>'; }).join('') + '</ul>';
  }
  function ratingHtml(g) {
    return '<a class="btg-foot-rating" href="' + g.url + '" target="_blank" rel="noopener"><span class="btg-foot-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span>' +
      '<span><b>' + g.rating.toFixed(1) + '</b> from ' + g.count + ' Google reviews</span></a>';
  }
  function hoursHtml(rows) {
    if (!rows.length) return '';
    return '<h4 class="widget-title btg-foot-hours-h">Hours</h4><dl class="btg-foot-hours">' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>';
  }
  function widget(doc, title, html) {
    var w = doc.createElement('div');
    w.className = 'fusion-footer-widget-column widget btg-foot';
    w.innerHTML = '<h4 class="widget-title">' + title + '</h4>' + html + '<div style="clear:both;"></div>';
    return w;
  }
  function init(doc) {
    var t3 = doc.querySelector('.fusion-footer #text-3');
    if (!t3 || doc.querySelector('.btg-foot-contact-list')) return false;
    var h = t3.querySelector('.widget-title');
    t3.innerHTML = (h ? h.outerHTML : '<h4 class="widget-title">Bob the Tech Guy</h4>') + contactHtml();
    var cols = Array.prototype.slice.call(doc.querySelectorAll('.fusion-footer .fusion-footer-widget-area .fusion-column'));
    var empty = cols.filter(function (c) { return !c.querySelector('.fusion-footer-widget-column'); })[0];
    var links = widget(doc, 'Quick Links', linksHtml());
    if (empty) empty.appendChild(links); else t3.parentNode.insertBefore(links, t3.nextSibling);
    var badge = doc.querySelector('.fusion-footer #text-16');
    var rating = widget(doc, 'Customer Reviews', ratingHtml(window.BTGReviews.GOOGLE) + hoursHtml(HOURS));
    if (badge) badge.parentNode.insertBefore(rating, badge.nextSibling); else links.parentNode.appendChild(rating);
    return true;
  }
  return { HOURS: HOURS, contactHtml: contactHtml, linksHtml: linksHtml, ratingHtml: ratingHtml, hoursHtml: hoursHtml, init: init };
})();

// Virginia service zone: Bob's location is not shared, so the map shows a rounded area around the towns he covers
// (OpenStreetMap via Leaflet, no key). Contact page: map + weekly hours card under the location cards. Footer: a small
// map in the contact block. Leaflet loads from cdnjs only when a map is about to scroll into view.
window.BTGZone = (function () {
  'use strict';
  var TOWNS = [['Richmond', 37.5407, -77.436], ['Bon Air', 37.5246, -77.5578], ['Midlothian', 37.5057, -77.6494], ['Brandermill', 37.4329, -77.6522],
    ['Woodlake', 37.4196, -77.6739], ['Moseley', 37.406, -77.77], ['Chesterfield', 37.3771, -77.5047], ['Chester', 37.3568, -77.4416], ['Colonial Heights', 37.2681, -77.4072]];
  var LEAFLET = {
    js: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
    jsSri: 'sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g==',
    css: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
    cssSri: 'sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw=='
  };
  // Convex hull of a ~5 km circle around each town: one smooth outline that covers them all.
  function zone() {
    var pts = [], i, k, a;
    TOWNS.forEach(function (t) { for (k = 0; k < 36; k++) { a = (k / 36) * 2 * Math.PI; pts.push([t[1] + 0.045 * Math.sin(a), t[2] + 0.057 * Math.cos(a)]); } });
    pts.sort(function (p, q) { return p[0] - q[0] || p[1] - q[1]; });
    var cross = function (o, p, q) { return (p[0] - o[0]) * (q[1] - o[1]) - (p[1] - o[1]) * (q[0] - o[0]); };
    var lower = [], upper = [];
    for (i = 0; i < pts.length; i++) { while (lower.length > 1 && cross(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop(); lower.push(pts[i]); }
    for (i = pts.length - 1; i >= 0; i--) { while (upper.length > 1 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop(); upper.push(pts[i]); }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }
  var loading = null;
  function loadLeaflet(doc, win) {
    if (win.L) return Promise.resolve(win.L);
    if (loading) return loading;
    loading = new Promise(function (ok, fail) {
      var css = doc.createElement('link');
      css.rel = 'stylesheet'; css.href = LEAFLET.css; css.integrity = LEAFLET.cssSri; css.crossOrigin = 'anonymous';
      doc.head.appendChild(css);
      var s = doc.createElement('script');
      s.src = LEAFLET.js; s.integrity = LEAFLET.jsSri; s.crossOrigin = 'anonymous';
      s.onload = function () { ok(win.L); }; s.onerror = fail;
      doc.head.appendChild(s);
    });
    return loading;
  }
  function draw(L, el) {
    var small = el.clientWidth < 400;
    var map = L.map(el, { scrollWheelZoom: false, zoomControl: !small, attributionControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 15, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    var area = L.polygon(zone(), { color: '#38792f', weight: 2, dashArray: '6 6', fillColor: '#54aa47', fillOpacity: 0.18 }).addTo(map);
    TOWNS.forEach(function (t) {
      var m = L.circleMarker([t[1], t[2]], { radius: small ? 3 : 5, color: '#fff', weight: 2, fillColor: '#38792f', fillOpacity: 1 }).addTo(map);
      m.bindTooltip(t[0], small ? {} : { permanent: true, direction: 'right', offset: [6, 0], className: 'btg-zone-lbl' });
    });
    map.fitBounds(area.getBounds(), { padding: small ? [4, 4] : [12, 12] });
  }
  function sectionHtml(now) {
    return '<section class="btg-zone" id="btg-hours"><h2 class="btg-zone-h">Our Virginia service area</h2>' +
      '<p class="btg-zone-sub">Bob comes to you anywhere in the shaded area. Not sure if you’re covered? Just call.</p>' +
      '<div class="btg-zone-grid"><div class="btg-zone-map btg-zone-big" role="img" aria-label="Map of the Virginia service area: ' + TOWNS.map(function (t) { return t[0]; }).join(', ') + '"></div>' +
      '<aside class="btg-hours-card"><h3>Hours</h3><p class="btg-hours-note">Eastern Time</p>' + window.BTGHours.weekHtml(now) + '</aside></div></section>';
  }
  function init(doc, win) {
    var loc = win.location.pathname === '/contact-2/' && doc.querySelector('.btg-locations');
    if (loc && !doc.querySelector('.btg-zone')) loc.insertAdjacentHTML('afterend', sectionHtml(new Date()));
    var els = Array.prototype.slice.call(doc.querySelectorAll('.btg-zone-map'));
    if (!els.length) return false;
    var show = function (el) { if (el.getAttribute('data-drawn')) return; el.setAttribute('data-drawn', '1'); loadLeaflet(doc, win).then(function (L) { draw(L, el); }).catch(function () { el.style.display = 'none'; }); };
    if (typeof win.IntersectionObserver !== 'function') { els.forEach(show); return true; }
    var io = new win.IntersectionObserver(function (entries) { entries.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); show(e.target); } }); }, { rootMargin: '300px' });
    els.forEach(function (el) { io.observe(el); });
    return true;
  }
  return { TOWNS: TOWNS, LEAFLET: LEAFLET, zone: zone, sectionHtml: sectionHtml, init: init };
})();

// Veteran-owned badge: replaces the old flag image in the footer and sits under the About banner's Marine Corps line.
// It carries the VeteranOwnedBusiness.com logo and links to Bob's listing there, as the old image did.
window.BTGVet = (function () {
  'use strict';
  var VOB = 'https://www.veteranownedbusiness.com/business/24505/bob-the-tech-guy';
  var LOGO = 'https://cdn.jsdelivr.net/gh/JeffreySylW/bob-the-tech-guy-site@v1.7.2/dist/brand/vob-logo.png';
  var STAR = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.5 1.3 6.6L12 17.3l-5.9 3.2 1.3-6.6L2.5 9.4l6.6-.8z"/></svg>';
  function badgeHtml(dark) {
    return '<a class="btg-vet' + (dark ? ' btg-vet--dark' : '') + '" href="' + VOB + '" target="_blank" rel="noopener" aria-label="Veteran-owned business: Bob The Tech Guy on VeteranOwnedBusiness.com">' +
      '<span class="btg-vet-ico">' + STAR + '</span><span class="btg-vet-txt"><b>Veteran-Owned Business</b><small>U.S. Marine Corps veteran</small>' +
      '<span class="btg-vet-vob"><img src="' + LOGO + '" alt="VeteranOwnedBusiness.com" width="150" height="32" loading="lazy"><em>Verified member &rarr;</em></span></span></a>';
  }
  function init(doc, win) {
    var foot = doc.querySelector('.fusion-footer #text-16 .textwidget');
    if (foot && !foot.querySelector('.btg-vet')) foot.innerHTML = badgeHtml(true);
    var lede = win.location.pathname === '/about/' && doc.querySelector('section.btg-hero .btg-hero-lede');
    if (lede && !doc.querySelector('section.btg-hero .btg-vet')) {
      var p = doc.createElement('p');
      p.className = 'btg-vet-wrap';
      p.innerHTML = badgeHtml(false);
      lede.parentNode.insertBefore(p, lede.nextSibling);
    }
    return !!(foot || lede);
  }
  return { VOB: VOB, LOGO: LOGO, badgeHtml: badgeHtml, init: init };
})();


(function () {
  // Guards against the Node test environment's minimal `document` stub,
  // which has no querySelector/readyState/addEventListener — this file is
  // required directly by bundle/test/init.test.js to exercise the pure
  // BTGInit functions above without wanting this auto-run to fire.
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function' || typeof document.addEventListener !== 'function') {
    return;
  }

  // Block the footer's cryptocurrency widget script before the parser reaches it.
  if (typeof MutationObserver === 'function') {
    var cryptoWatch = new MutationObserver(function (list) {
      list.forEach(function (m) {
        Array.prototype.forEach.call(m.addedNodes, function (n) {
          if (n.tagName === 'SCRIPT' && window.BTGInit.isBlockedScript(n.src)) { n.type = 'javascript/blocked'; if (n.parentNode) n.parentNode.removeChild(n); }
        });
      });
    });
    cryptoWatch.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('load', function () { cryptoWatch.disconnect(); });
  }

  // Each enhancement runs on its own, so one failing (e.g. after a theme update)
  // never stops the others; the page itself always works without them.
  function safely(fn) { try { fn(); } catch (e) { if (window.console) console.warn('btg:', e); } }
  function run() {
    safely(function () { window.BTGInit.fixTelLinks(document); });
    safely(function () { window.BTGInit.addCtaDigits(document); });
    safely(function () { window.BTGInit.addHeroTrust(document); });
    safely(function () { window.BTGInit.addNjLine(document, window); });
    safely(function () { window.BTGInit.fixLoginMenu(document); });
    safely(function () { window.BTGInit.quietFooter(document); });
    safely(function () { window.BTGInit.removeDuplicateTitleBar(document); });
    safely(function () { window.BTGInit.removeHomeSlider(document); });
    safely(function () { window.BTGInit.injectSchemaAndMeta(document, window); });
    safely(function () { window.BTGHeader.init(document, window); });
    safely(function () { window.BTGSearch.init(document, window); });
    safely(function () { window.BTGSearch.initPage(document, window); });
    safely(function () { window.BTGAccount.init(document, window); });
    safely(function () { window.BTGBob.initHero(document, window); });
    safely(function () { window.BTGBob.initPhoto(document, window); });
    safely(function () { window.BTGInit.rewriteNjLinks(document); });
    safely(function () { window.BTGInit.blockCrypto(document); });
    safely(function () { window.BTGInit.addRequestButton(document, window); });
    safely(function () { window.BTGInit.prefillContact(document, window); });
    safely(function () { window.BTGInit.addPrivacyNote(document); });
    safely(function () { window.BTGReviews.init(document, window); });
    safely(function () { window.BTGFooter.init(document); });
    safely(function () { window.BTGHours.initPill(document, window); });
    safely(function () { window.BTGZone.init(document, window); });
    safely(function () { window.BTGVet.init(document, window); });
    // Reveals the header and page area the loader's inline style kept hidden until now.
    document.documentElement.classList.add('btg-ready');
    // Avada builds its mobile menu clone and the Twitter script adds its iframe after DOMContentLoaded.
    window.addEventListener('load', function () {
      safely(function () { window.BTGInit.fixLoginMenu(document); });
      safely(function () { window.BTGInit.quietFooter(document); });
    });
  }
  if (document.readyState !== 'loading') {
    run();
  } else {
    document.addEventListener('DOMContentLoaded', run);
  }
})();
