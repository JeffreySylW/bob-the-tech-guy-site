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

                    return { removeDuplicateTitleBar: removeDuplicateTitleBar, injectSchemaAndMeta: injectSchemaAndMeta };
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
           window.BTGInit.removeDuplicateTitleBar(document);
           window.BTGInit.injectSchemaAndMeta(document, window);
   }
      if (document.readyState !== 'loading') {
              run();
      } else {
              document.addEventListener('DOMContentLoaded', run);
      }
})();
