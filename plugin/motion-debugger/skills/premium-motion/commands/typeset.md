# typeset: type with a voice

## Choose

- **The display face comes from the world** in `PREMIUM.md`: the lettering on its artefacts, its era, its material. A timetable suggests a tight grotesk with tabular figures; a seed packet, a warm wood-type serif; a lacquer sleeve, a wide extended sans. Name the reason in one line.
- **The text face is quiet:** a workhorse sans or serif that sets well at 16–18px. One family in two cuts is fine.
- **Leave the defaults** unless the brief demands them: Instrument Serif, Fraunces, Playfair Display or an italic-accent serif for display; Inter, Inter Tight, Geist or Manrope for everything; and a giant plain grotesk in all caps as the only idea.
- **Prefer variable fonts** (Google Fonts or self-hosted `woff2`) so weight, width or optical size can move with motion.

## Set

| | Rule |
| --- | --- |
| Scale | Hero display at least 5× body, often 8–14vw on desktop with `clamp()`; section titles at least 2.5× body; small labels stay small |
| Tracking | Large display -0.02em to -0.05em; all-caps labels +0.06em to +0.12em; body 0 |
| Leading | Display 0.88–1.05; body 1.5–1.65; tight display leading needs room for descenders inside reveal masks |
| Measure | 45–70ch for body, and headings broken by meaning, not by the container |
| Wrap | `text-wrap: balance` on headings and `text-wrap: pretty` on paragraphs; no one-word last line in a heading |
| Figures | Tabular figures (`font-variant-numeric: tabular-nums`) for prices, data and counters; lining figures in headings |
| Detail | Real quotes and apostrophes (’ “ ”), en dashes for ranges, non-breaking spaces before units, hanging punctuation where supported |
| Colour | Body at least 4.5:1 contrast; secondary text from a mixed ink, never pale grey on a coloured ground |

## Integrate with the visual

Premium type is set *into* the scene, not beside it. It overlaps the visual, and the visual breaks through it, masks it, or sits behind it at depth. Words can be cut by the image edge. A single word can carry the hero at extreme scale.

## Load without jank

- `<link rel="preconnect">` to the font host, `font-display: swap`, and preload the display face's main cut.
- Give the fallback `size-adjust` or `ascent-override` so the swap does not reflow the headline.
- Split text for reveals only after `document.fonts.ready`, or with SplitText's `autoSplit`, so lines are measured in the real face.

## Verify

Run the critic. No `default-typeface` or `weak-hierarchy` finding, and the detail sheets show the intended face, not a fallback. Check the phone sheet: headings wrap well and nothing touches the screen edge.
