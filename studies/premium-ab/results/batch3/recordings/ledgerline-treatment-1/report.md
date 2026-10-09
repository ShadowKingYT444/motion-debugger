# Motion critique — A (98/100)

Target: demos/ledgerline/treatment

## Look at the page first

- hover: scratchpad/eval3/recordings/ledgerline-treatment-1/hover.png
- desktopEntrance: scratchpad/eval3/recordings/ledgerline-treatment-1/desktop-entrance.png
- desktopScroll: scratchpad/eval3/recordings/ledgerline-treatment-1/desktop-scroll.png
- desktopFull: scratchpad/eval3/recordings/ledgerline-treatment-1/desktop-full.jpg
- mobile: scratchpad/eval3/recordings/ledgerline-treatment-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [polish] A few text elements have low contrast
- Evidence: "sandbox · sample data" 1.73:1
- Fix: Raise contrast of these elements to at least 4.5:1.

## Motion profile

- Animations observed: 2220 (load 62, scroll 1007, hover 1151); inline-style JS motion writes: 1276
- Easing mix: custom-curve 276, linear 1943
- Durations: p10 160 ms · median 280 ms · p90 280 ms
- Entrance: 1206 ms span, 11 distinct start times
- Sections with motion on scroll: 11/11
- Hover: 11/12 controls respond, 11 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 2/937 over 50 ms, p95 33.3 ms (headless; indicative) · CLS 0.004

## Notes

- Desktop journey took 35.6s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
