# Premium motion patterns

Complete, framework-free building blocks. They assume `assets/motion-kit.css` tokens (`--ease-out`, `--dur-*`) and, where noted, `assets/motion-kit.js`. Adapt names, colours and content to the brief — these are mechanisms, not a look.

## 1. Hero entrance sequence

```html
<head>
  <!-- Hide reveal targets only once JS is known to run; prevents a flash before the kit loads. -->
  <script>document.documentElement.classList.add('mk-js')</script>
  <link rel="stylesheet" href="motion-kit.css"><script src="motion-kit.js" defer></script>
</head>
<header class="hero">
  <p class="eyebrow" data-reveal="fade">Introducing Halo 2</p>
  <h1 data-split="words" data-delay="80">Sound that disappears into the room</h1>
  <p class="lede" data-reveal="up" data-delay="520">Forty-eight drivers. One quiet object.</p>
  <div class="cta-row" data-stagger="80" data-delay="640">
    <a class="btn mk-button" data-magnetic="0.25" href="#buy">Pre-order</a>
    <a class="mk-link" href="#story">Watch the film →</a>
  </div>
  <figure class="hero-visual" data-reveal="clip" data-delay="300"><!-- your real visual --></figure>
</header>
```

Order of importance: headline lands first, supporting copy ~400–600ms later, the visual overlaps. Keep the total under ~1.6s.

## 2. Pinned scroll story (sticky + progress)

A tall section pins its stage while `--p` goes 0→1; CSS maps progress to transforms. Steps swap at thresholds.

```html
<section class="story" data-progress style="height: 340vh">
  <div class="story-stage">
    <div class="story-copy">
      <p class="step" data-step="0">Machined from one block.</p>
      <p class="step" data-step="1">Tuned by ear, measured by laser.</p>
      <p class="step" data-step="2">Silent until it isn't.</p>
    </div>
    <div class="device">
      <div class="layer layer-a"></div><div class="layer layer-b"></div><div class="layer layer-c"></div>
    </div>
  </div>
</section>
```

```css
.story-stage { position: sticky; top: 0; height: 100vh; display: grid; grid-template-columns: 1fr 1fr; align-items: center; overflow: clip; }
.device { --spread: calc(var(--p, 0) * 140px); transform: rotateX(calc(55deg - var(--p, 0) * 40deg)) rotateZ(calc(-30deg + var(--p, 0) * 30deg)); transform-style: preserve-3d; }
.layer-a { transform: translateZ(calc(var(--spread) * 1)); }
.layer-b { transform: translateZ(0); }
.layer-c { transform: translateZ(calc(var(--spread) * -1)); }
.step { opacity: .18; transition: opacity var(--dur-ui) linear, transform var(--dur-ui) var(--ease-out-soft); }
.step.is-active { opacity: 1; transform: translateX(8px); }
@media (max-width: 760px) { .story-stage { grid-template-columns: 1fr; align-content: center; gap: 32px; } }
@media (prefers-reduced-motion: reduce) { .story { height: auto !important; } .story-stage { position: static; height: auto; padding: 96px 0; } .step { opacity: 1; } }
```

```js
// Activate the step for the current progress (reads the --p the kit writes).
const story = document.querySelector('.story'), steps = [...story.querySelectorAll('.step')];
const update = () => {
  const p = parseFloat(getComputedStyle(story).getPropertyValue('--p')) || 0;
  const active = Math.min(steps.length - 1, Math.floor(p * steps.length));
  steps.forEach((step, i) => step.classList.toggle('is-active', i === active));
  requestAnimationFrame(update);
};
requestAnimationFrame(update);
```

Without the kit: compute `p = clamp(-rect.top / (rect.height - innerHeight), 0, 1)` in a rAF-throttled passive scroll listener. With modern CSS you can also use `animation-timeline: view()` and `animation-range: contain` on the stage children (Chrome/Edge/Safari 26+); keep the JS path as fallback.

## 3. Bento grid with pointer spotlight

```html
<div class="bento" data-stagger="70">
  <article class="tile tile-wide" data-spotlight> … </article>
  <article class="tile" data-spotlight> … </article>
  <article class="tile tile-tall" data-spotlight> … </article>
</div>
```

```css
.bento { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); grid-auto-rows: minmax(220px, auto); gap: 16px; }
.tile { border: 1px solid var(--line); border-radius: 18px; padding: 28px; background: var(--surface); transition: transform var(--dur-ui) var(--ease-out-soft), border-color var(--dur-ui) linear; }
.tile:hover { transform: translateY(-4px); border-color: color-mix(in oklab, var(--accent) 40%, var(--line)); }
.tile-wide { grid-column: span 2; } .tile-tall { grid-row: span 2; }
@media (max-width: 760px) { .bento { grid-template-columns: 1fr; } .tile-wide, .tile-tall { grid-column: auto; grid-row: auto; } }
```

Put a small live demo inside each tile (a mini chart that draws, a toggle that flips, a code line that types) rather than an icon + paragraph.

## 4. SVG path that draws with scroll

```html
<svg class="route" viewBox="0 0 800 300" data-progress><path d="M10 250 C 200 40, 420 320, 790 60" pathLength="1"/></svg>
```

```css
.route path { fill: none; stroke: var(--accent); stroke-width: 2; stroke-dasharray: 1; stroke-dashoffset: calc(1 - var(--p, 0) * 1.4); }
```

`pathLength="1"` normalises the dash maths. For a one-shot draw instead of scrub: `transition: stroke-dashoffset 1.6s var(--ease-in-out)` and set offset 0 when revealed.

## 5. Horizontal gallery driven by vertical scroll

```html
<section class="hscroll" data-progress style="height: 300vh">
  <div class="hscroll-stage"><div class="hscroll-track"> <figure>…</figure> × 6 </div></div>
</section>
```

```css
.hscroll-stage { position: sticky; top: 0; height: 100vh; overflow: hidden; display: flex; align-items: center; }
.hscroll-track { display: flex; gap: 24px; padding-inline: 8vw; transform: translate3d(calc(var(--p, 0) * (-100% + 100vw)), 0, 0); will-change: transform; }
.hscroll-track figure { flex: 0 0 min(70vw, 560px); aspect-ratio: 4 / 5; }
@media (max-width: 760px), (prefers-reduced-motion: reduce) { .hscroll { height: auto !important; } .hscroll-stage { position: static; height: auto; overflow-x: auto; scroll-snap-type: x mandatory; } .hscroll-track { transform: none; } .hscroll-track figure { scroll-snap-align: start; } }
```

## 6. Tabs with a sliding indicator

```html
<div class="tabs" role="tablist"><span class="tab-ink" aria-hidden="true"></span>
  <button role="tab" aria-selected="true">Overview</button><button role="tab" aria-selected="false">Latency</button><button role="tab" aria-selected="false">Security</button>
</div>
```

```css
.tabs { position: relative; display: inline-flex; padding: 4px; border-radius: 999px; background: var(--surface); }
.tabs button { position: relative; z-index: 1; padding: 10px 18px; border: 0; background: none; color: var(--muted); transition: color var(--dur-ui) linear; }
.tabs button[aria-selected="true"] { color: var(--ink); }
.tab-ink { position: absolute; top: 4px; bottom: 4px; left: 0; width: var(--w, 0); transform: translateX(var(--x, 0)); border-radius: 999px; background: var(--raised); transition: transform var(--dur-ui) var(--ease-spring), width var(--dur-ui) var(--ease-out-soft); }
```

```js
const tabs = document.querySelector('.tabs'), ink = tabs.querySelector('.tab-ink');
const move = (tab) => { ink.style.setProperty('--x', tab.offsetLeft - 4 + 'px'); ink.style.setProperty('--w', tab.offsetWidth + 'px'); };
tabs.addEventListener('click', (event) => { const tab = event.target.closest('[role=tab]'); if (!tab) return;
  tabs.querySelectorAll('[role=tab]').forEach((t) => t.setAttribute('aria-selected', String(t === tab))); move(tab); /* swap panel with a 280ms cross-fade + 8px rise */ });
move(tabs.querySelector('[aria-selected=true]'));
```

(Width animation on a single small indicator is acceptable; avoid it on content.)

## 7. Words light up as you read

```html
<p class="manifesto" data-progress>We build tools for people who care how things feel…</p>
```

```js
const el = document.querySelector('.manifesto');
el.innerHTML = el.textContent.trim().split(/\s+/).map((w, i, all) => `<span style="--t:${i / all.length}">${w}</span>`).join(' ');
```

```css
.manifesto { font-size: clamp(1.75rem, 3.6vw, 3rem); line-height: 1.2; letter-spacing: -.02em; }
.manifesto span { opacity: clamp(.16, (var(--p, 0) * 1.6 - var(--t)) * 6, 1); transition: opacity 120ms linear; }
```

## 8. Scramble-to-text headline (signature moment)

```js
function scramble(el, { duration = 1200, glyphs = '!<>-_\\/[]{}—=+*^?#' } = {}) {
  const target = el.textContent; const start = performance.now();
  el.setAttribute('aria-label', target);
  const frame = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const settled = Math.floor(target.length * (1 - Math.pow(1 - t, 3)));
    el.textContent = target.slice(0, settled) + [...target.slice(settled)].map((c) => c === ' ' ? ' ' : glyphs[(Math.random() * glyphs.length) | 0]).join('');
    if (t < 1) requestAnimationFrame(frame); else el.textContent = target;
  };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(frame);
}
```

Use a monospace or tabular face so the width does not jump.

## 9. A product UI that demos itself

Build the actual interface in HTML/CSS — a dashboard card with a sparkline, a terminal with a typing command, a notification stack — and give it a slow, believable loop: a value ticking every 2–3s with a 400ms ease-out number roll, a chart line drawing on reveal, a toast sliding in with a spring. Pause loops when off-screen (IntersectionObserver) and under reduced motion. This reads as product truth, unlike a static screenshot or a grey placeholder.

## 10. Card and button feedback

```css
.card { transition: transform var(--dur-ui) var(--ease-out-soft), box-shadow var(--dur-ui) var(--ease-out-soft); }
.card:hover { transform: translateY(-6px); box-shadow: 0 30px 60px -30px rgb(0 0 0 / .45); }
.card img { transition: transform 900ms var(--ease-out); } .card:hover img { transform: scale(1.04); }
.btn { transition: transform var(--dur-micro) var(--ease-out-soft), background-color var(--dur-micro) linear, box-shadow var(--dur-ui) var(--ease-out-soft); }
.btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px -10px var(--accent); }
.btn:active { transform: scale(.97); transition-duration: 80ms; }
.btn .arrow { display: inline-block; transition: transform var(--dur-ui) var(--ease-out-soft); } .btn:hover .arrow { transform: translateX(4px); }
```
