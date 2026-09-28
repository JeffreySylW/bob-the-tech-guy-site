# Homepage Rebuild — Design

**Date:** 2026-09-28
**Status:** Approved (approach 1 chosen by the user; the user pre-approved all further changes and merges for this session)
**Site:** bobthetechguy.com, homepage = page 2318

## Goal

Bring the homepage body below the hero into the bundle's card system, like the rest of the redesigned site, without rewriting any of Bob's words.

## Layout (top to bottom, same order as today)

1. **Announcement** — the "Now Open in Chesterfield, Virginia!" tagline box becomes one green-tinted link card (title, description, its existing "Learn More" button text) to the Chesterfield page.
2. **Services** — "Bob The Tech Guy" (was an extra `h1`, now a small kicker) + "Check Out Our Services" heading; the four buttons with their one-line descriptions become four link cards with icons (2×2 from 600px).
3. **Why Choose Bob?** — the four content boxes become four even cards with the same icons (flag, wrench, star, home).
4. **What Customers Say** — rating line, all six testimonials as quote cards in two/three columns (Bob's reply to Robert kept as a quoted reply), "Read all of our customer reviews »".
5. **About** — the bold "Certified Computer Repair Services…" paragraph beside the three SEO paragraphs (stacked on phones).
6. **Call to action** — the "Need Computer Repair Services? Need A Quote?" tagline box becomes a dark band with its "Call Now" button (`tel:844-TEKGUY-0`).
7. **Badges** — the veteran badge image, centered.

The page ends up with one `h1` (the hero) instead of four.

## Rules

- No new visible words: every text comes from the current page (including the tagline boxes' button labels "Learn More" and "Call Now"). Icons are decorative CSS.
- Hero and loader tail byte-identical.
- `tools/home-rebuild.js` parses the builder shortcodes and throws on anything it cannot map; `verifyHomeRebuild()` requires the visible text (in reading order), links, and images to match the original exactly, no hidden/styled elements, no leftover shortcodes, one `h1`.
- Styles ship as bundle v1.4.0 (`/* v1.4.0 */` block): cards 1 column on phones, 2×2 from 600px; quotes in CSS columns; reduced motion removes the hover lift.

## Rollout

Back up page 2318's raw content, dry run (build + verify on live content), save, check public HTML and screenshots at desktop and phone, then pin all bundle pages to v1.4.0. Rollback: re-save the backup.
