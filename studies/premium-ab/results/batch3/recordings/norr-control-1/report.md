# Motion critique — D (57/100)

Target: demos/norr/control

## Look at the page first

- hover: scratchpad/eval3/recordings/norr-control-1/hover.png
- desktopEntrance: scratchpad/eval3/recordings/norr-control-1/desktop-entrance.png
- desktopScroll: scratchpad/eval3/recordings/norr-control-1/desktop-scroll.png
- desktopFull: scratchpad/eval3/recordings/norr-control-1/desktop-full.jpg
- mobile: scratchpad/eval3/recordings/norr-control-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [major] Entrance animations all start at once
- Evidence: 3 load animations share one start time; nothing leads the eye.
- Fix: Give the entrance an order of importance: offset successive elements by 50–100ms (CSS `animation-delay: calc(var(--i) * 70ms)` or a JS stagger) so the headline lands first and supporting elements follow.

### [major] Layout shifts while loading
- Evidence: Cumulative layout shift 3.033.
- Fix: Reserve space for images/media (width/height or aspect-ratio), load fonts with metric-matched fallbacks, and animate entrances with transform rather than inserting space.

### [major] Text contrast is too low
- Evidence: 21/137 checked text elements fail WCAG AA, e.g. "01 Studio philosophy" 4.45:1, "ii." 2.99:1, "iii." 2.99:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Layout properties are animated
- Evidence: 77 animations/transitions on top, height, left, width; 184 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Hover feedback is sluggish
- Evidence: 2 hover transitions last over 600 ms (e.g. div#track > div.panel.panel-outro > a.outro-link > svg: 800 ms).
- Fix: Hover/press feedback should start immediately and settle in 150–300ms; longer feels laggy under the pointer.

## Motion profile

- Animations observed: 1431 (load 7, scroll 765, hover 659); inline-style JS motion writes: 11547
- Easing mix: custom-curve 1077, default-ease 349
- Durations: p10 350 ms · median 1400 ms · p90 1400 ms
- Entrance: 1400 ms span, 1 distinct start times
- Sections with motion on scroll: 7/7
- Hover: 6/8 controls respond, 5 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/1088 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 3.033

## Notes

- Desktop journey took 31.1s
- External origins requested: https://fonts.googleapis.com, https://cdnjs.cloudflare.com, https://cdn.jsdelivr.net, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
