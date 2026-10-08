---
name: premium-motion
description: Build or upgrade a web page/site so it looks and moves like a premium, award-level product site — art direction, typography, a choreographed hero, scroll storytelling, tactile micro-interactions — then look at the real rendered result with `motion-debugger critique` and fix what it shows. Use for any landing page, marketing site, portfolio, product page or UI where visual polish and animation quality matter.
---

# Premium motion: art-direct, build, look, refine

Agents' default pages are recognisable: centred hero, purple-to-blue gradient, three icon cards, `transition: all .3s ease`, the same fade-up on every block, and content that never got looked at in a browser. Premium work differs in four ways. Follow all four.

1. **A point of view** — one concept and one signature moment, decided before code.
2. **A system** — type scale, colour roles, spacing and motion tokens used consistently.
3. **Choreography** — motion has an order and a reason: it reveals hierarchy, explains the product, and answers input.
4. **Looking** — you render the page, look at the frames, and fix what you see. At least two critique passes.

## 1. Art direction (write it down first, 5–8 lines in your notes or a comment at the top of the CSS)

- **Audience & feeling**: e.g. "infra engineers; precise, calm, fast" or "collectors; tactile, slow luxury".
- **Concept**: a metaphor the visuals and motion share (signal → noise, layers of paper, light through glass, an orbiting system, a timeline).
- **Signature moment**: ONE ambitious piece the visitor remembers — a pinned product scene that assembles as you scroll, a hero headline that resolves from scrambled glyphs, a live HTML/CSS product UI that demos itself, an SVG diagram whose paths draw with scroll, a canvas field that reacts to the pointer. Build this properly; it is the difference between "nice template" and "premium".
- **Palette**: 1 background family (near-black like #0B0B0C / #0E1111, or warm off-white like #F5F3EE / #FAF9F6), 1 ink, 1–2 muted inks, ONE accent used sparingly. No rainbow gradients; if you use a gradient, make it a soft light source (radial, low contrast) rather than a fill.
- **Type**: a display face with character + a quiet text face, or one excellent family in two weights. Google Fonts is fine (e.g. display: "Instrument Serif", "Fraunces", "Space Grotesk", "Clash Display"/"General Sans" if available, "Inter Tight", "Manrope"; text: "Inter", "Geist", "IBM Plex Sans"). Load with `display=swap` and give a matched fallback stack.

## 2. The visual system

- **Type scale**: hero `clamp(3rem, 7vw, 6.5rem)`, line-height 0.95–1.05, letter-spacing -0.02 to -0.045em; section titles `clamp(2rem, 4vw, 3.5rem)`; body 16–18px, line-height 1.55, max-width 60–68ch; small labels 12–13px uppercase with +0.08em tracking for eyebrows. Hero h1 should be ≥3.5× body size.
- **Space**: an 8px base; section padding `clamp(96px, 14vh, 180px)` vertical; generous whitespace around the hero; consistent container (max 1200–1320px) with a 12-column mental grid. Break the grid deliberately once or twice (a full-bleed visual, an offset title).
- **Surfaces & depth**: 1px hairline borders (`rgb(255 255 255 / .08)` on dark, `rgb(0 0 0 / .08)` on light), layered soft shadows (`0 1px 0 rgb(255 255 255/.04) inset, 0 20px 40px -20px rgb(0 0 0/.5)`), subtle noise/grain overlay (SVG feTurbulence at 3–5% opacity), radial glows behind focal objects. Radii consistent (e.g. 14px cards, 999px pills).
- **Real visuals**: never a grey box labelled "image". Build the product UI in HTML/CSS (dashboards, code blocks, cards with plausible data), draw SVG illustrations/diagrams, generate canvas/WebGL fields, or use CSS-composed abstract objects. Mark sample data as illustrative.
- **Sections with different jobs**: hero → proof (logos marquee / metrics) → product story (sticky/pinned explanation) → feature bento → testimonial/quote → pricing or CTA → footer. Vary layouts: not every section is three centred cards.
- **Avoid**: emoji as icons (use inline SVG strokes, 1.5px), default purple/indigo gradients, `transition: all`, centred everything, identical card grids repeated, stock phrases ("Unlock the power of…"), fake 5-star reviews with real company names.

## 3. Motion system

Use tokens (copy `assets/motion-kit.css` or define your own):

| Use | Duration | Easing |
| --- | --- | --- |
| Hover / press / toggle | 140–220ms | `cubic-bezier(.22,1,.36,1)`; press scale .97 at 80ms |
| Menus, tabs, small layout | 240–360ms | `cubic-bezier(.22,1,.36,1)` |
| Content reveal | 700–1000ms | `cubic-bezier(.16,1,.3,1)` (expo-out) |
| Hero / signature | 900–1400ms | expo-out; overlap pieces |
| On-screen move / morph | 400–700ms | `cubic-bezier(.65,0,.35,1)` |
| Exit | 60–70% of the entrance | ease-in |
| Ambient loop / marquee / progress | long | `linear` (only place linear belongs) |

Rules that separate premium from generic:

- **Choreograph the hero**: eyebrow → headline (split into lines or words, each rising out of an overflow-hidden mask, 60–110ms stagger) → sub-copy → CTAs → visual (scale 1.04→1 + opacity, or clip-path reveal). Start within 100ms of first paint; everything settled by ~1.6s. Overlap steps — never wait for one to finish before the next starts.
- **Stagger groups**: cards, list items, logo rows enter 50–90ms apart, in reading order. Never animate 12 things identically at the same instant.
- **Scroll is a timeline**: at least one section should be *scroll-linked* (progress 0→1 drives transforms) rather than a one-shot fade: a pinned product that rotates/assembles, a horizontal gallery driven by vertical scroll, a headline whose words light up as you read, an SVG path that draws (`stroke-dashoffset`). Use a sticky child inside a tall (200–400vh) parent with `data-progress` / CSS `--p`, or CSS `animation-timeline: view()`/`scroll()` with a JS fallback.
- **Vary reveal types by content**: titles mask-rise; images clip-reveal (`clip-path: inset(100% 0 0 0)` → `inset(0)`) with a slight scale-down; numbers count up; diagrams draw; cards rise + fade. Not the same fade-up everywhere.
- **Every control answers**: buttons lift/brighten on hover (≤220ms) and compress on press; links grow an underline from the left; cards raise and their media scales 1.03; magnetic or spotlight effects on the primary CTA and bento cards. Visible `:focus-visible` rings.
- **Physical, interruptible**: transitions (not keyframes) for state so reversals are smooth; springs for drag/follow; never block input while animating.
- **Performance**: animate only `transform`, `opacity`, `clip-path`, `filter` (sparingly). One rAF loop for scroll work, passive listeners, IntersectionObserver for triggers. No scroll-jacking of the native scroll. Keep backdrop-filter to small/fixed elements.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` keeps content and colour/opacity state changes but removes travel, parallax, scrub and loops. Content must be visible in that mode.
- **Robustness**: hide reveal targets only after JS runs (`.js [data-reveal]{opacity:0}` with the class set in a tiny inline head script or by the kit), use a low IntersectionObserver threshold (≤0.15) and a fallback that reveals anything already scrolled past. Content that never appears is the #1 agent bug.

## 4. Building blocks

`assets/motion-kit.js` + `assets/motion-kit.css` give you data-attribute primitives: `data-reveal`, `data-stagger`, `data-split`, `data-count`, `data-progress` (sticky storytelling), `data-parallax`, `data-magnetic`, `data-spotlight`, `data-tilt`, `data-marquee`, `data-nav`. Copy them into the project (or reimplement in the project's framework — React/Vue/Svelte, Motion/GSAP if already installed) and build the bespoke signature moment on top. See `references/patterns.md` for complete code for the hero sequence, pinned scroll story, bento spotlight grid, path drawing, horizontal scroll gallery, tabbed product demo with sliding indicator, and text-highlight-on-scroll.

If the project already uses a motion library (Framer Motion/Motion, GSAP, Lenis), use it with the same tokens and rules instead of the kit.

## 5. Look at it — the critique loop (required)

You cannot judge motion from source. Render it:

```bash
motion-debugger critique ./path/to/site        # folder with index.html, or an .html file
motion-debugger critique http://127.0.0.1:5173 # a running local dev server
# not on PATH? → npx motion-debugger critique …   (or node <install>/build/cli/index.js critique …)
```

It opens the page in Chromium at desktop (1440×900) and mobile (390×844), records the entrance timeline, scrolls the whole page, hovers controls, tabs through focus, repeats with reduced motion, and prints findings with concrete fixes plus contact-sheet images:

- `desktop-entrance.png` — the hero at ~80ms → 3s: is there a sequence, does the headline land first, is anything janky or blank too long?
- `desktop-scroll.png` — every viewport after scrolling: does each section arrive with intent, is anything still invisible, is the rhythm varied?
- `hover.png` — rest vs hover crops of each control.
- `mobile.png` — first viewport and scroll positions on a phone.

**Open and look at every image** (read the PNG files with your image/file viewer tool). Then write down, in two or three lines each: what looks generic, what looks broken, and what single change would most raise the quality. Fix blockers and majors first, then the biggest craft gap you saw. Re-run. Do at least two critique passes; stop when the lint is clean (A/B grade) **and** the frames look like something you would show a design director.

The score is a lint for measurable defects. It cannot see taste — a page can pass every check and still look like a template. Your eyes on the contact sheets are the real review.

## 6. Final checklist

- [ ] The hero has a choreographed entrance with masked/split headline and settles in ≲1.6s
- [ ] There is one signature, scroll-linked or interactive moment that is genuinely built, not implied
- [ ] Every section has a reveal suited to its content; groups are staggered; nothing stays invisible
- [ ] Every button/link/card has hover + press + focus-visible states with token timings
- [ ] Only transform/opacity/clip-path are animated; no `transition: all`; no linear easing on movement
- [ ] Reduced motion keeps all content visible and removes travel/loops
- [ ] Mobile (390px): no sideways scroll, headline wraps cleanly, tap targets ≥44px, motion lighter
- [ ] No console errors; fonts actually load; contrast ≥4.5:1 for body text
- [ ] You looked at the final contact sheets after your last change
