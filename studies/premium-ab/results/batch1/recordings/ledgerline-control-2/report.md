# Motion critique — D (53/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab/ledgerline/control-2/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/ledgerline-control-2/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/ledgerline-control-2/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/ledgerline-control-2/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/ledgerline-control-2/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/ledgerline-control-2/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [major] Layout shifts while loading
- Evidence: Cumulative layout shift 0.126.
- Fix: Reserve space for images/media (width/height or aspect-ratio), load fonts with metric-matched fallbacks, and animate entrances with transform rather than inserting space.

### [major] Text contrast is too low
- Evidence: 6/148 checked text elements fail WCAG AA, e.g. "Figures are illustrative marketing numbe" 3.27:1, "POST /v1/transfers · sandbox" 3.19:1, "Press "Send request" to run a simulated " 3.19:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Entrance sequence is long
- Evidence: Load animations span 4375 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 4 animations/transitions on width, top; 1 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 19 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: button#lpause 62×29, div.win.in > div.win-bar > div.tabs > button.tab 53×30, div.win.in > div.win-bar > div.tabs > button.tab 53×30, div.win.in > div.win-bar > div.tabs > button.tab 67×30
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 10 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

## Motion profile

- Animations observed: 695 (load 54, scroll 380, hover 261); inline-style JS motion writes: 1783
- Easing mix: custom-curve 500, default-ease 143
- Durations: p10 250 ms · median 600 ms · p90 1100 ms
- Entrance: 4375 ms span, 17 distinct start times
- Sections with motion on scroll: 10/10
- Hover: 10/12 controls respond, 9 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/853 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.126

## Notes

- Desktop journey took 35.9s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
