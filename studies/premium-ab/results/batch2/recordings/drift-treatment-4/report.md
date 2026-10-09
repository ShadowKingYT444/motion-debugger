# Motion critique — A (98/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/drift/treatment-4/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-treatment-4/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-treatment-4/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-treatment-4/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-treatment-4/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-treatment-4/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [polish] Some sections are static
- Evidence: Static on scroll: footer.footer (y=13741).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

## Motion profile

- Animations observed: 555 (load 41, scroll 180, hover 334); inline-style JS motion writes: 1473
- Easing mix: spring-or-steps 2, custom-curve 177, linear 358
- Durations: p10 140 ms · median 280 ms · p90 800 ms
- Entrance: 2408 ms span, 13 distinct start times
- Sections with motion on scroll: 8/9
- Hover: 9/12 controls respond, 9 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/865 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.002

## Notes

- Desktop journey took 33.8s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
