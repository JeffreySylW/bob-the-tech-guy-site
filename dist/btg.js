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

  // Re-centers the hero horizontally on the true page/viewport width. Every
  // in-scope page uses the Avada theme's default "content + sidebar" page
  // layout (a #content column floated left inside a centered .fusion-row,
  // with a #sidebar widget column — a near-invisible Facebook Like Box
  // widget — floated to its right). Because .btg-hero renders inside
  // #content > .post-content, it's only ever centered *within that
  // narrower, left-shifted column*, not on the page as a whole — confirmed
  // live via getBoundingClientRect, ~168px off-center on a 1536px-wide
  // viewport. Rather than hardcode the theme's column percentages in CSS
  // (which vary by breakpoint and could change with a theme update — Avada
  // collapses to a single, full-width column below its own breakpoint,
  // where no correction is needed at all), this measures the hero's
  // actual rendered position and nudges it into place with a transform.
  // A margin-left adjustment was tried first and rejected: .btg-hero has
  // no explicit width (width: auto), so increasing margin-left just eats
  // into the box's own auto-computed width instead of moving it — the
  // right edge stays pinned to the container and the box never reaches
  // center. transform: translateX() shifts the painted box without
  // touching the box model at all, so it moves by exactly the computed
  // delta. The transform is reset before each measurement so the delta is
  // always computed from the true static (untransformed) position, making
  // this safe to re-run on resize without compounding.
  function centerHeroOnPage(doc, win) {
    var hero = doc.querySelector('.btg-hero');
    if (!hero) return false;

    function recenter() {
      hero.style.transform = 'none';
      var rect = hero.getBoundingClientRect();
      var heroCenter = rect.left + rect.width / 2;
      var pageCenter = win.innerWidth / 2;
      var delta = pageCenter - heroCenter;
      hero.style.transform = Math.abs(delta) > 0.5 ? 'translateX(' + delta + 'px)' : 'none';
    }

    recenter();
    win.addEventListener('resize', recenter);
    return true;
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

  return {
    addCtaDigits: addCtaDigits,
    fixTelLinks: fixTelLinks,
    removeDuplicateTitleBar: removeDuplicateTitleBar,
    removeHomeSlider: removeHomeSlider,
    centerHeroOnPage: centerHeroOnPage,
    injectSchemaAndMeta: injectSchemaAndMeta,
  };
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
    window.BTGInit.removeDuplicateTitleBar(document);
    window.BTGInit.removeHomeSlider(document);
    window.BTGInit.centerHeroOnPage(document, window);
    window.BTGInit.injectSchemaAndMeta(document, window);
  }
  if (document.readyState !== 'loading') {
    run();
  } else {
    document.addEventListener('DOMContentLoaded', run);
  }
})();
