# Motion taste

Read this before you plan the page. SKILL.md tells you how to build and check motion; this file tells you how ambitious it should be and how to keep it coherent.

Most agent-built sites are *animated*: things fade up once, then the page is still. Award-level sites are *choreographed*: scroll is a timeline, every chapter has its own device, and one motion personality runs through all of it. A visitor scrolling at any point should see something responding to them.

## 1. Pick one motion personality

Choose the personality that fits the brand and write it at the top of your CSS. Use only its easing, timing and devices. Mixing personalities is what makes motion look cheap.

| Personality | Fits | Easing and timing | Stagger | Signature devices |
| --- | --- | --- | --- | --- |
| **Silk** (editorial, luxury, architecture, hardware) | quiet confidence | expo-out `cubic-bezier(.16,1,.3,1)`, reveals 1000–1300 ms | 90–120 ms | line-by-line masked type, image wipes with inner counter-scale, slow parallax depth, expanding media, chapter colour shifts |
| **Kinetic** (developer tools, fintech, agencies) | precise, fast | quint-out `cubic-bezier(.22,1,.36,1)`, 500–800 ms | 40–60 ms | scramble/resolve type, horizontal tracks, velocity-skewed marquees, live product UI, numbers that roll, grid lines that draw |
| **Cinematic** (product launches, consumer tech) | awe, scale | expo-out in, `cubic-bezier(.65,0,.35,1)` for camera moves, 900–1400 ms | 80–110 ms | pinned product scene that assembles or rotates with scroll, zoom-through, light sweeps, hero that recedes as you leave |
| **Soft** (wellness, sleep, health, lifestyle) | calm, organic | `cubic-bezier(.33,1,.68,1)`, 900–1400 ms, gentle springs | 100–140 ms | breathing gradients, blur-to-sharp reveals, words that brighten as you read, slow orbiting forms, day/night colour transitions |

Every personality still uses 140–220 ms for hover and press, and `linear` only for loops and scrubs.

## 2. The ambition floor

A premium page has all six of these. If one is missing, the result reads as a template no matter how good the colours are.

1. **A layered hero entrance.** The type arrives in masked pieces, the visual arrives on its own track, and at least one ambient element stays alive afterwards. Everything is settled by about 1.6 s. As the visitor scrolls away, the hero *leaves* rather than just scrolling off: it drifts up, recedes and fades (`data-exit`), or the visual zooms through.
2. **At least two scroll-linked scenes of different kinds**, where scroll progress drives transforms continuously rather than triggering a one-shot fade. Choose from:
   - a pinned assembly or explode view (`data-progress` with a sticky stage)
   - a horizontal track (`data-hscroll`)
   - stacking cards (`data-stack`)
   - media that expands to full-bleed (`data-expand`)
   - reading highlight (`data-read`)
   - a path or diagram that draws with scroll (`data-draw="scrub"`)
   - a camera move through layered depth (`data-parallax` at three speeds)
3. **Chapter transitions.** The page changes state between acts instead of stacking same-coloured blocks. Use a background and ink cross-fade (`data-bg` / `data-ink`), a full-bleed wipe, or a section that pins while the next one slides over it.
4. **A kinetic type moment.** Oversized type that does something: a marquee that leans with scroll velocity, a manifesto that lights up word by word, a headline that resolves from scrambled glyphs, or letters that spread and settle.
5. **A living visual.** A canvas or SVG field reacting to the pointer, a product UI that demos itself in a believable loop, or a generative pattern with slow drift. It pauses off-screen and under reduced motion.
6. **Tactile micro-interactions everywhere.** A magnetic primary CTA, cards with a spotlight or tilt and a lifting shadow, underlines that grow, arrows that nudge, press compression and visible focus. Every one uses the same timing tokens.

## 3. Write a motion score before coding

Fill in this table in a comment at the top of your CSS or JS. It is the plan the page is built and reviewed against.

```
/* MOTION SCORE — personality: Silk
 * chapter         | device                         | trigger      | timing
 * hero            | line-masked h1, visual clip-up, exit drift | load / scroll | 1100ms, 110ms stagger
 * proof           | velocity-skewed marquee         | scroll       | linear loop
 * story (pinned)  | object assembles in 3 steps     | scrub 300vh  | --p
 * projects        | horizontal track, counter-scaled images | scrub | --p
 * philosophy      | words brighten as read, bg → paper | scrub     | --read
 * process         | stacking cards                  | scrub        | --cover
 * contact         | magnetic CTA, underline links   | hover        | 180ms
 */
```

Rules for the score:

- Neighbouring chapters never use the same device.
- At least half the chapters are scrubbed, not triggered once.
- Each device is chosen because it explains something about the content: assembly shows how the product is made, a track shows a body of work, stacking shows ordered steps, a reading highlight carries a manifesto.

## 4. Consistency is the craft

- **One direction grammar.** Content arrives from below and leaves upwards. Galleries travel left as you scroll down. Do not have one section fly in from the left and another from the right for no reason.
- **One clock.** All reveals use the personality's duration and stagger. Hover always takes 140–220 ms. The same kind of element always moves the same way.
- **Distance matches duration.** Small moves (8–24 px) are fast; big moves (a full-bleed expand, a camera move) are slow or scrubbed. Never move something 200 px in 300 ms.
- **Overlap, never queue.** The next piece starts before the previous one ends, roughly 60–70% through.
- **A hierarchy of motion.** One signature moment is loud. Supporting sections are quieter versions of the same language. Body text and UI chrome barely move.
- **Ambient budget.** At most one looping ambient element per viewport. Two competing loops look like a screensaver.

## 5. Taste traps

- Fading up every block the same way, then going still. This is the generic agent look.
- Preloaders, intro curtains or a blank hero longer than about 300 ms. Visitors and judges read them as broken.
- Custom cursors that cover button labels, or that replace the system cursor without adding meaning.
- Scroll-jacking: overriding native scroll speed, snapping whole pages, or blocking scroll during an animation.
- Motion with no relation to the content, such as random floating blobs, spinning icons or bounce on serious brands.
- Big blur filters, `transition: all`, animating `width`, `height`, `top` or `left`.
- Effects that only work at 1440 px. Every scrubbed scene needs a phone layout: shorter pins, a native swipe row, or a stacked fallback.

## 6. Self-check before you finish

- Pause on a random scroll position in your contact sheets. Is something there mid-motion or clearly the product of scroll? If most frames look like static slides, add scrubbed scenes.
- Can you name the signature moment in one sentence that only fits this brand?
- Do three random sections look like they were made by the same designer with the same motion voice?
- On the phone sheet, does every scene still work and read?
