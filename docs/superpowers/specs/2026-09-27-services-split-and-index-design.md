# Small Services Pages, Services Index & Homepage Reorder — Design

**Date:** 2026-09-27
**Status:** Approved in conversation, awaiting written-spec review
**Site:** bobthetechguy.com (WordPress + Avada, Editor access only)
**Builds on:** `2026-09-26-services-cards-and-centering-design.md` (v1.1.1, live on 30 pages)

## Goals

1. Give the 9 small Services pages the dark hero and a livelier "split" layout instead of bare fake-bullet lines.
2. Rebuild the Services index (`/services-2/`) so it lists **all 15** services as grouped cards that fit on one screen.
3. Ship the homepage reorder prepared on 2026-09-25 (SEO paragraphs above the "Need a Quote?" box, "Services" button → "All Services").

## Scope

| Item | Change |
|---|---|
| Computer Set Up, Computer Tune Up, Data Recovery Service, Hardware Install, Memory Install, Operating System Install, Printer Solutions, Screen Replacement, Software Installation and Configuration | Hero + split layout (IDs resolved by slug at run time) |
| Services index `/services-2/` (page 11653) | Three group panels replace the 10 `<h1>` links |
| Homepage (page 2) | Paragraph reorder + button label |
| Bundle | v1.2.0: `.btg-split`, `.btg-include-card`, `.btg-note`, `.btg-panels` styles; loader pin bumped on all 30 bundle pages |

**Out:** the logo (next project), the ~370 legacy New Jersey pages, SSL (Bob's hosting).

## Constraints (carried over)

- Re-skin, don't rewrite. New words allowed in this phase: the approved hero lines below, the three group names, and "All" on the homepage button. Moving text is allowed.
- No street address anywhere.
- Brand green stays; use `--btg-*` tokens.
- No analytics.

## 1. Small Services pages (layout B, "split")

Current content of every page: 1–2 intro paragraphs, an `h2` "[Service] Services Include:", fake-bullet paragraphs (`• …` or `* …`), then "Have any questions? Need a quote for … ? Call Today!" with `844-TEKGUY-0 / (862)210-5656`, then the per-page `<style>/* btg-styles */` block.

New structure:

1. `<section class="btg-hero">` — eyebrow, title (bold part in `<strong>`, green), lede, `tel:8448354890` CTA; the bundle adds the digits and trust line (same markup as v1.1).
2. `<div class="btg-split">`
   - left: Bob's intro paragraph(s), unchanged.
   - right: `<div class="btg-include-card">` containing the existing h2 (unchanged) and one `<ul class="btg-checklist">` built from the fake bullets (glyphs dropped, words unchanged).
3. Text that follows the list but is not the CTA (only Software Installation: "Bob the Tech Guy also provides hands-on software training…") → `<p class="btg-note">` under the split.
4. The closing question/"Call Today!"/numbers → the existing `.btg-cta-block`.

**Long lists:** when the list has more than 8 items (Computer Set Up 14, Computer Tune Up 12) the split becomes stacked: paragraph full width, include card full width below it with a 2-column checklist (`.btg-split--stacked`).

**Responsive:** `.btg-split` is a 2-column grid (≈1.3fr / 1fr) from 768px; below that it stacks, paragraph first.

**Screen Replacement** keeps its in-text "862 210 5656" exactly as written.

### Hero copy (approved)

| Page | Eyebrow | Title (`<strong>` part) | Lede |
|---|---|---|---|
| Computer Set Up | Services · Setup | New computer, **set up right**. | Updates, accounts, programs and connections, ready from day one. |
| Computer Tune Up | Services · Tune Up | A tune-up that makes it **run like new**. | Cleanup, updates and dust removal for a faster PC or Mac. |
| Data Recovery Service | Services · Data Recovery | Lost files, **brought back**. | Recovery from deleted, corrupted or failed drives. |
| Hardware Install | Services · Hardware | New hardware, **installed and tested**. | Graphics cards, drives, webcams and more, installed and working together. |
| Memory Install | Services · Memory | Memory upgrades that **speed things up**. | More RAM so your computer boots, opens programs and multitasks faster. |
| Operating System Install | Services · Operating System | Windows, Mac or Linux, **installed cleanly**. | A fresh operating system, updated and tuned. |
| Printer Solutions | Services · Printers | Printers, **back to printing**. | New printer setup, and fixes for the one that stopped working. |
| Screen Replacement | Services · Screen Repair | Broken laptop screen? **Replaced.** | Screen replacement for PC and Mac laptops. |
| Software Installation and Configuration | Services · Software | Your software, **installed and set up**. | Programs for work and play, installed and configured the way you like. |

## 2. Services index (layout A, "group panels")

Kept as-is: the existing hero and the paragraphs "Bob the Tech Guy provide a wide range of quality computer repair services." and "Have a question? Contact us today 844-TEKGUY-0 / (862)210-5656".

Replaced: the 10 `<h1 class="entry-title"><strong><a …>` links → `<div class="btg-panels">` with three `.btg-panel` cards. Each panel: an `h2` group name, then a list of links, each row = icon + the page's own title + "›".

| Group | Services (in order) |
|---|---|
| Repairs & Upgrades | Hardware Repair & Upgrades, Screen Replacement, Memory Install, Hardware Install, Computer Tune Up, Data Recovery Service |
| Setup & Software | Computer Set Up, Operating System Install, Software Installation and Configuration, Printer Solutions, Email Setup |
| Security & Networking | Networking, Anti-Virus, Backup Solutions, Parental Controls |

- Names and URLs come from the live menu's Services submenu at build time. The build stops if the menu does not contain exactly these 15 pages. "Laptop Screen Replacement" becomes "Screen Replacement" (the page's title).
- Grid: 3 columns ≥ 1000px, 2 columns ≥ 640px, 1 below.
- Icons: inline SVG from the bundle's existing icon set, adding any missing ones (chip, plug, screen, printer, box, window, drive).
- Result: one `h1` on the page instead of 11.

## 3. Homepage

The edit prepared on 2026-09-25, unchanged:

- Move the two SEO paragraphs and the bold "Certified Computer Repair Services…" paragraph above the "Need a Quote?" tagline box.
- Rename the "Services" button to "All Services" (it links to `/services-2/`).
- Check before saving: the new content has exactly the same characters as the old, reordered, plus "All ".

## Testing

- Test-first for: fake-bullet parsing (`•` and `*`), hero insertion, split and stacked variants, the trailing note, the index panel builder (including the "menu mismatch → stop" case), and the homepage reorder.
- **Content checker** (extends `verifyService`) on every changed page: each original sentence appears exactly once and in order, nothing hidden, links and `tel:` numbers intact, no street address, and the only added words are the approved hero lines / group names / "All".
- **Dry run:** transform all 11 pages from live content without saving; review output.
- **Live check:** public HTML check plus desktop (1440) and phone (390, mobile-emulated) screenshots of every changed page.
- Independent code review before calling it done.

## Rollout

1. Back up the raw content of all 11 pages to `backups/2026-09-27/`.
2. Tag and push bundle v1.2.0 (new styles only; existing pages unaffected until their loader is bumped).
3. Memory Install first → live check at both widths.
4. The other 8 small pages → live check.
5. Services index → live check. Homepage → live check.
6. Bump the loader pin to `@v1.2.0` on all 30 bundle pages.
7. Rollback: restore a page from its backup; revert the loader pin to `@v1.1.1`.

Writes to WordPress and tag pushes need the user to switch out of auto mode, as in earlier phases.
