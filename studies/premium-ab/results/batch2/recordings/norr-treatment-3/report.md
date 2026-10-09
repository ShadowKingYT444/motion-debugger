# Motion critique — A (95/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/norr/treatment-3/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-treatment-3/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-treatment-3/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-treatment-3/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-treatment-3/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-treatment-3/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [minor] Layout properties are animated
- Evidence: 0 animations/transitions on layout; 46 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

## Motion profile

- Animations observed: 190 (load 51, scroll 63, hover 76); inline-style JS motion writes: 951
- Easing mix: custom-curve 156, linear 33
- Durations: p10 160 ms · median 800 ms · p90 1100 ms
- Entrance: 2060 ms span, 20 distinct start times
- Sections with motion on scroll: 6/6
- Hover: 8/8 controls respond, 8 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/797 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.003

## Notes

- Desktop journey took 28s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
