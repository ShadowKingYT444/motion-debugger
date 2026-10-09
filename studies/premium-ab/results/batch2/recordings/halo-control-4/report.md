# Motion critique — D (45/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/halo/control-4/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-control-4/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-control-4/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-control-4/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-control-4/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-control-4/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [blocker] Mobile page scrolls sideways
- Evidence: At 390px the document is 31px too wide; offenders: header#nav > a.pill.mono (right 401px), section#top > div.hero-giant (right 413px), main#main > div.marquee > div.marquee-track (right 2868px), main#main > div.marquee > div.marquee-track > span (right 1168px).
- Fix: Make grids collapse (minmax(0,1fr)), let long words wrap (overflow-wrap:anywhere for headings), clamp display type with clamp(), and set overflow-x: clip on sections with off-canvas decoration.

### [major] Text contrast is too low
- Evidence: 37/155 checked text elements fail WCAG AA, e.g. "The object" 4.5:1, "A turned oak foot carries the downward-f" 4.5:1, "Materials" 4.5:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Entrance sequence is long
- Evidence: Load animations span 3679 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 2 animations/transitions on top; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 9 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Body text is small on mobile
- Evidence: 4 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [polish] Some sections are static
- Evidence: Static on scroll: footer (y=13588).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

## Motion profile

- Animations observed: 503 (load 84, scroll 171, hover 248); inline-style JS motion writes: 1006
- Easing mix: default-ease 74, linear 286, custom-curve 117
- Durations: p10 250 ms · median 250 ms · p90 1100 ms
- Entrance: 3679 ms span, 9 distinct start times
- Sections with motion on scroll: 8/9
- Hover: 10/12 controls respond, 8 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/911 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 0.016

## Notes

- Desktop journey took 33.2s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
