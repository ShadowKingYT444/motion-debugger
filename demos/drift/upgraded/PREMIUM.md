# PREMIUM.md: Drift

## Audience and feeling
Light sleepers, shift workers, new parents and couples who have tried sleep apps and found them vague · feels calm and cared-for · unlike its category (moons, stars, dreamy purple, vague promises), it feels **attentive and exact**: a night that is being listened to, minute by minute, and answered with sound.

## Facts headlines come from
- Drift is an AI sleep coach that adapts soundscapes and routines to your night as it happens
- It reads heart rate, movement and room noise from a watch, ring or phone, and re-mixes every few seconds
- Three phases: wind down (routine built around your body clock), drift off and adapt (masking a siren, deepening for slow-wave sleep), wake well (a smart window finds your lightest sleep)
- A night is four or five ninety-minute cycles of light, deep and REM sleep
- The live mix is rain, ocean and a warm hum; a passing siren is masked in 0.8 s
- Night audio is analysed on the phone and never uploaded
- 4.9 from 12,400 beta sleepers; beta open on iOS and Android
- Free, Plus $8.99, Duo $12.99 a month; 7-day free trial; save up to 44% yearly
- Illustrative outcome figures (−18 min to sleep, +27% deep sleep, −38% awakenings, 94% more rested), labelled as illustrative

## World
- **The sleep-lab hypnogram printout** (a polysomnography chart: a stepped trace through Awake, REM, Light and Deep against clock hours) → layout: the signature scene is a night laid out on a time axis, 10 PM to 6:40 AM, and clock times head the story instead of numbered eyebrows
- **The bedside clock** → type: clock numerals are the display image (huge, light, tabular), set in a grotesk with an optical-size axis so one family carries both the 20vw clock and the small chart labels
- **The sky through a bedroom window across one night** (blue hour, ink, first light, sunrise) → colour: the ground *is* the time of night; chapters cross-fade from cobalt blue hour to ink to pale first light to apricot sunrise
- **Linen sheets** → material: the hero visual is a lit, folded surface that is both a sheet and a slow sound wave

Concept: **the sound you sleep under.** Drift's soundscape is drawn as a sheet laid over your night: it billows when you arrive, ripples when the street gets loud or the pointer moves, and smooths as you settle. The same surface becomes the instrument in the lab and the sunrise at the end.
Obvious motif we are not using as the hero: the moon and stars (the brand's small crescent logo stays, as the logo only).

## Type
Display: **Bricolage Grotesque** (variable opsz/wdth/wght), light weight, condensed width at display sizes. Its ink-trapped forms read as precise printed instrument lettering at small sizes and soften at 96 opsz; its numerals carry the clock. Text: **Atkinson Hyperlegible Next**, designed for legibility at low vision, readable with eyes half closed at 2 a.m. Scale: hero clamp(64px, 11.2vw, 196px), section titles clamp(40px, 5vw, 80px), clock numerals up to 20vw, body 18px.

## Colour and light
Chapters (ground / ink): blue hour `#1b2c7c` / `#f4f1ea` (hero) → night `#0a1030` / `#e8ebf6` (night scene, lab) → before dawn `#262a5c` (science) → first light `#e9eaf3` / `#141a40` (features, plans) → sunrise peach `#f6d8c6` (stories) → sunrise `#f59c70` / `#2a1430` (download) → night footer.
Accent strategy: the ground carries colour; the UI stays linen and ink. **Apricot `#ffb08a`** is reserved for actions and for the wake window. Sleep stages have a fixed data palette used only in charts: Awake apricot, REM lilac `#cdb0ff`, Light sky `#9cc0ff`, Deep cobalt `#5b78ff`; sound layers rain `#bfe3ff`, ocean `#7fd8c8`, hum `#ffcd95`.
Light: a cool window light from the upper right (key) and a low warm bedside lamp from the lower left (fill). Shadows are tinted by the ground.

## Imagery
Hero: a WebGL folded sheet in perspective (three planes: fogged far folds, lit mid folds, large near folds), cobalt with a satin sheen, pointer ripples, live annotations pinned to it (heart rate, room dB, wake window). Down the page: (1) the scored night: hypnogram + sound streamgraph drawn by scroll with a running clock; (2) the lab: the same sheet driven live by the mix sliders; (3) the cycle diagram and stats; (4) the live app: the morning screen and the coach conversation typing itself; (5) the sheet again at sunrise for the download.

## Motion
Personality: **Silk**, because the tension is "attentive and exact" against a vague, dreamy category: patient expo-out, masked lines, slow depth. Stack: GSAP + ScrollTrigger + SplitText + Lenis (plain HTML).
Signature scene: **one night, scored**: scrolling runs the clock from 10:00 PM to 6:24 AM while your sleep stages draw as a hypnogram and Drift's rain, ocean and hum re-mix beneath it, masking a 2:50 a.m. siren and opening the wake window in first light.

```
MOTION SCORE — personality: Silk, because Drift should feel patient and exact where sleep apps feel vague
chapter   | device                                                        | trigger         | timing
hero      | masked line rise + the sheet billows and settles (amp 2.2→1,  | load            | 1.1s lines, 100ms stagger; sheet 1.5s
          | camera 1.1→1); exit: type drifts up, the sheet calms + darkens| scrub on leave  | --
night     | SIGNATURE: hypnogram + sound stream draw to a playhead, clock | scrub 180vh     | --p, scrub .8
          | runs, phases swap in place, wake window glows at the end      |                 |
lab       | static console over the live sheet (interactive, not scrubbed)| in view         | 0.9s, 100ms stagger
science   | statement lights up as it is read; cycle rings draw; stats    | scrub / in view | 1.2s; count from 60%
          | count from 60%                                                 |                 |
features  | phone clip-reveal + counter-scale; coach chat types itself    | in view         | 1.1s, 110ms
stories   | big quote masked line rise; small quotes stagger              | in view         | 1s, 100ms
plans     | plan rows stagger; prices roll on the billing toggle          | in view / click | 0.9s; 0.5s
download  | the sheet at sunrise; headline masked rise                    | in view         | 1.2s
```

## Not doing
- Instrument Serif / Geist / italic accent words: replaced by a grotesk with numerals and a hyperlegible text face
- Indigo-to-purple night sky with stars and a moon: replaced by blue hour → ink → first light chapters and a sheet
- Eyebrow pill, numbered kickers, marquee, bento, glass cards, grain overlay: removed; sections take layouts from their content
- Three pricing cards with a dark "Most loved": replaced by three plan rows, Plus marked with the apricot wake colour
- Pill buttons: 6px radius with a fill wipe
- A fixed night-clock widget on every screen: the clock now lives inside the signature scene where it means something
- Kept on purpose: a dark ground for the night chapters (it is a sleep product, and the page turns light at dawn); the crescent logo
