# compose: layout, hierarchy and rhythm

## Every frame

- **One dominant element per frame.** In the first viewport it covers at least 40% of the screen: a visual with depth, the product UI at full width, or display type set into a scene.
- **Sketch three hero compositions** in one line each, then build the one least like "headline left, object right". For example: type across the full width with the visual breaking through it; a centred object with copy set around it; a full-bleed scene with a caption block; an asymmetric grid led by an oversized numeral.
- **Scale contrast.** The biggest thing is far bigger than the next. Small labels stay small.
- **No frame is mostly empty.** Whitespace frames content; half a screen of nothing reads as a loading failure.

## The page

- **Structure from content.** For each section, decide what the visitor must understand, then pick its layout: a full-bleed band, a dense index or table, an asymmetric two-column, one large statement, a gallery or track, a comparison, a demonstration. Neighbouring sections differ in layout and scale.
- **Cut and merge.** A vibe-coded page usually has too many thin sections. Three feature grids become one demonstration; a logo wall and testimonials become one proof section with a real quote at size.
- **Layering.** Let elements overlap section boundaries, captions sit on images, and visuals bleed off the edge. Strict stacked rectangles read as a template.
- **Rhythm.** Alternate dense and open, loud and quiet, light and dark (palette.md §Chapter rhythm). Plan the sequence before building.

## The grid

- One container width and one side gutter (`clamp(20px, 5vw, 64px)`) for every section; full-bleed elements break it on purpose.
- A 12-column grid on desktop, so asymmetric spans (7/5, 8/4, 5/7 with an offset) are easy; 4 columns on phones.
- Items in a column share a left edge. Never nudge an active, hovered or highlighted item sideways.
- Section padding `clamp(72px, 10vw, 160px)`. Content sections take their height from content; keep `100vh` for the hero and pinned stages.

## Verify

Run the critic: no `dead-space`, `hollow-containers`, `near-miss-alignment` or `edge-crowding`. In `desktop-scroll.png`, neighbouring sections look different from each other, and each has one obvious place to look first.
