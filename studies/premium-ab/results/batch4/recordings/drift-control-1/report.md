# Motion critique — F (24/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/runs/drift/control-1/site

## Look at the page first

- craft: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-control-1/craft.png — finish defects outlined on the real frames — fix these first
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-control-1/desktop-entrance.png — the first viewport from ~80 ms to 3 s
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-control-1/desktop-scroll.png — the whole scroll journey at a glance (rhythm, variety, blank screens)
- desktopDetail1: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-control-1/desktop-detail-1.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail2: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-control-1/desktop-detail-2.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail3: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-control-1/desktop-detail-3.png — scroll frames at a size where type, spacing and alignment are readable
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-control-1/mobile.png — the phone layout
- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-control-1/hover.png — each control at rest and on hover
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-control-1/desktop-full.jpg — one full-page screenshot (scroll scenes appear in their final state)

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, finish, and whether the motion explains something.

## Findings

### [blocker] Reduced-motion visitors lose content
- Evidence: 1 elements stay invisible when prefers-reduced-motion is set: ul.u-list > li.now > span.tick > svg.i "svg".
- Fix: The reduced-motion branch skips the code that reveals content. Make elements visible by default under reduced motion instead of skipping the reveal.

### [major] Interactive elements give no hover feedback
- Evidence: 5/12 distinct controls did not change on hover: Skip to content, Drift, 01 Wind down Tell Drift when you, Auto-drift, Monthly.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [major] Text is drawn at a fraction of its size
- Evidence: 8 element(s) whose glyphs are less than half their font size: mobile scrollY 5568px: “Awake” drawn at 36% of its line height; mobile scrollY 5568px: “REM” drawn at 36% of its line height; mobile scrollY 5568px: “Light” drawn at 36% of its line height.
- Fix: A scale transform never finished, usually a count-up or reveal that scales from 0. Reveal with opacity and a short translate instead, or make sure the final state is scale(1) even when the trigger never fires.

### [minor] Layout properties are animated
- Evidence: 123 animations/transitions on height, width, paddingBottom, padding-bottom, paddingTop; 194 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Hover feedback is sluggish
- Evidence: 3 hover transitions last over 600 ms (e.g. header#nav > div.nav-right > a.btn.btn-sm::before: 900 ms).
- Fix: Hover/press feedback should start immediately and settle in 150–300ms; longer feels laggy under the pointer.

### [minor] Many elements loop forever
- Evidence: 31 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: button#autoBtn 122×26, footer.footer > div.container.foot-grid > div.foot-brand > a.brand 79×28, footer.footer > div.container.foot-grid > nav.foot-col > a 90×24, footer.footer > div.container.foot-grid > nav.foot-col > a 94×24
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 5 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [minor] The page looks like the default AI-built template
- Evidence: It shares 8 of 9 traits of the landing page coding agents build by default: display face Instrument Serif, text face Geist, italic accent word in the headline, near-black ground, small uppercase eyebrow above the headline, pill buttons, grain overlay, marquee.
- Fix: Unless the brief asks for these, change at least four: a display face chosen for this subject, a ground and accent taken from its world, a hero built around one dominant element instead of headline-left/object-right, square or cut button shapes, and sections laid out from their content rather than eyebrow, marquee and bento. A page can earn every trait; it should not get them by default.

### [polish] A few text elements have low contrast
- Evidence: "Scroll" 1.18:1
- Fix: Raise contrast of these elements to at least 4.5:1.

## Motion profile

- Animations observed: 649 (load 99, scroll 288, hover 262); inline-style JS motion writes: 3481
- Easing mix: custom-curve 348, default-ease 223
- Durations: p10 300 ms · median 500 ms · p90 1200 ms
- Entrance: 2580 ms span, 14 distinct start times
- Sections with motion on scroll: 10/10
- Hover: 7/12 controls respond, 6 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Template likeness: 8/9 default-agent traits (display face Instrument Serif, text face Geist, italic accent word in the headline, near-black ground, small uppercase eyebrow above the headline, pill buttons, grain overlay, marquee)
- Finish checks: 29 settled screens measured; 0 mostly-empty screens, 0 hollow boxes, 0 text overlaps, 0 near-miss alignments, 0 edge-crowded texts
- Scroll frames: 13/768 over 50 ms, p95 49.9 ms (headless; indicative) · CLS 0.036

## Notes

- Desktop journey took 38.8s
- External origins requested: https://fonts.googleapis.com, https://cdnjs.cloudflare.com, https://cdn.jsdelivr.net, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
