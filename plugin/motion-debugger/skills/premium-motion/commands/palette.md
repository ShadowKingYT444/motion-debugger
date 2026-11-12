# palette: colour, light and depth

## Decide from the world

- **Ground, ink and accent** come from the artefacts in `PREMIUM.md`: the paper of a timetable, a livery's two colours, the glaze on a kiln test tile. Saturated grounds, duotones, light grounds with dark chapters, and colour-blocked sections are all open.
- **Leave the defaults:** near-black with one amber, lime or acid accent; warm paper with a rust accent; indigo-to-purple gradients; and pale grey with hairlines and no colour at all.
- **An accent strategy, not an accent colour.** One saturated colour used only for actions; a second colour reserved for one recurring element; or colour carried by imagery while the UI stays neutral. Write it down.

## Light

Decide where the light comes from, and keep it consistent:

- Surfaces carry a soft gradient that follows that light, never a decorative rainbow.
- Shadows are layered (a tight contact shadow plus a wide soft one), tinted by the ground, and fall away from the light.
- Highlights sit on the lit edge: a 1px inner highlight on glass or metal, a specular sweep on a product.
- Grain or texture belongs only where the material has it (paper, film, stone), at 3–6% and fixed, never animated noise over everything.

## Depth

Build three planes: the background (ground, light, slow parallax), the subject (the visual and type), and the foreground (controls, captions, small elements that move faster). Overlap them. Flat rows of boxes on one plane read as a template.

## Chapter rhythm

Plan the page's colour sequence, for example light, light, dark, accent, light, dark footer. Make one turn dramatic, such as light to dark as the signature scene starts. With the kit, use `data-bg` and `data-ink` per section; with GSAP, tween the root's custom properties from a ScrollTrigger.

## Tokens

Define colours as custom properties (`--ground`, `--ink`, `--ink-2`, `--accent`, `--line`, `--surface-1`, `--surface-2`), and mix secondary inks with `color-mix()` so contrast stays predictable. Body text needs 4.5:1 and large text and UI 3:1, checked against what is actually painted, including over images.

## Verify

Run the critic: no contrast findings, and the scroll sheet shows the chapter rhythm you planned. Squint at `desktop-scroll.png`. You should see deliberate light and dark blocks, not one even tone.
