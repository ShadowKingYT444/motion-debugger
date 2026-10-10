# Motion critique — A (98/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/runs/norr/treatment-1/site

## Look at the page first

- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-treatment-1/desktop-entrance.png — the first viewport from ~80 ms to 3 s
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-treatment-1/desktop-scroll.png — the whole scroll journey at a glance (rhythm, variety, blank screens)
- desktopDetail1: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-treatment-1/desktop-detail-1.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail2: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-treatment-1/desktop-detail-2.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail3: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-treatment-1/desktop-detail-3.png — scroll frames at a size where type, spacing and alignment are readable
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-treatment-1/mobile.png — the phone layout
- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-treatment-1/hover.png — each control at rest and on hover
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-treatment-1/desktop-full.jpg — one full-page screenshot (scroll scenes appear in their final state)

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, finish, and whether the motion explains something.

## Findings

### [polish] Placeholder text is visible
- Evidence: desktop scrollY 6750px: placeholder text “studio@atelier-norr.example”; mobile scrollY 8261px: placeholder text “studio@atelier-norr.example”
- Fix: Replace placeholder copy, .example addresses and zeroed phone numbers with plausible content (labelled illustrative where needed), or remove the line.

## Motion profile

- Animations observed: 1049 (load 168, scroll 447, hover 434); inline-style JS motion writes: 746
- Easing mix: custom-curve 525, linear 524
- Durations: p10 140 ms · median 280 ms · p90 1400 ms
- Entrance: 2160 ms span, 20 distinct start times
- Sections with motion on scroll: 6/6
- Hover: 6/8 controls respond, 6 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Template likeness: 0/9 default-agent traits
- Finish checks: 24 settled screens measured; 0 mostly-empty screens, 0 hollow boxes, 0 text overlaps, 0 near-miss alignments, 0 edge-crowded texts
- Scroll frames: 0/745 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 0

## Notes

- Desktop journey took 27.6s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
