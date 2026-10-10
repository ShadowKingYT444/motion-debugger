# Motion critique — A (90/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/runs/drift/treatment-1/site

## Look at the page first

- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-treatment-1/desktop-entrance.png — the first viewport from ~80 ms to 3 s
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-treatment-1/desktop-scroll.png — the whole scroll journey at a glance (rhythm, variety, blank screens)
- desktopDetail1: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-treatment-1/desktop-detail-1.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail2: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-treatment-1/desktop-detail-2.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail3: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-treatment-1/desktop-detail-3.png — scroll frames at a size where type, spacing and alignment are readable
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-treatment-1/mobile.png — the phone layout
- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-treatment-1/hover.png — each control at rest and on hover
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/drift-treatment-1/desktop-full.jpg — one full-page screenshot (scroll scenes appear in their final state)

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, finish, and whether the motion explains something.

## Findings

### [minor] Entrance sequence is long
- Evidence: Load animations span 3900 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Body text is small on mobile
- Evidence: 3 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

## Motion profile

- Animations observed: 529 (load 69, scroll 158, hover 302); inline-style JS motion writes: 1164
- Easing mix: custom-curve 183, linear 346
- Durations: p10 140 ms · median 280 ms · p90 800 ms
- Entrance: 3900 ms span, 17 distinct start times
- Sections with motion on scroll: 7/7
- Hover: 10/11 controls respond, 9 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Template likeness: 0/9 default-agent traits
- Finish checks: 27 settled screens measured; 0 mostly-empty screens, 0 hollow boxes, 0 text overlaps, 0 near-miss alignments, 0 edge-crowded texts
- Scroll frames: 0/772 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.052

## Notes

- Desktop journey took 33.5s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
