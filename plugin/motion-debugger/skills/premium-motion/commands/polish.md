# polish: the finish pass

Run the critic, open `craft.png` first, and fix every outlined defect. Then go through this list.

## Space and edges

- Spacing tokens on a 4/8 base, used everywhere; no one-off margins.
- One container and one gutter; columns share edges; nothing a few pixels off.
- Copy never closer than 20px to the screen edge outside deliberate full-bleed tracks.

## Boxes

- Bordered or filled boxes are sized to their content; no fixed heights that leave an empty band.
- In a row of cards, pin actions to the bottom with flex so equal heights look deliberate.
- A device or browser mockup shows a complete screen from top to bottom.

## Controls

- Buttons side by side share height and padding; tap targets are at least 44px.
- One radius scale (for example 4/10/20/999) used everywhere.
- Hover shows in a still (two properties change); press compresses; focus is visible.

## Every state finished

- Nothing faint: inactive items at 0.45 opacity or more, or a mixed ink at 3:1.
- No counter showing 0, no heading caught mid-mask, no image half-revealed in any still.
- The nav is visible from the first frame, and the hero is not blank before fonts load.
- Empty, loading and error states for anything interactive (forms, live demos).

## Type and code

- No one-word last line in headings; real quotes and dashes; tabular figures for data.
- Code blocks use line-height 1.6, no blank line between every line, and no clipping at the panel edge.

## Details

- `::selection` in the palette; the scrollbar is not a jarring default on dark pages; favicon and `<title>` set; `theme-color` meta for mobile browsers.
- No console errors or 404s for assets.

## Verify

The critic reports no blocker or major findings, and `craft.png` is empty. Look at every detail frame once more for anything faint, empty, mid-animation or misaligned.
