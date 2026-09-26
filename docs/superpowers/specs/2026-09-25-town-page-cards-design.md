# Town Page Cards — Design

**Date:** 2026-09-25
**Status:** Approved 2026-09-25; amended same day after inspecting raw markup (hero button already present; no leading phone number in paragraphs)
**Site:** bobthetechguy.com (WordPress + Avada, Editor access only)

## Goal

Make the 9 Virginia town pages scannable and attractive instead of overwhelming, especially on phones, by turning their "walls of text" into summary cards with "Read more" expanders. All existing text stays on the page for local SEO.

## Scope

**In:** the Chesterfield page and the 8 town pages. All 9 are WordPress **posts** stored as plain HTML (no Avada shortcodes, no blocks):

| Post ID | Slug |
|---|---|
| 28867 | best-computer-repair-chesterfield-va |
| 28872 | pc-repair-service-midlothian-virginia |
| 28873 | pc-repair-service-chester-virginia |
| 28874 | pc-repair-service-bon-air-virginia |
| 28875 | pc-repair-service-brandermill-virginia |
| 28876 | pc-repair-service-woodlake-virginia |
| 28877 | pc-repair-service-moseley-virginia |
| 28878 | pc-repair-service-colonial-heights-virginia |
| 28879 | pc-repair-service-richmond-virginia |

**Out:** Home, About, Reviews, Testimonials, the 14 Services subpages. After this ships, a **read-only sweep** of those pages will report the remaining walls of text and recommend where the card pattern applies (see Follow-up).

## Constraints

- Re-skin, don't rewrite: no words added, removed or changed except the 6 card headings and the "Read more" label. Moving and splitting existing text is allowed.
- No street address anywhere (Bob's listed address is a UPS Store mailbox).
- Brand green stays the accent color; use existing `--btg-*` tokens.
- No analytics or tracking.
- Visible look must match the approved mockup (Chester, 2026-09-25): 3-column card grid on desktop, 1 column on phones, light card with green top border, green icon tile, Roboto Slab title, first-sentence summary, green "Read more +".

## Content mapping (identical on all 9 posts)

Measured 2026-09-25: every anchor below exists exactly once in each post's body. The Chesterfield post has one extra networking paragraph ("There are multiple ways…").

| Card (h3) | Icon | Built from, in order |
|---|---|---|
| Virus & Malware Removal | shield | "Computers and the threats…" ¶, "…fights viruses and malware…" ¶, the checklist after it (9 items) |
| New Computer Setup | laptop | "So you have a new computer…" ¶, the checklist after it (12 items) |
| Internet & Home Wi-Fi | wifi | "Whether your home internet…" ¶ |
| Home & Small-Office Networks | network | "When asked to set up a shared…" ¶, "There are multiple ways…" ¶ (Chesterfield only), "The way homes and small businesses…" ¶ |
| Tune-Ups & Maintenance | gauge | "Your computer, like any machine…" ¶ |
| Data Recovery | drive | "Have you lost your data…" ¶, the checklist after it (6 items) |

- **Summary:** the first sentence of the card's first paragraph, moved out of that paragraph (each sentence appears exactly once).
- **Removed:** subheadings the card titles replace — the repeated "PC Repair Service [Town] Virginia" h3s inside the body, "Internet, Home & Wireless Networking", "Home Networking", "Wireless Networking" (Chesterfield's equivalents: "Best Computer Repair Chesterfield VA", "New Computer Setup", "Internet, Home & Wireless Networking", "Home Networking", "Wireless Networking", "Tune-Ups & Data Recovery").
- **Moved:** the two paragraphs `<p><strong>Have any questions? … Call Today!</strong></p><p><strong>844-TEKGUY-0</strong></p>` (they currently sit between the two virus paragraphs) go directly after the grid, wrapped in `<div class="btg-cards-cta">`, unchanged inside.
- **Unchanged:** the hero `<section class="btg-hero">…</section>` byte-for-byte (it already contains the call button — verified rendering 151×66px on the live Chester page), the "Proudly Serving [Town]…" paragraph with its zip codes, the loader `<link>`/`<script>` lines.

## Markup (saved in post content)

```html
<div class="btg-cards"><article class="btg-card btg-card--shield"><h3 class="btg-card-title">Virus &amp; Malware Removal</h3><p class="btg-card-summary">…first sentence…</p><details><summary>Read more</summary><p>…rest of paragraph…</p><p>…</p><ul>…</ul></details></article>…5 more…</div>
<div class="btg-cards-cta"><p><strong>Have any questions? … Call Today!</strong></p><p><strong>844-TEKGUY-0</strong></p></div>
```

- Written with **no blank lines inside the grid** so WordPress's `wpautop` does not inject stray `<p>`/`<br>` tags.
- `<details>`/`<summary>`: native, keyboard and screen-reader accessible, no JavaScript; collapsed text is indexed.
- Card titles are h3, keeping the post's order: h1 (hero) → h3.
- Icons are not in the markup; CSS draws them from the `btg-card--<icon>` modifier.

## Styling (bundle v1.0.9, `dist/btg.css`)

- `.btg-cards`: grid, 3 columns; 2 below 900px; 1 below 600px; `align-items: start` so an open card does not stretch its row; gap `--btg-space-4`.
- `.btg-card`: `--btg-card-bg` background, `--btg-card-border` border, 3px `--btg-green` top border, `--btg-radius-md`.
- Icon: `::before` on `.btg-card`, 34px tile, inline SVG data URI stroked in `--btg-green-link`, tile background a light green.
- `.btg-card-title`: `--btg-font-head`, 19px, `--btg-text`.
- `.btg-card-summary` and body text: `--btg-text-muted`, 14–15px, line-height 1.55.
- `summary`: `--btg-green-link` (AA-safe), bold, custom "+"/"–" marker, default marker hidden, visible `:focus-visible` outline.
- Checklists inside cards: green check-mark bullets instead of discs.
- `.btg-cards-cta`: centered block under the grid.
- Posts with a hero: hide the duplicate post title `h2.entry-title` and the Previous/Next `.single-navigation` (`body.single-post:has(.btg-hero) …`). The `.fusion-page-title-bar` is already removed by `removeDuplicateTitleBar` in `btg.js`.

## Transform tool (`tools/cards-transform.js`)

Pure function `transform(html, { town }) → html`, plus a CLI that reads/writes files. Run in Node against saved copies; nothing writes to the site.

- Locates each anchor paragraph and the list that follows it by text, not position.
- **Fails loudly** (throws, no partial output) if any anchor is missing, found twice, or if unexpected elements sit between mapped elements.

## Safety checks (all must pass before any save)

1. **Word conservation:** the multiset of words in the output equals the input's, minus the removed subheadings, plus only the allowed additions (6 card titles, "Read more").
2. **Protected content identical:** hero section, "Proudly Serving" paragraph, loader lines — byte-for-byte.
3. **Address check:** output contains no street-address pattern (number + street name + suffix such as St/Rd/Ave/Dr/Ln/Pkwy/Hwy/Tpke). Word conservation already guarantees no new text, so this is a second guard.
4. **Structure:** exactly 6 `.btg-card`, each with one h3, one summary, one `<details>`.

## Testing (TDD, `node --test`)

- Fixtures: saved raw HTML of Chester (28873) and Chesterfield (28867).
- Tests for every safety check above, the card mapping order, idempotence (running on already-transformed HTML throws or no-ops — never double-wraps), and missing-anchor failure.
- CSS test: grid breakpoints, `align-items: start`, summary color token.

## Rollout

1. Ship bundle **v1.0.9** (card CSS + title-bar hide). Harmless before any post uses the classes.
2. Back up each post's current raw HTML to `backups/2026-09-25/<id>.html` in the repo. The browser extension will not return raw post HTML to the session, so this is one user-approved browser download (`bob-posts-raw-2026-09-25.json`, ~80 KB) moved into the repo; the Chester and Chesterfield entries also become the test fixtures. The transform itself runs in the browser on the live raw HTML (same code, loaded from the tagged repo), with all safety checks enforced before each save.
3. Transform + save **Chester (28873) only**. Verify the live page on desktop and phone: grid, expanders, no stray `<p>`, call button, title bar hidden.
4. If Chester passes, transform + save the other 8; verify each publicly.
5. Bump all 15 loaders to v1.0.9 (existing scripted step).

Live writes (steps 1, 3, 4, 5) require the session to be out of auto mode.

**Rollback:** restore from `backups/` or the WordPress revision.

## Follow-up (after rollout)

Read-only sweep of all remaining pages, reporting walls of text (>60-word blocks) and where cards apply. Measured 2026-09-25 as a starting point: Networking (881 words, 3 walls), About (4), Anti-Virus (2), Backup Solutions (2), Reviews (2), Testimonials (2), and single walls on several Services subpages.

## Amendment (implementation, 2026-09-25)

Post 28867 (Chesterfield) is stored as block-editor content (`<!-- wp:… -->` delimiters); the other 8 are classic HTML. On block-editor posts the transform drops the block delimiters inside the regrouped region (including nested `wp:list-item` ones), keeps the "Proudly Serving" heading's own block opener, and wraps the grid + CTA in one `<!-- wp:html -->…<!-- /wp:html -->` Custom HTML block so the editor sees valid blocks. Delimiters render nothing, so visible output is unaffected. Classic posts get no block comments.
