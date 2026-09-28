# Header, Logo & Search — Design

**Date:** 2026-09-27
**Status:** Approved in conversation (header A, logo B, approach 1), awaiting written-spec review
**Site:** bobthetechguy.com (WordPress + Avada, Editor access only)
**Builds on:** `2026-09-27-services-split-and-index-design.md` (v1.2.1, live on 31 pages)

## Goals

1. The top bar ("NOW SERVING…" strip and "Call Us Today! 844-TEKGUY-0 | info@bobthetechguy.com") looks identical on every bundle page.
2. Replace the low-quality logo with the new "live trace" wordmark.
3. A modern one-row header: logo left, menu center, search + call button right, sticky and slimmer on scroll, hover trace under menu items, glowing current page, Services dropdown with the three grouped panels.
4. Search that suggests Bob's pages as the visitor types.

## Constraints

- Editor access only: theme settings (logo, header layout, favicon, `<head>`) cannot be changed. Everything ships in the bundle (`dist/btg.css`, `dist/btg.js`), which loads on 31 pages.
- **Known limit:** the ~370 legacy New Jersey pages do not load the bundle and keep the old header and logo.
- **Known limit:** the bundle loads inside page content, after the header markup. On a slow connection the old header can paint briefly before the new styles apply (the existing "NOW SERVING" strip already behaves this way). No fix is possible without theme access.
- No page content changes in this phase. No copy changes except the approved new UI words: "Search", "Search all pages for", "No matching pages. Press Enter to search the whole site.", the suggestion labels SERVICE / AREA / PAGE, and "More" (fallback dropdown group, only if the menu gains a page outside the three groups).
- No street address; brand green `#54aa47` and `--btg-*` tokens; no analytics; no third-party requests.
- Respect `prefers-reduced-motion` (no pulse, no trace animation, no header shrink transition).

## Root cause of the inconsistent top bar

The rules for the top bar, the "NOW SERVING" strip (`.fusion-header-wrapper:before`) and the green Contact item (`menu-item-11810`) live in a per-page `<style>/* btg-styles */` block that only some pages carry (e.g. Testimonials, Memory Install) and others do not (About, homepage, Services index). The fix moves the header rules into `dist/btg.css`. The per-page blocks are left untouched; their header rules become redundant.

## 1. Header (layout A)

Live structure (Avada header v5): `.fusion-secondary-header` (top bar) → `.fusion-header` with `.fusion-logo` (centered) → `.fusion-secondary-main-menu` containing `nav.fusion-main-menu > ul#menu-real-menu` (with the theme's `.fusion-main-menu-search` item) → `.fusion-mobile-nav-holder`.

- **Top bar:** dark `#20241f` strip; "NOW SERVING CHESTERFIELD · MIDLOTHIAN · CHESTER · BON AIR · COLONIAL HEIGHTS · GREATER RICHMOND, VA" on the left (existing wording, from the per-page rule), existing contact info on the right, one font (PT Sans 700, 12.5px, letter-spacing .04em) on every page. On phones the strip wording is hidden and the contact line centered.
- **One row:** the script moves `nav.fusion-main-menu` into the logo row; CSS lays the row out as flex: logo left, menu center, tools right. The theme's own menu search item is hidden.
- **Logo:** the script replaces the logo `<img>` elements (standard, retina, mobile) with one inline SVG wordmark: "BOB THE" (small caps, letter-spaced), "Tech Guy" (Roboto Slab 700, "Guy" in `#38792f`), a green trace under the words ending in a pad that pulses gently. The link keeps `href` to home and `aria-label="Bob The Tech Guy — home"`. A `<link rel="icon">` with the "B + trace" icon SVG is added to `<head>`.
- **Tools (right):** a round search button (magnifier icon, `aria-label="Search"`) and a call button `tel:8448354890` showing "844-TEKGUY-0" with "(844) 835-4890" beneath (digits hidden on phones).
- **Menu items:** hover/focus draws a 2px green trace under the item (scaleX from the left, .28s); the current page item (`current-menu-item`/`current-menu-ancestor`) is bold `#38792f` with a 3px glowing trace. The special green block on Contact (`menu-item-11810`) is removed.
- **Sticky + shrink:** the header row is `position: sticky; top: 0`; after 80px of scroll a `btg-scrolled` class reduces padding and the logo width, and adds a soft shadow.
- **Services dropdown:** the theme's Services submenu is hidden on desktop and replaced by a full-width panel containing `.btg-panels` (the three groups from `tools/services-index.js`), built at runtime from the links in the real menu (`#menu-real-menu`), so WordPress menu edits keep working. Opens on hover (150ms intent delay) and on keyboard focus/Enter; closes on Escape, blur or pointer leave; `aria-expanded` on the Services link. Groups with no matching menu link are omitted; menu links not in any group are appended to a fourth "More" list so nothing disappears.
- **Phones (< 900px):** logo left; search button, call button (vanity number only) and the theme's own mobile menu button right. The theme's mobile menu keeps working, restyled with the brand green; no dropdown panels on phones.

## 2. Search

- **Open:** the search button or the `/` key (when focus is not in a field) opens a panel under the header with one field (`type="search"`, placeholder "Search"), focused.
- **Suggestions:** as the visitor types (≥ 2 characters), up to 5 pages with icon, title and label (SERVICE / AREA / PAGE). Ranking: title word starts with a query word > title contains it > keyword match; ties by list order. Matching is case- and accent-insensitive.
- **Last row:** always "Search all pages for "<query>" →", which submits to the WordPress search (`/?s=<query>`). Enter with no highlighted suggestion does the same.
- **Empty:** "No matching pages. Press Enter to search the whole site."
- **Keyboard / screen readers:** combobox pattern (`role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`; list `role="listbox"`, options `role="option"`); ↑/↓ move, Enter opens, Escape closes and returns focus to the search button.
- **The page list (29 entries):** the 15 services, the 9 Virginia town pages (AREA), and Home, About, Reviews, Testimonials, Contact (PAGE). Each entry: `title`, `url`, `type`, `icon`, `keywords`. Keywords are words that appear on that page itself (plus title words), curated by a build script `tools/search-index.js` from the saved page backups and checked in as data inside `dist/btg.js`. The build fails if any URL is not in the live menu/town list or any keyword is absent from its page's text.
- No network requests while typing; nothing is logged or sent anywhere.

## Testing

- Test-first (`node:test`) for: suggestion ranking and matching, the page-list builder (URL and keyword checks), the dropdown group builder (menu links → groups, "More" fallback), the logo SVG markup (accessible name, home link), and CSS assertions for the header rules and reduced motion.
- Browser tests (headless Edge, CDP) on a saved copy of a live page with the bundle applied, at 1440px and a mobile-emulated 390px: dropdown opens by hover and keyboard and closes on Escape; search suggests and Enter navigates; sticky + shrink on scroll; phone menu opens; no horizontal scroll.
- Consistency check: computed `font-family`, `font-size`, `font-weight` of the top bar text on About, Testimonials, Memory Install and the homepage — identical after the change (recorded before and after).

## Rollout

1. Tag v1.3.0 (CSS + JS only; no page content changes).
2. Point Memory Install's loader at v1.3.0 → public checks + desktop/phone screenshots to the user.
3. Point the other 30 bundle pages at v1.3.0 → verify all 31 publicly.
4. Rollback: point loaders back to `@v1.2.1`.
5. One independent whole-branch review.

Writes to WordPress and tag pushes need the user's OK and the session out of auto mode.
