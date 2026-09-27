# Services Cards, Centered Pages & Title-Line Removal — Design

**Date:** 2026-09-26
**Status:** Approved in conversation, awaiting written-spec review
**Site:** bobthetechguy.com (WordPress + Avada, Editor access only)
**Builds on:** `2026-09-25-town-page-cards-design.md` (v1.0.9/v1.0.10, live)

## Goals

1. Turn the walls of text on the six worst Services pages into summary cards with "Read more", matching the town pages.
2. Center every menu page's content (today the column sits left of an empty sidebar).
3. Remove the decorative double lines beside Avada section titles ("Bob The Tech Guy", "Why Choose Bob?", "What Customers Say", …), keeping the words.

## Scope

**Carded (6 WordPress pages):**

| Page | ID | Layout |
|---|---|---|
| Networking | 11981 | 3 cards |
| Anti-Virus | 11804 | 2 cards |
| Backup Solutions | 11863 | 2 cards |
| Hardware Repair & Upgrades | 11976 | 1 summary card |
| Email Setup | 11971 | 1 summary card |
| Parental Controls | 11857 | 1 summary card |

**Loader only (no content change), so centering and title-line removal reach them:** the other 8 Services subpages — Computer Set Up, Data Recovery Service, Hardware Install, Memory Install, Operating System Install, Printer Solutions, Screen Replacement, Software Installation and Configuration — plus Testimonials (a menu page not yet on the bundle). IDs are resolved by slug at run time.

**Already on the bundle:** the 15 pages from the previous phases (6 pages + 9 town posts). Total after this phase: **30 pages** load the bundle — every page reachable from the menu, plus the 9 town posts.

**Out:** the ~370 legacy New Jersey pages (search-coverage pages; the user plans a future replacement). The About page restyle.

## Constraints (carried over)

- Re-skin, don't rewrite. Allowed new or changed words: the approved hero copy, the approved card headings, "Read more", and the two corrected service names in the calls to action.
- No street address anywhere.
- Brand green stays; use `--btg-*` tokens.
- No analytics.

## Sitewide rules (bundle v1.1.0)

1. **Title lines:** `.fusion-title .title-sep-container { display: none; }` — the heading text is untouched.
2. **Centering:** Avada renders `#content` at ~71% width floated left beside `#sidebar`, which is empty on these pages. Rule: hide `#sidebar` and center `#content` at its current width (`float: none; margin-left: auto; margin-right: auto`). Only applied when the sidebar has no visible widgets, via `body.has-sidebar` pages the bundle loads on. With content centered, `centerHeroOnPage()` in `btg.js` (the v1.0.4 runtime nudge) is removed — its measured delta becomes 0 and it is dead weight.
3. **Adaptive card grid:** `.btg-cards { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }` replacing the fixed 3/2/1 breakpoints, so cards fit the narrower centered column (fixes the deferred "Chesterfield cards are cramped" minor). Full-width town posts still show 3 per row at desktop width.
4. **Checklist:** `.btg-checklist` — the same green check-mark list style used inside cards, as a standalone 2-column list (1 column below 600px).
5. **Closing CTA:** `.btg-cta-block` — centered call-to-action block.

## Hero copy (approved)

Same markup as existing heroes: `<section class="btg-hero">` with eyebrow, h1 title (bold phrase in green), lede, and `<a class="btg-hero-cta" href="tel:8448354890">844-TEKGUY-0</a>`; the bundle adds the digits and trust line.

| Page | Eyebrow | Title (`<strong>` part) | Lede |
|---|---|---|---|
| Networking | Services · Networking | Home and office networks, **done right**. | Home and small business Wi-Fi and wired networks. |
| Anti-Virus | Services · Virus Removal | Viruses and malware, **found and eliminated**. | Viruses, spyware and malware found and eliminated for good. |
| Backup Solutions | Services · Backup | On-site and **cloud-based backup**. | Automated backup, so losing a device doesn't mean losing your data. |
| Hardware Repair & Upgrades | Services · Hardware | Hardware repair **and upgrades**. | Diagnostics, tune-ups and fixes that make your computer run like new. |
| Email Setup | Services · Email | Email setup, **done right**. | Email accounts and software, set up and working. |
| Parental Controls | Services · Parental Controls | Parental controls **for your family**. | Control the content your children can reach online. |

## Card mapping (approved)

| Page | Card (h3) | Built from |
|---|---|---|
| Networking | Internet & Broadband | "For millions of residences…" ¶ |
| | Home Networking | "There are multiple ways in which your residence…" ¶ (the existing "Home Networking" subhead is replaced by the card title) |
| | Wireless Networking | "There has been a dramatic shift…" ¶ (existing "Wireless Networking" subhead replaced) |
| Anti-Virus | Today's Threats | "As computers and computer software…" ¶ |
| | Virus & Malware Removal | "Bob the Tech Guy fights viruses and malware…" ¶ |
| Backup Solutions | Why Back Up | "What's as bad as losing your wallet…" ¶ |
| | Cloud-Based Backup | "Cloud-based backup uses an Internet connection…" ¶ |
| Hardware Repair & Upgrades | Hardware Repair & Upgrades | "Many of the so-called "Big Box Stores"…" ¶ |
| Email Setup | Email Setup | "There are multiple ways in which your residence…" ¶ (copied Networking text — carded as-is, flagged to Bob) |
| Parental Controls | Parental Controls | "If you're concerned about the content…" ¶ |

Each card: title, first sentence as summary, the rest under `<details><summary>Read more</summary>`.

**Around the cards, on every carded page:**
- Networking's three "✓ …" items at the top become a `.btg-checklist` directly under the hero (✓ glyphs dropped).
- The "[Service] Services Include:" h2 stays; the fake-bullet paragraphs under it (`• …` / `* …`) become one `<ul class="btg-checklist">` (bullet glyphs dropped, words unchanged). Networking's item that wraps onto a second paragraph ("…to safeguard" / "secure your broadband signal from use by others") is merged back into one item.
- Backup's closing line ("Also, keep your data secure with…") stays after the checklist.
- The "Have any questions? Need a quote for … Services?" h3, "Call Today!" and "844-TEKGUY-0 / (862)210-5656" stay together in a `.btg-cta-block`. Label fixes: Networking → "Networking Services", Hardware Repair & Upgrades → "Hardware Repair & Upgrades Services". The (862) New Jersey number stays (dual-location business) and goes on Bob's question list.
- Empty `&nbsp;` spacer paragraphs are removed.

## Tooling

Generalize `tools/cards-transform.js` from one hard-coded town layout to **recipes**: a recipe lists a page's hero copy, cards (title + paragraph anchors), checklist sources, CTA fixes and removable elements. The town recipe keeps today's behaviour (its tests must stay green). Fail-loud rules are unchanged: every top-level element must be claimed or `transform()` throws.

**Raw format is unknown until the snapshot.** The public HTML shows Avada markup (`fusion-*` divs) around these pages' text; if the raw content is Fusion Builder shortcodes, the recipe works inside the shortcode's text and leaves shortcode wrappers intact, or the plan stops and asks if that is not possible cleanly.

## Safety checks (verify, tightened)

1. **Sentence conservation:** the list of sentences in every `<p>`/`<li>` of the input equals the output's, except: allowed additions (hero copy, card titles, "Read more", the two corrected service names) and removed items (replaced subheads, `&nbsp;` spacers, bullet glyphs). Catches drops, duplicates, reordering and edits — not just word counts.
2. **Card membership:** each card's text begins with its first anchor sentence.
3. **No hidden text:** no `hidden` or `style` attribute inside `.btg-cards`.
4. **Address check** as before.
5. **Structure:** the recipe's card count, each with title, summary and Read more.

## Rollout

1. Bundle **v1.1.0** (rules above; remove `centerHeroOnPage`). Tag and push.
2. Snapshot raw HTML of all 30 pages to `backups/2026-09-26/` via one user-approved download.
3. Transform + save **Networking** first; verify the live page (structure check + screenshots).
4. The other 5 carded pages.
5. Add the loader to the 9 loader-only pages.
6. Bump every loader to v1.1.0; verify all 30 pages publicly (bundle version, centered column, no title lines, cards where expected).

Live writes need the session out of auto mode. Rollback: `backups/2026-09-26/` or WordPress revisions.

## For Bob (not changed here)

- Email Setup's body text is the Networking text; he should supply real Email Setup copy (it drops into the existing card).
- Confirm the (862) 210-5656 New Jersey number should stay on Virginia-facing pages.
