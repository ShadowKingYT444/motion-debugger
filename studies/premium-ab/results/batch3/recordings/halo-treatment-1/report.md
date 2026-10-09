# Motion critique — A (95/100)

Target: demos/halo/treatment

## Look at the page first

- hover: scratchpad/eval3/recordings/halo-treatment-1/hover.png
- desktopEntrance: scratchpad/eval3/recordings/halo-treatment-1/desktop-entrance.png
- desktopScroll: scratchpad/eval3/recordings/halo-treatment-1/desktop-scroll.png
- desktopFull: scratchpad/eval3/recordings/halo-treatment-1/desktop-full.jpg
- mobile: scratchpad/eval3/recordings/halo-treatment-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [minor] Layout properties are animated
- Evidence: 2 animations/transitions on width; 15 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

## Motion profile

- Animations observed: 1737 (load 121, scroll 621, hover 995); inline-style JS motion writes: 1284
- Easing mix: custom-curve 363, linear 1368
- Durations: p10 140 ms · median 160 ms · p90 800 ms
- Entrance: 1961 ms span, 15 distinct start times
- Sections with motion on scroll: 12/12
- Hover: 7/7 controls respond, 6 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 1/958 over 50 ms, p95 33.4 ms (headless; indicative) · CLS 0.007

## Notes

- Desktop journey took 32.4s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
