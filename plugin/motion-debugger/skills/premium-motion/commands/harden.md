# harden: phone, reduced motion, accessibility, performance

## The phone layout (390px) is its own design

- Rebuild the composition for a tall screen; do not squeeze the desktop. The hero still has a dominant visual.
- Shorten pins (or replace them with stacked frames), turn horizontal tracks into native swipe rows, and drop pointer effects.
- No sticky panel covering copy, no sideways scroll, gutters of at least 20px, tap targets of at least 44px.
- Headings wrap well at the phone size; reduce the display size with `clamp()`, not by hiding words.

## Reduced motion

Under `prefers-reduced-motion: reduce`: keep every piece of content and the colour and opacity changes; remove travel, parallax, scrubbed scenes, smooth scroll and loops; show each scene's final or key frames stacked. With GSAP, wrap motion in `gsap.matchMedia()` with `(prefers-reduced-motion: no-preference)`.

## Accessibility

- Body contrast 4.5:1 and large text and UI 3:1, measured over what is actually painted, including images and gradients.
- Semantic landmarks, one `h1`, headings in order, real buttons and links, labelled form fields.
- Split text keeps an accessible name: put `aria-label` on the element and `aria-hidden` on the pieces (SplitText and the kit do this).
- Decorative canvases and SVGs are `aria-hidden`; meaningful visuals have text alternatives.
- Keyboard: every control is reachable, focus is visible, and pinned scenes do not trap focus.

## Performance

- Animate `transform`, `opacity` and `clip-path`; apply `filter` only to small elements; never animate layout properties.
- One rAF loop or the GSAP ticker for scroll work; passive listeners; measure on resize, not on every scroll frame.
- Use `will-change` only on elements that are animating now, and remove it afterwards.
- Canvas and WebGL: cap at DPR 2, pause off screen, initialise near the viewport.
- Fonts: preload the display face, `font-display: swap`, matched fallback metrics.
- Images: correct sizes, `loading="lazy"` below the fold, `decoding="async"`.

## Robustness

- Reveal targets are hidden only after JavaScript runs; if the animation library fails to load, content still shows (a timeout that removes the hidden state).
- No console errors. Resize and orientation changes recalculate pins.

## Verify

Run the critic. There are no `mobile-overflow`, tap-target, contrast, `no-reduced-motion`, `stuck-invisible`, `scroll-jank` or runtime-error findings. The reduced-motion pass shows all content, and `mobile.png` shows a designed phone layout.
