# Motion critique — D (49/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/runs/halo/control-1/site

## Look at the page first

- craft: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/halo-control-1/craft.png — finish defects outlined on the real frames — fix these first
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/halo-control-1/desktop-entrance.png — the first viewport from ~80 ms to 3 s
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/halo-control-1/desktop-scroll.png — the whole scroll journey at a glance (rhythm, variety, blank screens)
- desktopDetail1: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/halo-control-1/desktop-detail-1.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail2: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/halo-control-1/desktop-detail-2.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail3: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/halo-control-1/desktop-detail-3.png — scroll frames at a size where type, spacing and alignment are readable
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/halo-control-1/mobile.png — the phone layout
- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/halo-control-1/hover.png — each control at rest and on hover
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/halo-control-1/desktop-full.jpg — one full-page screenshot (scroll scenes appear in their final state)

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, finish, and whether the motion explains something.

## Findings

### [major] Interactive elements give no hover feedback
- Evidence: 4/12 distinct controls did not change on hover: Skip to content, Without tuning, Adaptive tuning, Speaker position. Drag it, or us.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [major] Text contrast is too low
- Evidence: 4/145 checked text elements fail WCAG AA, e.g. "Acoustics" 3.82:1, "Amplification" 3.82:1, "Connectivity" 3.82:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Entrance sequence is long
- Evidence: Load animations span 2992 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 154 animations/transitions on height, marginTop, margin-top, max-height, marginLeft; 47 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 17 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: footer#footer > div.wrap.foot__top > div.foot__col > a 350×26, footer#footer > div.wrap.foot__top > div.foot__col > a 350×26, footer#footer > div.wrap.foot__top > div.foot__col > a 350×26, footer#footer > div.wrap.foot__top > div.foot__col > a 350×26
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 5 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [polish] Headings end on a single word
- Evidence: desktop scrollY 4725px: last line is only “crown.”
- Fix: Add `text-wrap: balance` to headings (and `text-wrap: pretty` to paragraphs), or adjust max-width so the last line carries at least two words.

### [polish] The page looks like the default AI-built template
- Evidence: It shares 5 of 9 traits of the landing page coding agents build by default: italic accent word in the headline, near-black ground, pill buttons, grain overlay, marquee.
- Fix: Unless the brief asks for these, change at least four: a display face chosen for this subject, a ground and accent taken from its world, a hero built around one dominant element instead of headline-left/object-right, square or cut button shapes, and sections laid out from their content rather than eyebrow, marquee and bento. A page can earn every trait; it should not get them by default.

## Motion profile

- Animations observed: 925 (load 50, scroll 429, hover 446); inline-style JS motion writes: 3578
- Easing mix: custom-curve 507, default-ease 270, linear 106
- Durations: p10 300 ms · median 600 ms · p90 1250 ms
- Entrance: 2992 ms span, 7 distinct start times
- Sections with motion on scroll: 10/10
- Hover: 8/12 controls respond, 7 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Template likeness: 5/9 default-agent traits (italic accent word in the headline, near-black ground, pill buttons, grain overlay, marquee)
- Finish checks: 29 settled screens measured; 0 mostly-empty screens, 0 hollow boxes, 0 text overlaps, 0 near-miss alignments, 0 edge-crowded texts
- Scroll frames: 64/872 over 50 ms, p95 50.1 ms (headless; indicative) · CLS 0.047

## Notes

- Desktop journey took 53.7s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
