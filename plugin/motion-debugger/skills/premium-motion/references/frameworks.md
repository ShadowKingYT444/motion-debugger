# Premium motion in React, Next.js, Motion and GSAP

Most projects you will be asked to improve are React (Next.js, Vite, TanStack Start) with Tailwind, and often shadcn/ui with Motion (`motion`, formerly `framer-motion`) or GSAP already installed. Use what the project already has. The direction, finish system, personality, motion score and critique loop from SKILL.md and TASTE.md do not change; only the mechanism does.

Pick one route and stay on it:

| The project has | Use |
| --- | --- |
| `motion` or `framer-motion` in package.json | Motion, with the mappings below |
| `gsap` in package.json | GSAP + ScrollTrigger (every GSAP plugin, including SplitText, is free) |
| Neither, aiming for premium | GSAP + ScrollTrigger (motion-stack.md, or the GSAP section below for React) |
| Neither, and a small or simple page | The motion kit, loaded once (below) |

Never add a second animation library to a project that already has one.

## Tokens first

Put the timing tokens where the project keeps its design tokens, so every route shares one clock.

```css
/* Tailwind v4: globals.css. --ease-* becomes ease-out-expo, ease-out-quint utilities. */
@theme {
  --ease-out-expo: cubic-bezier(.16, 1, .3, 1);   /* reveals, hero */
  --ease-out-quint: cubic-bezier(.22, 1, .36, 1); /* hover, press, menus */
  --ease-in-out-move: cubic-bezier(.65, 0, .35, 1); /* on-screen moves, morphs */
}
```

```ts
// Motion: one shared file, e.g. lib/motion.ts
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeOutQuint = [0.22, 1, 0.36, 1] as const;
export const reveal = { duration: 0.8, ease: easeOutExpo };
export const hover = { duration: 0.18, ease: easeOutQuint };
```

Hover and press use Tailwind transitions (`transition-colors duration-200 ease-out-quint`), not an animation library. Use `motion-safe:` and `motion-reduce:` variants for CSS-only motion.

**shadcn/ui and tw-animate-css trap:** `animate-in fade-in slide-in-from-bottom-4` on every section is the "everything fades up the same way" default that reads as AI-built. Use it for menus, dialogs and toasts only.

## Motion (React)

Wrap the app once so every Motion component honours the visitor's setting:

```tsx
// app/providers.tsx
'use client';
import { MotionConfig } from 'motion/react'; // 'framer-motion' in older projects
export function Providers({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
```

`reducedMotion="user"` removes transform motion and keeps opacity, which matches SKILL.md's reduced-motion rule.

| Kit primitive | Motion equivalent |
| --- | --- |
| `data-reveal="up"` | `<motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={reveal} />` |
| `data-reveal="clip"` | `initial={{ clipPath: 'inset(0 0 100% 0)', scale: 1.06 }} whileInView={{ clipPath: 'inset(0 0 0% 0)', scale: 1 }}` with the hero duration |
| `data-stagger="70"` | Parent `variants={{ show: { transition: { staggerChildren: 0.07 } } }} initial="hidden" whileInView="show"`; children use `hidden`/`show` variants |
| `data-split="words"` | Split the string into `motion.span`s inside an `overflow: hidden` mask (see below) |
| `data-count` | `animate(from, to, { duration: 1.4, ease: easeOutExpo, onUpdate: v => setText(format(v)) })` started by `useInView`; render the final value on the server |
| `data-progress` + sticky stage | `const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })`, then `useTransform(scrollYProgress, [0, 1], [...])` on `style` |
| `data-hscroll` | Tall section with a sticky stage; `x = useTransform(scrollYProgress, [0, 1], ['0%', '-75%'])` on the track; a native swipe row below 760px |
| `data-stack` | Each card `position: sticky; top: <offset>`; scale and dim covered cards with `useTransform` on the next card's progress |
| `data-exit` | `useScroll({ target: heroRef, offset: ['start start', 'end start'] })`, map to `y`, `scale` and `opacity` |
| `data-read` | Words as `motion.span`s whose `opacity` comes from `useTransform(scrollYProgress, [i / n, (i + 1) / n], [0.25, 1])`; keep the floor ≥0.45 at rest in stills |
| `data-parallax` | `y = useTransform(scrollYProgress, [0, 1], [-60, 60])` on an inner layer |
| `data-magnetic` / `data-tilt` | `useMotionValue` + `useSpring` driven by `onPointerMove`; reset on leave |

A masked headline that keeps inline accents readable to screen readers:

```tsx
'use client';
import { motion } from 'motion/react';
import { easeOutExpo } from '@/lib/motion';

export function SplitHeading({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <motion.h1 aria-label={text} initial="hidden" animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
      {words.map((word, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span className="inline-block"
            variants={{ hidden: { y: '110%' }, show: { y: '0%', transition: { duration: 0.9, ease: easeOutExpo } } }}>
            {word}{i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  );
}
```

A pinned scene, finished at every scroll position:

```tsx
'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';

export function AssemblyScene() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const lid = useTransform(scrollYProgress, [0, 0.5], [-160, 0]);
  const caption = useTransform(scrollYProgress, [0.45, 0.6], [0, 1]);
  return (
    <section ref={ref} className="relative h-[180vh]">
      <div className="sticky top-0 grid h-screen place-items-center">
        <motion.div style={{ y: lid }}>{/* the part that moves */}</motion.div>
        <motion.p style={{ opacity: caption }}>{/* what the visitor should now understand */}</motion.p>
      </div>
    </section>
  );
}
```

Motion rules that still apply: animate `transform`, `opacity`, `clipPath` and `filter` only; never `layout` on large sections; no `whileInView` on pinned slides or stacked cards (the scene is their motion).

## GSAP + ScrollTrigger (React)

```tsx
'use client';
import { useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Gallery() {
  const scope = useRef<HTMLElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 761px)', () => {
      const section = scope.current!;
      const track = section.querySelector<HTMLElement>('[data-track]')!;
      const distance = () => track.scrollWidth - window.innerWidth;
      const size = () => { section.style.height = `${distance() + window.innerHeight}px`; };
      size();
      ScrollTrigger.addEventListener('refreshInit', size);
      gsap.to(track, {
        x: () => -distance(), ease: 'none',
        scrollTrigger: { trigger: section, start: 'top top', end: 'bottom bottom', scrub: 0.6, invalidateOnRefresh: true },
      });
      return () => { ScrollTrigger.removeEventListener('refreshInit', size); section.style.height = ''; };
    });
  }, { scope });
  // The stage sticks on desktop and is a native swipe row on phones and with reduced motion.
  return (
    <section ref={scope}>
      <div className="overflow-x-auto motion-safe:md:sticky motion-safe:md:top-0 motion-safe:md:h-screen motion-safe:md:overflow-hidden">
        <div data-track className="flex w-max gap-6">{/* slides */}</div>
      </div>
    </section>
  );
}
```

Scrub inside a sticky stage rather than with `pin: true`: a JS pin jumps a frame behind native scrolling and the critic records it as layout shift. `useGSAP` reverts every tween and ScrollTrigger on unmount, so route changes do not leak. Use `gsap.matchMedia()` for reduced motion and phone layouts instead of branching by hand. Use `ease: 'none'` only for scrubbed timelines; reveals use `expo.out` or `power4.out`.

## The motion kit in a React or Next.js app

The kit wires elements that mount after load (route changes, client renders) automatically and releases removed ones, so it is safe to load once.

```tsx
// app/layout.tsx (Next.js App Router). Copy motion-kit.js to public/ and motion-kit.css next to globals.css.
import Script from 'next/script';
import './motion-kit.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Script src="/motion-kit.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

Vite or TanStack Start: add `<script src="/motion-kit.js" defer></script>` to `index.html` (or the root route's head) and import the CSS once.

Data attributes pass straight through JSX (`<h2 data-reveal="up">`). Two cautions:

- `data-split`, `data-read`, `data-scramble` and `data-count` rewrite an element's text. Use them only on text React does not re-render (static headings, fixed figures). For text that changes with state, use the Motion mappings above.
- After a client-side route change the kit wires the new page on the next frame. If you need it sooner, call `window.motionKit?.refresh()` in a `useEffect`; repeated calls are safe.

## Look at it

Run the dev server and critique the running page, exactly as SKILL.md §Look describes:

```bash
motion-debugger critique http://localhost:3000   # Next.js
motion-debugger critique http://localhost:5173   # Vite
```

Critique the routes that matter, not just `/`.
