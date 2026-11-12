# PREMIUM.md: Atelier Norr

## Audience and feeling
Municipalities, parish councils, cultural clients and families commissioning a building in the north · feels warm, patient, exact · unlike its category (white boxes and grey photo grids), it feels like standing under timber in low arctic light and watching a frame go up.

## Facts headlines come from
- Founded 2009 by Ingrid Solheim and Anders Vik; 22 architects, model-makers and carpenters; Oslo and Tromsø
- Wood is the only structural material grown by the sun, and the only one the north has in abundance
- Spruce, larch and pine felled within 200 km; average sawmill distance 140 km
- 48 buildings, 31,400 m³ of timber raised, 17 prizes and citations
- Embodied carbon: 620 kg CO₂e/m² concrete-and-steel reference vs 214 studio average (A1–A5, 2019–2025)
- Fjordhall Library: five glulam arches at five scales; untreated pine designed to silver within six years
- Kvarv Chapel: one 16 m slit of light, becomes a lantern for the valley in the dark months
- Tromsø Culture House: north clerestories glow like a row of lanterns November–January; roof craned in nine days
- Process: Listen, Read the site, Draft in timber, Prefabricate (numbered panels), Raise & tend
- Taking a small number of commissions for 2027

## World
- A glulam member, its stacked lamellae and glue lines → layout decision: the page is laminated in horizontal chapters of different thickness, and the 17 and the arches carry visible lamellae
- Falu-red linseed paint on the farm buildings round Skog School, against snow and the blue of the polar night → colour decision: snow, blue-hour and Falu red; timber honey lives only in the imagery and the light
- The studio's site model (they employ model-makers) and the numbered CLT panels trucked north → type decision: a Swedish grotesk with sharp, cut joins for display (Familjen Grotesk), panel-style numbering for stages and projects
Concept: grown by the sun, lit from within. In the north the sun leaves for months, so Norr's timber buildings become the light. Obvious motif we are not using as the hero: a log, a forest, a house silhouette with a sun.

## Type
Display: Familjen Grotesk (Familjen STHLM), 500–700, tight, with cut joins that read like timber joints. Text: Newsreader (opsz), the studio's voice in statements and body. Scale: hero 13vw (max 210px), section titles 56–96px, body 18–19px.

## Colour and light
Ground: blue hour #14304B (hero, work, awards, footer), snow #EEF2F3 (studio, process), Falu red #A23A2B (contact chapter and every primary action). Ink #0F2133 on snow, snow on blue. Timber honey #D9A262 and lamp #FFC877 only in imagery. Light: low sun from the far end of the nave in the hero; lamps from inside every building at night.

## Imagery
Hero: a glulam nave built in SVG, seven parabolic arches receding to a glazed gable at low sun, laminated, rim-lit, hazed by depth, dust in the light. Down the page: a pine cladding sample that silvers (canvas-drawn boards); a carbon comparison set as two material columns, concrete and laminated timber; five built elevations of the projects at blue hour and winter day; the process site model assembled in isometric; a lamellae-filled 17.

## Motion
Personality: Cinematic, because architecture is felt as light, scale and assembly, and the visitor should walk in and watch a building raised. Stack: GSAP + ScrollTrigger + SplitText + Lenis; hero entrance in CSS keyframes so it never waits on the network.
Signature scene: the studio's site model is raised across the five movements — snowy site and walkers, the low winter sun path, glulam frames drawn, numbered panels dropped in, then night falls and the building becomes a lantern.

```
MOTION SCORE — personality: Cinematic
chapter  | device                                                        | trigger        | timing
hero     | camera push into the nave + masked headline; exit: dolly       | load / scroll  | 1.4s expo-out, 90ms stagger; scrub
studio   | statement lights up as read; cladding silvers year 0 → 6       | scrub, no pin  | --p
ledger   | static band: material columns grow, numbers roll from 60%      | in view        | 1.2s expo-out
work     | editorial grid of five elevations, clip wipe + counter-scale   | in view        | 1.2s expo-out, 100ms stagger
process  | SIGNATURE site model raised in five movements, day to night    | scrub 180vh    | --p
awards   | lamellae 17 + index rows rise in reading order                 | in view        | 0.9s, 80ms stagger
contact  | Falu-red chapter, masked heading, enquiry sheet rises          | in view        | 1.0s
footer   | wordmark letters rise                                          | in view        | 1.2s, 60ms stagger
```

## Not doing
- Instrument Serif with an italic accent word, warm paper and grain: the old site's template
- Preloader with a percentage counter: the hero must perform at once
- Marquee of tree species, pill buttons, eyebrow over the headline, custom cursor, side dot-nav
- Flat vector suns and mountain silhouettes: every visual is lit and layered instead
- Pale grey ground with hairlines and monospace labels: colour comes from snow, blue hour and Falu red
- Keeping: numbered sections (they are the panel numbering), because they come from the prefab hall
