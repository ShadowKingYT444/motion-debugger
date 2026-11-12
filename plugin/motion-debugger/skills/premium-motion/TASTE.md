# Motion taste

Read this before `motion` and `signature`. SKILL.md routes the commands and runs the critique loop; this file sets how the page moves and how ambitious that motion should be.

Most agent-built sites are *animated*: things fade up once, then the page is still. Award-level sites are *choreographed*: one motion personality runs through the page, one signature scene is built to the last frame, and every still taken while scrolling looks designed. Finish beats quantity. Three effects done perfectly read as premium; seven effects with dimmed lists, empty pins and half-revealed text read as a template.

## 1. Pick one motion personality from the brief's tension

Start from the sentence in `PREMIUM.md` (commands/direction.md step 1): the way this brand should feel *unlike* its category. Pick the personality that serves that tension, not the one its category usually gets. Write it at the top of your CSS and use only its easing, timing and devices. Mixing personalities is what makes motion look cheap.

| Personality | Feels | Easing and timing | Stagger | Typical devices |
| --- | --- | --- | --- | --- |
| **Silk** | patient, exact, expensive | expo-out `cubic-bezier(.16,1,.3,1)`, reveals 900–1200 ms | 90–120 ms | line-by-line masked type, image wipes with inner counter-scale, slow parallax depth, expanding media, chapter colour shifts |
| **Kinetic** | fast, precise, confident | quint-out `cubic-bezier(.22,1,.36,1)`, 450–750 ms | 40–60 ms | scramble/resolve type, horizontal tracks, velocity-skewed type, live product UI, numbers that roll, rules that draw |
| **Cinematic** | big, staged, awe | expo-out in, `cubic-bezier(.65,0,.35,1)` for camera moves, 900–1400 ms | 80–110 ms | a pinned scene that assembles or turns with scroll, zoom-through, light sweeps, a hero that recedes as you leave |
| **Soft** | warm, easy, human | `cubic-bezier(.33,1,.68,1)`, 800–1200 ms, gentle springs | 100–140 ms | blur-to-sharp reveals, words that brighten as you read, slow drifting forms, colour transitions between chapters |

Every personality still uses 140–220 ms for hover and press, and `linear` only for loops and scrubs.

## 2. Ambition: one signature scene, finished

1. **A layered hero entrance.** The headline arrives in masked pieces first, the visual on its own track, and one ambient element stays alive afterwards. Everything settles by about 1.6 s. As the visitor scrolls away, the hero *leaves* rather than just scrolling off: it drifts up and fades (`data-exit`) or the visual zooms through.
2. **One signature scroll scene**, chosen because it explains something about this subject, built to final quality. Scroll progress drives it continuously. Options:
   - a pinned assembly, explode or camera move (`data-progress` with a sticky stage)
   - a horizontal track through a body of work (`data-hscroll`)
   - ordered steps that stack (`data-stack`)
   - media that opens to full bleed (`data-expand`)
   - a diagram or route that draws (`data-draw="scrub"`)
   - a statement that lights up as it is read (`data-read`)
3. **At most two supporting scrubbed scenes**, of a different kind from the signature and from each other.
4. **Pins are short and always changing.** A desktop pin is at most 180vh, and something visible changes every ~300px of scroll. A still taken anywhere inside it is a designed frame, not a dimmed list or an empty stage. On phones, pins are shorter or become a stacked layout.
5. **Everything else gets a strong static layout**: a different grid, scale or colour, with a simple reveal. Not another effect.
6. **Tactile, visible interaction.** The primary CTA has a fill change (wipe, invert), cards change surface, links grow an underline, arrows move, presses compress, focus is visible. All of it uses the same timing tokens.

Kinetic type, a living visual (a canvas or SVG field, or a product UI that demos itself) and chapter colour transitions are welcome when the direction asks for them. They are not a checklist.

## 3. Write a motion score before coding

Fill in this table in a comment at the top of your CSS or JS, with your own chapters. It is the plan the page is built and reviewed against.

```
/* MOTION SCORE — personality: <one of the four>, because <the tension it serves>
 * chapter        | device                          | trigger          | timing
 * hero           | <entrance> + <exit>             | load / scroll    | <duration>, <stagger>
 * <chapter>      | <signature scene>               | scrub <≤180vh>   | --p
 * <chapter>      | <static layout + simple reveal> | in view          | <duration>
 * <chapter>      | <supporting scene>              | scrub            | --p
 * …
 */
```

Rules for the score:

- Neighbouring chapters never use the same device.
- Each scrubbed device is chosen because it explains the content: assembly shows how something is made, a track shows a body of work, stacking shows ordered steps, a reading highlight carries one statement.
- At most three scrubbed chapters in total.

## 4. Consistency is the craft

- **One direction grammar.** Content arrives from below and leaves upwards. Galleries travel left as you scroll down.
- **One clock.** All reveals use the personality's duration and stagger. Hover always takes 140–220 ms. The same kind of element always moves the same way.
- **Distance matches duration.** Small moves (8–24 px) are fast; big moves (a full-bleed expand, a camera move) are slow or scrubbed. Never move something 200 px in 300 ms.
- **Overlap, never queue.** The next piece starts before the previous one ends, roughly 60–70% through.
- **A hierarchy of motion.** The signature scene is loud. Supporting sections are quieter versions of the same language. Body text and UI chrome barely move.
- **Ambient budget.** At most one looping element per viewport.

## 5. Taste traps

- Fading up every block the same way, then going still.
- Preloaders, intro curtains or a blank hero longer than about 300 ms.
- Stills that look broken: inactive steps at 0.2 opacity, words dimmed to grey, counters at 0, headings caught mid-mask, a pinned stage that is empty for half its length.
- Moving an active or hovered item sideways off its column edge.
- Custom cursors that cover button labels or replace the system cursor without adding meaning.
- Scroll-jacking: overriding native scroll speed, snapping whole pages, blocking scroll during an animation.
- Motion with no relation to the content: random floating blobs, spinning icons, bounce on serious brands.
- Big blur filters, `transition: all`, animating `width`, `height`, `top` or `left`.
- Effects that only work at 1440 px.

## 6. Self-check before you finish

- Pause on a random scroll position in the detail sheets. Is the frame designed, with something there mid-motion or clearly the product of scroll, and nothing faint or empty?
- Can you name the signature scene in one sentence that only fits this brief?
- Do three random sections look like the same designer with the same motion voice, but with different layouts?
- On the phone sheet, does every scene still work and read?
