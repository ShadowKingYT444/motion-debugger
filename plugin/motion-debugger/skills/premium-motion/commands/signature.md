# signature: one cinematic scroll scene

The scene people remember and describe to someone else. Scroll progress drives it continuously, it explains something true about this product, and every still inside it is a designed frame.

## 1. Propose before building

Write three concepts in one or two lines each, each a different kind (TASTE.md §2):

- a pinned assembly, explode or camera move through the product or its metaphor
- a horizontal track through a body of work, a timeline or a set of options
- ordered steps that stack, transform one into the next, or build a diagram
- media that opens from an inset card to full bleed, then hands over to the next chapter
- a route, signal or ledger that draws as you scroll
- a statement that lights up as it is read, over a visual that changes with it

For each, say what the visitor understands by the end that they did not before. If the user is present, offer the three and let them choose. Otherwise pick the one only this brief could have, and record why in `PREMIUM.md`.

## 2. Storyboard five frames

Before code, describe the scene at progress 0, 0.25, 0.5, 0.75 and 1. Each frame must stand alone as a finished composition: a dominant element, readable text, nothing faint, nothing empty. Something visible changes every ~300px of scroll.

## 3. Build

- **Length:** at most 180vh of scrubbing on desktop. Long scenes feel like a broken page.
- **Stage:** a tall section with a `position: sticky` stage inside it. Do not use GSAP's `pin: true`: it jumps a frame behind native scrolling and the critic records it as layout shift.
- **GSAP:** one `ScrollTrigger` on the section (`start: 'top top', end: 'bottom bottom', scrub: 0.6–1`) driving a single timeline. Use `ease: 'none'` on the timeline, and put eases on the tweens inside it. See references/motion-stack.md (the `data-scene` code).
- **Motion (React):** use `useScroll` on the section plus `useTransform` per property; see references/frameworks.md.
- **Kit:** use `data-progress` on a tall section with a sticky stage, and map `--p` to transforms in CSS (references/patterns.md §2).
- **Animate only** `transform`, `opacity`, `clip-path`, and filters on small elements. Precompute sizes on resize, not on scroll.
- **Text inside the scene** changes in place: crossfade or masked swaps. Never slide the active step sideways off its column.
- **Phones:** a shorter scene, or a stacked sequence of the same five frames with simple reveals.
- **Reduced motion:** show the final frame, or the five frames stacked, with all content.

## 4. Verify

```bash
motion-debugger critique <target>
```

Find the scene in `desktop-scroll.png` and the detail sheets. The captured stops inside it must look like your storyboard frames: no empty stage, no dimmed list, no heading mid-mask. Check `mobile.png` for the phone version. If a frame fails, fix that frame's composition, not just its timing.
