# motion: choreograph the page

Read TASTE.md first. Use the personality and score in `PREMIUM.md`; if there is none, pick a personality from TASTE.md §1 and write the score before coding. Pick the stack from SKILL.md §The motion stack. With GSAP, follow references/motion-stack.md.

## 1. Strip what is there

Record the page (`motion-debugger critique <target>`) and read its motion findings and `desktop-entrance.png`. Remove:

- Identical fade-ups on every section, and `animate-in`/`fade-in` utilities applied page-wide
- Linear easing on anything but scrubs and loops; `transition: all`; animated `width`, `height`, `top` or `left`
- Preloaders and intro curtains longer than about 300ms; blurs over 12px; spinning or bouncing decoration
- Scroll-jacking: anything that changes scroll speed per section, snaps whole pages, or blocks scroll during an animation

## 2. The hero entrance and exit

One timeline, overlapping, settled by about 1.6s:

1. Frame 0: the nav and the hero's background or ground are already there. Nothing is blank.
2. The headline lands first, in masked lines or words rising from below (60–110ms stagger, expo-out).
3. The visual arrives on its own track, overlapping the headline: a clip-path wipe with an inner counter-scale (1.15 → 1), a camera push, or its parts assembling.
4. Sub-copy, then the actions, start before the headline finishes (about 60–70% through).
5. One ambient element keeps living afterwards: light that drifts, a field that breathes, a live number. Only one.
6. As you scroll away, the hero leaves: content drifts up and fades, or the visual pushes through. It never just scrolls off.

## 3. Reveals by content type

Never animate twelve things identically. Match the reveal to what the element is, and keep one clock (the personality's duration and stagger):

| Content | Reveal |
| --- | --- |
| Section headings | Masked line rise; long headings by line, short ones by word |
| Images and visuals | Clip-path reveal with a counter-scale inside, or a parallax layer that settles |
| Numbers and stats | Count up from about 60% of the value, never from 0, tabular figures |
| Diagrams, routes, charts | Strokes draw, bars grow from their baseline, points arrive in data order |
| Lists, cards, logos | Stagger 50–90ms in reading order, small rise with a slight scale (0.98 → 1) |
| Body copy | Simple opacity and a short rise, or nothing; body text barely moves |
| Statements | Words brighten as they are read (a scrubbed reading highlight), floor at 0.45 opacity |

Content in view settles within about 900ms. Hide reveal targets only after JavaScript has run, and reveal anything already scrolled past.

## 4. Interaction

- **Every control** changes at least two of fill, text colour, border and icon position on hover, in 140–220ms, and compresses to 0.97 on press. A 2px lift or a glow alone does not count.
- **The primary action** gets a fill wipe or invert, and optionally a magnetic pull of 0.2–0.35.
- **Links** grow a full underline from the left; arrows move 3–4px.
- **Cards** change surface colour or reveal an image, not just their shadow.
- **Pointer-reactive light** (a spotlight following the cursor on a dark surface) works on one or two hero surfaces at most.
- **Focus** is visible and styled in the brand voice.

## 5. Page-level motion

- **Smooth scroll** (Lenis) suits the Silk and Cinematic personalities on desktop. Skip it for Kinetic, on phones and under reduced motion. It must not change scroll distance or block native behaviour.
- **Chapter colour:** cross-fade the page ground between chapters, with a light-to-dark turn at a meaningful point.
- **Nav:** compacts after the first scroll, hides going down and returns going up, and is never hidden while it holds focus.

## 6. Verify

```bash
motion-debugger critique <target>
```

- `desktop-entrance.png`: the headline first, overlap, nothing blank in frame 0, settled by about 1.6s.
- No `entrance-not-staggered`, `linear-movement`, `motion-stops-after-hero`, `controls-without-hover`, `focus-invisible` or `scroll-jank` findings.
- `hover.png`: every control visibly changes in a still.
- Interrupt it yourself, or through the evidence tools: hover in and out quickly, scroll down and back up mid-reveal, resize. Motion should reverse smoothly and never leave an element half-shown.
- Reduced motion keeps every piece of content and drops travel, parallax, scrub and loops.
