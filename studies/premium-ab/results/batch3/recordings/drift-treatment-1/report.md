# Motion critique — A (100/100)

Target: demos/drift/treatment

## Look at the page first

- hover: scratchpad/eval3/recordings/drift-treatment-1/hover.png
- desktopEntrance: scratchpad/eval3/recordings/drift-treatment-1/desktop-entrance.png
- desktopScroll: scratchpad/eval3/recordings/drift-treatment-1/desktop-scroll.png
- desktopFull: scratchpad/eval3/recordings/drift-treatment-1/desktop-full.jpg
- mobile: scratchpad/eval3/recordings/drift-treatment-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

No lint findings. Now raise the craft: review the contact sheets against the premium-motion checklist.

## Motion profile

- Animations observed: 2740 (load 82, scroll 976, hover 1682); inline-style JS motion writes: 997
- Easing mix: linear 1905, custom-curve 790
- Durations: p10 140 ms · median 160 ms · p90 280 ms
- Entrance: 1801 ms span, 13 distinct start times
- Sections with motion on scroll: 9/9
- Hover: 9/12 controls respond, 7 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/855 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.008

## Notes

- Desktop journey took 32.6s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
