# Motion critique — A (98/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/halo/treatment-4/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-treatment-4/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-treatment-4/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-treatment-4/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-treatment-4/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-treatment-4/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [polish] A few text elements have low contrast
- Evidence: "Halo 360°" 1.04:1
- Fix: Raise contrast of these elements to at least 4.5:1.

## Motion profile

- Animations observed: 672 (load 98, scroll 252, hover 322); inline-style JS motion writes: 461
- Easing mix: custom-curve 422, linear 241
- Durations: p10 160 ms · median 300 ms · p90 800 ms
- Entrance: 1914 ms span, 25 distinct start times
- Sections with motion on scroll: 9/9
- Hover: 9/10 controls respond, 8 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/881 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.004

## Notes

- Desktop journey took 31s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
