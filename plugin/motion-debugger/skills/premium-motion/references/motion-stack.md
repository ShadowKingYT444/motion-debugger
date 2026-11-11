# The premium motion stack for plain HTML: GSAP, ScrollTrigger, SplitText, Lenis

GSAP and all its plugins are free, including SplitText. Together with Lenis smooth scrolling, this is the stack most award-level sites use. Use it for plain HTML pages, or framework projects that have no animation library yet. For React projects that already use Motion, see frameworks.md instead.

The code below is one complete, tested file. Adapt the selectors and values to your page and `PREMIUM.md`; do not paste it unchanged as a look.

## Load

```html
<head>
  <!-- Hide animated elements only once JS is known to run; show them anyway if GSAP fails to load. -->
  <script>document.documentElement.classList.add('js');setTimeout(function(){if(!window.gsap)document.documentElement.classList.remove('js')},3000)</script>
  <style>.js [data-motion], .js [data-motion="stagger"] > * { visibility: hidden; }</style>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.css">
</head>
<body>
  …
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/ScrollTrigger.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/SplitText.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/lenis@1.3.27/dist/lenis.min.js"></script> <!-- optional: Silk and Cinematic personalities -->
  <script src="motion.js"></script>
</body>
```

Mark up what moves with `data-motion`:

| Attribute | Element |
| --- | --- |
| `data-motion="hero"` | The hero section; its `h1`, `[data-hero-visual]` and `[data-hero-rest]` children choreograph on load |
| `data-motion="heading"` | Section headings: masked line rise |
| `data-motion="image"` | A visual wrapper: clip reveal, with its first `img`, `canvas`, `video` or `.inner` counter-scaling |
| `data-motion="count"` | A number with its final value written in the HTML (`data-prefix` and `data-suffix` are optional) |
| `data-motion="stagger"` | A group: its children rise in reading order |
| `data-motion="fade"` | Anything else: a short rise and fade |
| `data-scene` | The signature scene's section (pinned and scrubbed) |
| `data-track` | A horizontal track inside a section (pinned and scrubbed sideways) |
| `data-ground` / `data-ink` | Chapters: the page colours cross-fade as each one reaches the middle of the screen |
| `data-magnetic` | A control that leans toward the pointer |

## motion.js

```js
gsap.registerPlugin(ScrollTrigger, SplitText);

const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const mm = gsap.matchMedia();

// "all" always matches, so this runs for every visitor; the flags pick what each one gets.
mm.add({ all: 'all', motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 761px)' }, (ctx) => {
  const { motion, desktop } = ctx.conditions;
  if (!motion) {
    // Reduced motion: every piece of content, no travel, no scrub, no smooth scroll.
    gsap.set('[data-motion], [data-motion="stagger"] > *', { autoAlpha: 1 });
    return;
  }

  // Smooth scroll on desktop, driven by GSAP's ticker so ScrollTrigger stays in sync.
  let lenis;
  if (desktop && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1 });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    ctx.add(() => () => { gsap.ticker.remove(raf); lenis.destroy(); });
  }

  // Hero: the headline lands first, the visual on its own track, the rest overlapping. Settles by ~1.6s.
  const hero = document.querySelector('[data-motion="hero"]');
  if (hero) {
    const h1 = hero.querySelector('h1');
    const visual = hero.querySelector('[data-hero-visual]');
    const rest = hero.querySelectorAll('[data-hero-rest]');
    const split = SplitText.create(h1, { type: 'lines', mask: 'lines' });
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.set(hero, { autoAlpha: 1 })
      .from(split.lines, { yPercent: 110, duration: 1.1, stagger: 0.09 }, 0.05);
    if (visual) tl.from(visual, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.3 }, 0.15)
      .from(visual.querySelector('img, canvas, video, .inner') || visual, { scale: 1.15, duration: 1.6 }, 0.15);
    if (rest.length) tl.from(rest, { y: 24, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, 0.55);
    // The hero leaves as you scroll: content drifts up and fades.
    gsap.to(hero.querySelectorAll('h1, [data-hero-rest]'), {
      yPercent: -14, autoAlpha: 0.15, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }

  // Headings: masked lines rise when they reach the lower part of the screen; re-split on resize.
  gsap.utils.toArray('[data-motion="heading"]').forEach((el) => {
    gsap.set(el, { autoAlpha: 1 });
    SplitText.create(el, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: (self) => gsap.from(self.lines, {
        yPercent: 110, duration: 1, ease: 'expo.out', stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
      }),
    });
  });

  // Visuals: a clip reveal with the content counter-scaling inside.
  gsap.utils.toArray('[data-motion="image"]').forEach((el) => {
    const inner = el.querySelector('img, canvas, video, .inner') || el;
    gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 80%', once: true } })
      .set(el, { autoAlpha: 1 })
      .from(el, { clipPath: 'inset(100% 0% 0% 0%)', duration: 1.2, ease: 'expo.out' })
      .from(inner, { scale: 1.18, duration: 1.6, ease: 'expo.out' }, 0);
  });

  // Numbers count up from 60% of their value, never from 0.
  gsap.utils.toArray('[data-motion="count"]').forEach((el) => {
    const end = parseFloat(el.textContent.replace(/[^\d.-]/g, ''));
    const decimals = (el.textContent.split('.')[1] || '').replace(/\D/g, '').length;
    const format = (v) => (el.dataset.prefix || '') + v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + (el.dataset.suffix || '');
    const state = { v: end * 0.6 };
    el.textContent = format(state.v);
    gsap.set(el, { autoAlpha: 1 });
    gsap.to(state, { v: end, duration: 1.6, ease: 'expo.out', onUpdate: () => { el.textContent = format(state.v); },
      scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });

  // Groups: children rise in reading order.
  gsap.utils.toArray('[data-motion="stagger"]').forEach((group) => {
    gsap.set(group, { autoAlpha: 1 });
    gsap.from(group.children, { y: 32, scale: 0.98, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07,
      scrollTrigger: { trigger: group, start: 'top 82%', once: true } });
  });

  gsap.utils.toArray('[data-motion="fade"]').forEach((el) => {
    gsap.from(el, { y: 20, autoAlpha: 0, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });

  // Signature scene: one pinned, scrubbed timeline. Every progress point must be a designed still.
  const scene = document.querySelector('[data-scene]');
  if (scene && desktop) {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: scene, start: 'top top', end: '+=150%', pin: true, scrub: 0.8, anticipatePin: 1 },
    });
    // Replace with your storyboard: 0 → 0.25 → 0.5 → 0.75 → 1.
    tl.to(scene.querySelectorAll('[data-scene-part]'), { yPercent: (i) => (i - 1) * -40, ease: 'power2.inOut', duration: 1 })
      .to(scene.querySelectorAll('[data-scene-step]'), { autoAlpha: 1, stagger: { each: 0.3 }, duration: 0.2 }, 0.1);
  }

  // Horizontal track: the section pins while the track slides sideways (phones get a native swipe row).
  gsap.utils.toArray('[data-track]').forEach((track) => {
    if (!desktop) return;
    const distance = () => track.scrollWidth - track.parentElement.clientWidth;
    gsap.to(track, { x: () => -distance(), ease: 'none',
      scrollTrigger: { trigger: track.parentElement, start: 'top top', end: () => '+=' + distance(), pin: true, scrub: 0.6, invalidateOnRefresh: true } });
  });

  // Chapters: cross-fade the page ground and ink.
  gsap.utils.toArray('[data-ground]').forEach((section) => {
    const vars = { '--ground': section.dataset.ground };
    if (section.dataset.ink) vars['--ink'] = section.dataset.ink;
    ScrollTrigger.create({ trigger: section, start: 'top 55%', end: 'bottom 55%',
      onToggle: (self) => { if (self.isActive) gsap.to(document.documentElement, { ...vars, duration: 0.8, ease: 'power2.out', overwrite: 'auto' }); } });
  });

  // Magnetic controls, fine pointers only.
  if (finePointer) document.querySelectorAll('[data-magnetic]').forEach((el) => {
    const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
    const move = (e) => { const r = el.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.3); y((e.clientY - r.top - r.height / 2) * 0.3); };
    const leave = () => { x(0); y(0); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
    ctx.add(() => () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
  });
});

// Re-measure pins once the real fonts are in.
document.fonts.ready.then(() => ScrollTrigger.refresh());
```

Use CSS for the ground and ink: `body { background: var(--ground); color: var(--ink); }`. Keep chapter sections' own backgrounds transparent.

## Rules

- **One timeline per moment.** Overlap the pieces with position parameters (`0.15`, `'<'`, `'-=0.4'`) instead of chaining delays.
- **Eases:** `expo.out` for reveals (≈ `cubic-bezier(.16,1,.3,1)`), `power3.out` for UI, `power2.inOut` for moves inside scrubbed scenes, and `ease: 'none'` only on the scrubbed timeline itself.
- **Scrub, don't trigger,** inside pinned scenes; trigger once (`once: true`) for reveals.
- **Pins:** at most 180vh on desktop; none on phones unless the scene is short.
- **Never** animate `width`, `height`, `top` or `left`; use transforms, opacity and clip-path.
- **Verify** with `motion-debugger critique`: GSAP's inline-style motion is recorded like any other, so the entrance, scroll and reduced-motion passes all apply.
