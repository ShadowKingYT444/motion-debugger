# PREMIUM.md: Halo 02

## Audience and feeling
People who furnish a home slowly and buy Danish design objects (a Louis Poulsen lamp, a Kvadrat throw) and want good sound without a black box on the shelf · feels calm, crafted, domestic · unlike its category (dark, glowing, spec-sheet bravado), it feels like a lamp you listen to: one warm object in a blue-hour room.

## Facts headlines come from
- Seven drivers in one circle: six 50 mm full-range drivers 60° apart, one 165 mm long-throw woofer firing into the floor
- 360° dispersion within ±2 dB, so the best seat in the house is every seat
- Ø218 × 340 mm, 4.8 kg, one turned aluminium crown, one seamless knitted sleeve
- 96 LEDs behind an opal diffuser, 2700 K only; the ring never blinks for a notification
- Knitted in Herning on Danish looms, about 26,000 stitches; aluminium 100% recycled, anodised in-house
- Adaptive Room Tuning: a six-second sweep, six microphones
- Tuned, signed and numbered by one person; first edition of 2,000, ships February 2027
- €1,290, stereo pair €2,390; €100 refundable deposit; designed in a harbour workshop on Refshaleøen, Copenhagen

## World
- 1970s Danish hi-fi faceplates and the laser-etched serial on the aluminium base → type: Archivo pushed to its widest cut (wdth 125) at light weights, like engraving on brushed metal; the same family at normal width for text
- Copenhagen in February at blue hour, one 2700 K lamp lit inside → colour: a harbour-blue dusk ground with fog-grey daylight chapters; warm light is the only warm colour and belongs to light (the ring, its glow) and the one action that "lights" (Pre-order)
- The signed tuning certificate that ships with each numbered speaker → layout: the specification is a certificate card with a drawn response curve, and serial numerals ("No. 0001") are treated as typography
Concept: sound spreads like lamplight, evenly from one point, so the page shows sound as warm light on a cool room. Obvious motif we are not using as the hero: a glowing ring floating on black.

## Type
Display: Archivo, wdth 125, wght 250–400, tracking −0.035em: engraved, wide, quiet. Text: Archivo wdth 100, 400/600. Scale: hero 6.6vw (≈95px at 1440), section titles clamp(40px, 5vw, 76px), body 17–18px. Tabular figures on all numbers.

## Colour and light
Dusk #1f3344, night #15232f, fog #dfe5e3, ink on dusk #eef0ea, ink on fog #13212c, lamp #ffb36b (2700 K). Accent strategy: warm is reserved for light and the primary action; everything else is blue-grey. Chapters: dusk (hero) → fog (idea) → night (anatomy, the dramatic turn) → fog (room) → wool, following the chosen colourway (materials) → dusk (features) → fog with a paper certificate (specs) → dusk (pre-order) → night (footer). Light: cool window light from the upper left; warm light from the speaker's ring, falling on the floor around it.

## Imagery
Hero: a blue-hour room in three planes: a tall window of cool light with its shaft on the floor, the speaker (procedural canvas render with knitted texture), its warm pool of light, and the headline flanking it. Down the page: an exploded axis drawing of the seven parts (SVG, scrubbed); two directivity plots with a listener walking round them; the room heat map in dusk-to-lamp colours (interactive); a macro of the knit, a turned-aluminium disc and a 2700 K scale; five manual pictograms that draw; a certificate with a drawn frequency response curve.

## Motion
Personality: Silk, because the brand must feel patient and exact, a lamp not a gadget. Stack: GSAP + ScrollTrigger + SplitText from jsDelivr; hero entrance in CSS keyframes so it never waits for the network. Native scroll (no Lenis) to keep scroll honest.
Signature scene: the finished speaker sheds its knitted sleeve and comes apart along its own axis as you scroll, crown lifting, the light ring separating, the six-driver ring, chamber and floor-firing woofer opening out, each part labelled where it sits, ending on the complete exploded drawing.

```
MOTION SCORE — personality: Silk, because Halo should feel like a lamp in a quiet room, not a gadget
chapter      | device                                              | trigger          | timing
hero         | masked line rise, speaker clip-wipe + counter-scale | load (CSS)       | 1.1s, 100ms stagger, settled 1.5s
             | exit: lines part sideways, speaker sinks back       | scrub            | --p
idea         | statement by masked lines, numerals rise            | in view          | 1.0s, 100ms
anatomy      | SIGNATURE: exploded axis, labels land in place      | scrub 180vh      | power2.inOut inside
room         | directivity walk: listener circles both plots       | scrub (no pin)   | --p
             | heat map clip reveal, then a live drag demo         | in view          | 1.2s
materials    | chapter ground follows the colourway; tiles stagger | click / in view  | 0.8s / 100ms
features     | manual pictograms draw, rows rise                   | in view          | 1.0s, 100ms
specs        | certificate rises, response curve draws             | in view          | 1.6s draw
pre-order    | heading lines; second speaker slides in for a pair  | in view / click  | 0.9s
hover/press  | fill wipe, arrow 4px, press .97                     | pointer          | 180ms quint-out
```

## Not doing
- Instrument Serif with italic accent words, Inter Tight, DM Mono labels: the default; replaced by one engraved wide face
- Near-black with amber: warm stays, but only as light on a blue room
- Loader, custom cursor, grain, marquee, progress rail: the loader hid the hero for 7 s; the rest is decoration
- Four scrubbed scenes and a horizontal card track: one signature scene, one unpinned supporting scrub
- Pill buttons and identical feature cards: square-shouldered controls; features become a manual page with drawn pictograms
- Counters from 0, words dimmed to grey: numbers are written final, statements are set full strength
- Keeping: the procedural speaker renderer and the room simulation (they are the product's own visuals), every fact, the form, FAQ and colourway picker
