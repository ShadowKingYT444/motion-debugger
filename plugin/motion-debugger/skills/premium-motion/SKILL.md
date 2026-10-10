---
name: premium-motion
description: Build or upgrade a web page or site so it looks art-directed and finished rather than like the default AI template, and moves with choreographed, scroll-linked motion. Covers direction from the brief, composition, a finish system, motion, and a real-browser critique loop (`motion-debugger critique`) whose annotated frames point at dead space, hollow cards, overlapping text and misalignment. Use for landing pages, marketing sites, portfolios, product pages and UI where visual quality and animation matter.
---

# Premium pages: direct, compose, build, look, finish

This file covers design, finish and the critique loop. [TASTE.md](TASTE.md) covers motion: personality, the signature scene and the motion score. Read both before you write code.

## 0. Your defaults are the template

Left alone, you build the same page every other coding agent builds:

- A headline in Instrument Serif or Fraunces with one italic accent word in the accent colour; body in Inter, Inter Tight, Manrope or Geist; tiny uppercase mono labels.
- A near-black (#0A0908 to #0E1111) or warm-paper (#ECE6DA to #F5F3EE) ground, one amber, gold, rust or lime accent, and a grain overlay.
- An eyebrow "Product · City" with a dot, a headline flush left in the left half, a pill button plus an arrow link, a row of three stats, one object on the right, and empty right and lower thirds.
- Then an italic marquee, a large serif manifesto, a four-step pinned stepper with dimmed steps, a hairline bento grid, testimonial cards, three-tier pricing with a dark "Most popular" card, and a giant footer wordmark.
- Copy built from fragment pairs ("Four parts. No seams."), "quiet", "plainly", "Nothing it doesn't."
- The obvious noun as the hero visual: tree rings for timber, a moon for sleep, a glowing ring for a speaker, a code panel for an API.

Clients and juries read this as a template, and two agents given the same brief ship the same page. Before designing, write your first-instinct direction in one line. Then **change at least four** of: display typeface, ground colour, accent strategy, hero composition, component shapes, section structure, hero visual. Keep a default only when you can name a reason specific to this brief.

## 1. Direction (write it in a comment at the top of the CSS before any layout)

1. **Audience and feeling.** Then name one way this brand should feel *unlike* its category.
2. **Three artefacts from the subject's world**: things a practitioner would recognise, such as a document, an instrument, a tool, a place or a piece of printed matter (a railway timetable, a seed packet, a climbing route topo, a race-car livery). Take one typographic, one colour and one layout decision from them, and note which artefact each came from.
3. **Concept**: one idea the visuals and motion share, grown from those artefacts. Write down the obvious motif for the brief's nouns, then do not use it as the hero visual.
4. **Type**: a display face and a text face (or one family in two cuts) chosen to match the artefacts, from Google Fonts or the system stack. The families in §0 need a brief-specific reason. Display type at 12–25vw is available when the composition is built for it. Check in the critique frames that the face actually rendered and is not a fallback.
5. **Colour**: ground, ink and an accent strategy taken from the artefacts. Light grounds, saturated grounds, duotones and colour-blocked chapters are all open. Near-black with one warm accent is the default you are moving away from.
6. **Voice**: headlines come from facts in the brief: names, numbers, materials, places, actions. Avoid the tics in §0. Label invented figures as illustrative.

## 2. Composition

- **One dominant element per frame.** In the first viewport it covers at least 40% of the screen: display-scale type, a full-bleed visual, or the product UI at full width. Sketch three hero compositions in one line each (for example: type across the full width with the visual breaking through it; a centred object with copy set around it; an asymmetric grid led by oversized numerals; a full-bleed scene with a caption block). Build the one least like "headline left, object right".
- **Scale contrast.** The hero headline is at least 5× body size; section titles at least 2.5×. Small labels stay small.
- **Structure from content.** Decide what each section must make the visitor understand, then pick its layout: a full-bleed band, a dense index or table, an asymmetric two-column, one large statement, a gallery, a comparison. Neighbouring sections differ in layout or scale. A page needs no marquee, bento grid or three pricing cards unless the content asks for them.
- **Real, specific visuals.** Build product UI in HTML/CSS with plausible data, SVG drawings and diagrams, canvas scenes, CSS-composed objects, illustration. Several rich, specific visuals beat one object floating in an empty half-screen.
- **No frame is mostly empty.** Whitespace frames content; half a screen of nothing reads as a loading failure.

## 3. Finish system (what separates finished from sloppy)

- **Space.** Tokens on a 4/8 base. Section padding `clamp(64px, 9vw, 128px)`. Content sections take their height from content; keep `min-height: 100vh` for the hero and pinned stages only.
- **Edges.** One container and one side gutter (`clamp(20px, 5vw, 64px)`) for every section. Items in a column share a left edge. Never nudge an active, hovered or highlighted item sideways; mark it with colour, weight or an indicator.
- **Boxes.** A bordered or filled box is sized to its content: no fixed heights that leave an empty band. In a row of cards, pin actions to the bottom with flex so equal heights look deliberate. A device mockup shows a complete screen from top to bottom.
- **Type.** `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs, measure 45–70ch, no single-word last line in a heading. Code blocks use line-height 1.6 with no blank line between lines.
- **Controls.** Buttons side by side share height and padding; tap targets are at least 44px; one radius scale (for example 6/12/20/999) used everywhere.
- **Hover you can see in a still.** Each control changes at least two of: fill, text colour, border, icon position. A 2px lift or a soft glow alone does not count. The kit's `.mk-wipe` gives a fill wipe; links grow a full underline; cards change surface colour, not just shadow.
- **Every state finished.** Nothing faint (inactive items at least 0.45 opacity, or a colour-mixed ink with 3:1 contrast), no counter showing 0, no italic accent lost, the nav visible from the first frame.
- **Mobile is its own layout** at 390px, not desktop squeezed: shorter pins or none, no sticky panel over copy, headings that wrap well, gutters of at least 20px.

## 4. Motion

Use tokens (copy `assets/motion-kit.css` or define your own):

| Use | Duration | Easing |
| --- | --- | --- |
| Hover / press / toggle | 140–220ms | `cubic-bezier(.22,1,.36,1)`; press scale .97 at 80ms |
| Menus, tabs, small layout | 240–360ms | `cubic-bezier(.22,1,.36,1)` |
| Content reveal | 600–900ms | `cubic-bezier(.16,1,.3,1)` (expo-out) |
| Hero / signature | 900–1400ms | expo-out; overlap pieces |
| On-screen move / morph | 400–700ms | `cubic-bezier(.65,0,.35,1)` |
| Exit | 60–70% of the entrance | ease-in |
| Ambient loop / marquee / scrub | long | `linear` (the only place linear belongs) |

- **Choreograph the hero.** The headline lands first (split into lines or words rising out of masks, 60–110ms stagger), then sub-copy, CTAs and any stats, with the visual on its own track. Nothing appears before the headline. Start within 100ms of first paint and settle by about 1.6s. The nav is visible from the first frame.
- **Stagger groups** 50–90ms apart in reading order. Never animate twelve things identically at once.
- **Scroll is a timeline.** One signature scene where scroll progress drives transforms (TASTE.md §2), finished so that a still at any scroll position looks designed.
- **Vary reveals by content.** Titles rise from masks, images clip-reveal with a slight scale-down, numbers count, diagrams draw, cards rise. Content in view settles within about 900ms.
- **Physical and interruptible.** Transitions for state so reversals are smooth, springs for drag and follow, never block input.
- **Performance.** Animate `transform`, `opacity`, `clip-path` (and `filter` sparingly). One rAF loop for scroll work, passive listeners, IntersectionObserver for triggers. No scroll-jacking.
- **Reduced motion** keeps content and colour or opacity changes and removes travel, parallax, scrub and loops.
- **Robustness.** Hide reveal targets only after JS runs, use a low IntersectionObserver threshold (≤0.15), and reveal anything already scrolled past. Content that never appears is the most common agent bug.

## 5. Building blocks

`assets/motion-kit.js` + `assets/motion-kit.css` give data-attribute primitives:

| Layer | Attributes |
| --- | --- |
| Entrances | `data-reveal`, `data-stagger`, `data-split` (keeps `<em>`, `<strong>`, `<br>`), `data-scramble`, `data-count`, `svg[data-draw]` |
| Scroll scenes | `data-progress` (sets `--p` for sticky storytelling), `data-hscroll` + `data-hscroll-track`, `data-stack`, `data-expand`, `data-exit`, `data-read`, `data-draw="scrub"`, `data-parallax` |
| Chapters | `data-bg` / `data-ink` on sections cross-fade the page colours; keep those sections' own backgrounds transparent |
| Pointer, nav, hover | `data-magnetic`, `data-spotlight`, `data-tilt`, `data-marquee` (wrap in `.mk-marquee-wrap` to lean with `--velocity`), `data-nav`, `.mk-wipe`, `.mk-link`, `.mk-button` |

- Put the heading inside the `data-hscroll` stage so it stays pinned with the track. Stack cards need a solid background. Do not put `data-reveal` on `data-hscroll` slides or `data-stack` cards; the scene is their motion.
- Write a counter's final value in the HTML; the kit shows a starting value (60% of the end, or `data-count-from`) until it runs, so frames never show 0.
- Every primitive falls back to a readable static layout under reduced motion, and the horizontal track becomes a native swipe row on phones.
- Copy the kit into the project, or reimplement it in the project's framework. If the project already uses Motion, GSAP or Lenis, use that with the same tokens and rules. `references/patterns.md` has complete code for bespoke moments.

## 6. Look: the critique loop (required)

You cannot judge a page from source. Render it:

```bash
motion-debugger critique ./path/to/site        # folder with index.html, or an .html file
motion-debugger critique http://127.0.0.1:5173 # a running local dev server
# not on PATH? → npx motion-debugger critique …   (or node <install>/build/cli/index.js critique …)
```

It records the page in Chromium at desktop (1440×900) and mobile (390×844): the entrance, a full scroll, hovers, keyboard focus and reduced motion. It prints findings with fixes and writes images. **Open every image** with your image or file viewer, in this order:

1. **`craft.png`**: finish defects measured in the real frames, each outlined on a crop: overlapping text, copy under a sticky panel, half-empty boxes, mostly-empty screens, near-miss alignment, copy against the screen edge, double-spaced code, mismatched buttons, orphaned heading words. Fix every one.
2. **`desktop-detail-*.png` and `mobile.png`**: read them as a design director and answer, frame by frame:
   1. Does it have one dominant element?
   2. Is more than a third of it empty?
   3. Do text blocks share edges, or does something look nudged?
   4. Is anything mid-animation, faint, empty or showing 0?
   5. Cover the logo. Could this frame be the template in §0, or any other site?

   Fix every yes to questions 2–5.
3. **`desktop-entrance.png`, `desktop-scroll.png`, `hover.png`**: sequence, rhythm across the page, and whether hover shows in a still.

Write two or three lines on what looks generic, what looks broken and the single change that would raise the quality most, then fix and re-run. Do at least two passes. The score is a lint for measurable defects, not a stop condition. Stop when `craft.png` is empty, no blocker or major finding remains, and every frame passes the five questions.

## 7. Final checklist

- [ ] The direction note is written, and at least four defaults from §0 are changed, each with a brief-specific reason
- [ ] The first viewport has one dominant element covering at least 40%; the hero is not "headline left, object right" unless argued
- [ ] Headlines come from brief facts, with none of the template tics
- [ ] One signature scroll scene is finished at every scroll position, with at most two supporting scenes (TASTE.md)
- [ ] The hero entrance is choreographed: headline first, settled by about 1.6s, nav visible at once
- [ ] Every control's hover changes at least two properties; focus rings are visible
- [ ] `craft.png` is empty: no dead space, hollow boxes, overlaps, nudged items, edge crowding or double-spaced code
- [ ] No frame shows faint, mid-reveal or 0 content; accents render as written
- [ ] Mobile (390px) has its own layout: no sideways scroll, no sticky panel over copy, tap targets of at least 44px
- [ ] Reduced motion keeps all content; no console errors; body contrast is at least 4.5:1
- [ ] You looked at the final images after your last change
