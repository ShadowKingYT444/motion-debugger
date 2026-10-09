# Motion critique — D (47/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/norr/control-4/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-control-4/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-control-4/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-control-4/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-control-4/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-control-4/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [blocker] Mobile page scrolls sideways
- Evidence: At 390px the document is 16px too wide; offenders: html.js.ready > body > div.progress > i (right 406px), section#hero > div.hero-scene > div.layer.far (right 406px), section#hero > div.hero-scene > div.layer.far > svg (right 406px), div.hero-scene > div.layer.far > svg > path (right 1032px).
- Fix: Make grids collapse (minmax(0,1fr)), let long words wrap (overflow-wrap:anywhere for headings), clamp display type with clamp(), and set overflow-x: clip on sections with off-canvas decoration.

### [major] Desktop page scrolls horizontally
- Evidence: Document is 20px wider than the viewport: section#hero > div.hero-scene > div.layer.far, section#hero > div.hero-scene > div.layer.far > svg, div.hero-scene > div.layer.far > svg > path.
- Fix: Contain decorative/offscreen elements with overflow: clip on their section, and avoid 100vw widths alongside a scrollbar.

### [minor] Entrance sequence is long
- Evidence: Load animations span 7249 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 72 animations/transitions on height, marginLeft, margin-left, marginTop, margin-top; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 12 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: div#hsTrack > div.hs-outro > a.link-arrow 229×30, footer.foot > div.wrap.foot-row > span.foot-links > a 69×20, footer.foot > div.wrap.foot-row > span.foot-links > a 57×20, footer.foot > div.wrap.foot-row > span.foot-links > a 51×20
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

## Motion profile

- Animations observed: 495 (load 97, scroll 123, hover 275); inline-style JS motion writes: 1635
- Easing mix: linear 208, custom-curve 194, default-ease 79
- Durations: p10 250 ms · median 444 ms · p90 1300 ms
- Entrance: 7249 ms span, 35 distinct start times
- Sections with motion on scroll: 6/6
- Hover: 7/9 controls respond, 7 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/781 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 0.049

## Notes

- Desktop journey took 28.5s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
