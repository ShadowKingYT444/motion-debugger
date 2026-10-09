# Motion critique — A (100/100)

Target: demos/norr/treatment

## Look at the page first

- hover: scratchpad/eval3/recordings/norr-treatment-1/hover.png
- desktopEntrance: scratchpad/eval3/recordings/norr-treatment-1/desktop-entrance.png
- desktopScroll: scratchpad/eval3/recordings/norr-treatment-1/desktop-scroll.png
- desktopFull: scratchpad/eval3/recordings/norr-treatment-1/desktop-full.jpg
- mobile: scratchpad/eval3/recordings/norr-treatment-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

No lint findings. Now raise the craft: review the contact sheets against the premium-motion checklist.

## Motion profile

- Animations observed: 1820 (load 128, scroll 603, hover 1089); inline-style JS motion writes: 1380
- Easing mix: linear 1541, custom-curve 275
- Durations: p10 140 ms · median 280 ms · p90 800 ms
- Entrance: 2517 ms span, 15 distinct start times
- Sections with motion on scroll: 9/9
- Hover: 9/9 controls respond, 9 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/925 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.019

## Notes

- Desktop journey took 31.2s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
