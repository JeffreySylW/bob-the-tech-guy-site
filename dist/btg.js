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
