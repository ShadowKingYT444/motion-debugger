# Motion critique — B (78/100)

Target: demos/halo/control

## Look at the page first

- hover: scratchpad/eval3/recordings/halo-control-1/hover.png
- desktopEntrance: scratchpad/eval3/recordings/halo-control-1/desktop-entrance.png
- desktopScroll: scratchpad/eval3/recordings/halo-control-1/desktop-scroll.png
- desktopFull: scratchpad/eval3/recordings/halo-control-1/desktop-full.jpg
- mobile: scratchpad/eval3/recordings/halo-control-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [minor] Entrance sequence is long
- Evidence: Load animations span 5349 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 104 animations/transitions on paddingBottom, padding-bottom, paddingTop, padding-top, height; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Tap targets are small on mobile
- Evidence: div.hero-foot > div.hero-lede > div.cta-row > a.link-arrow 134×28, ol#steps > li > button.step-h 350×33, ol#steps > li > button.step-h 350×33, ol#steps > li > button.step-h 350×33
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 3 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [polish] Some sections are static
- Evidence: Static on scroll: footer.foot (y=15318).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

## Motion profile

- Animations observed: 807 (load 25, scroll 298, hover 484); inline-style JS motion writes: 2851
- Easing mix: default-ease 170, custom-curve 284, linear 344
- Durations: p10 150 ms · median 300 ms · p90 1200 ms
- Entrance: 5349 ms span, 11 distinct start times
- Sections with motion on scroll: 8/9
- Hover: 11/12 controls respond, 9 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/1142 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.057

## Notes

- Desktop journey took 35.7s
- External origins requested: https://fonts.googleapis.com, https://cdn.jsdelivr.net, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
