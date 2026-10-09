# Motion critique — C (72/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/ledgerline/control-4/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/ledgerline-control-4/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/ledgerline-control-4/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/ledgerline-control-4/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/ledgerline-control-4/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/ledgerline-control-4/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [major] Layout shifts while loading
- Evidence: Cumulative layout shift 0.551.
- Fix: Reserve space for images/media (width/height or aspect-ratio), load fonts with metric-matched fallbacks, and animate entrances with transform rather than inserting space.

### [minor] Entrance sequence is long
- Evidence: Load animations span 8001 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 26 animations/transitions on width, left, top; 24 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Tap targets are small on mobile
- Evidence: button#feedToggle 57×28, button#copyBtn 54×32, div#qDots > button.done 55×24, div#qDots > button.on 55×24
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [polish] A few text elements have low contrast
- Evidence: "Annual −20%" 1:1, "−20%" 1.06:1
- Fix: Raise contrast of these elements to at least 4.5:1.

## Motion profile

- Animations observed: 512 (load 53, scroll 252, hover 207); inline-style JS motion writes: 306
- Easing mix: custom-curve 359, default-ease 141
- Durations: p10 200 ms · median 600 ms · p90 900 ms
- Entrance: 8001 ms span, 25 distinct start times
- Sections with motion on scroll: 9/9
- Hover: 9/12 controls respond, 8 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/847 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.551

## Notes

- Desktop journey took 31.8s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
