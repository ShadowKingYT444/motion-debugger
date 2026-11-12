# direction: write PREMIUM.md

Decide the world before writing layout. Read the brief, the existing site and its code. Ask the user only what you cannot infer: who it is for, what the visitor must do, and anything pinned (brand colours, fonts, logo, real photos). When working unattended, infer and note your assumptions.

## Decide, in this order

1. **Audience and feeling.** Then name one way this brand should feel *unlike* its category.
2. **Facts.** Five to ten concrete facts from the brief or site: names, numbers, materials, places, actions. Headlines come from these, never from fragment-pair slogans ("Four parts. No seams.").
3. **Three artefacts from the subject's world.** Things a practitioner would recognise: a document, an instrument, a tool, a place, printed matter (a railway timetable, a seed packet, a climbing topo, a race-car livery, a pressing plant's lacquer sleeve). Take one type decision, one colour decision and one layout decision from them, and say which artefact each came from.
4. **Concept.** One idea that the visuals and motion share, grown from the artefacts. Write down the obvious motif for the brief's nouns, then do not make it the hero (no moon for sleep, no glowing ring for a speaker, no code panel for an API).
5. **Type, colour and imagery** (details in typeset.md, palette.md and imagery.md). Name the display and text faces, the ground, ink and accent strategy, the hero visual, and at least three more rich visuals down the page.
6. **Motion personality and score.** Pick a personality from TASTE.md §1 that serves the tension in step 1, and write the motion score from TASTE.md §3. Name the signature scene.
7. **What you will not do.** List the default traits you are deliberately avoiding, and any you are keeping, each with its reason.

## PREMIUM.md

Write it at the project root, short and specific:

```markdown
# PREMIUM.md: <name>

## Audience and feeling
<who> · feels <x> · unlike its category, it feels <y>

## Facts headlines come from
- …

## World
- <artefact 1> → <type decision>
- <artefact 2> → <colour decision>
- <artefact 3> → <layout decision>
Concept: <one sentence>. Obvious motif we are not using as the hero: <motif>.

## Type
Display: <face, why>. Text: <face>. Scale: hero <size>, body <size>.

## Colour and light
Ground <hex>, ink <hex>, accent strategy <…>. Chapters: <…>. Light: <where it comes from>.

## Imagery
Hero: <the visual, what it is made of>. Down the page: <three or more>.

## Motion
Personality: <Silk|Kinetic|Cinematic|Soft>, because <tension it serves>. Stack: <GSAP|Motion|kit>.
Signature scene: <one sentence only this brief could have>.
<motion score table from TASTE.md §3>

## Not doing
- <default trait> because <reason>
```
