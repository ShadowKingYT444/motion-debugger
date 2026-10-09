# Motion critique — D (54/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/drift/control-4/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-control-4/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-control-4/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-control-4/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-control-4/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-control-4/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [major] Interactive elements give no hover feedback
- Evidence: 4/12 distinct controls did not change on hover: Skip to content, Drift, 01Listen, Monthly.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [major] Scrolling drops frames
- Evidence: 202/386 frames took >50 ms during scroll (p95 66.8 ms, headless Chromium).
- Fix: Avoid scroll handlers that read layout and write styles each event; use transforms on composited layers, IntersectionObserver or CSS scroll-driven animations, and limit blur/backdrop-filter on large or many elements.

### [minor] Layout properties are animated
- Evidence: 23 animations/transitions on height, width; 21 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 39 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: section#top > a.scroll-cue 24×40, footer.footer > div.wrap.foot-grid > nav > a 84×23, footer.footer > div.wrap.foot-grid > nav > a 81×23, footer.footer > div.wrap.foot-grid > nav > a 59×23
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 5 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [polish] Some sections are static
- Evidence: Static on scroll: footer.footer (y=11382).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

### [polish] A few text elements have low contrast
- Evidence: "Yearly save 37%" 1.06:1, "save 37%" 1.06:1
- Fix: Raise contrast of these elements to at least 4.5:1.

## Motion profile

- Animations observed: 440 (load 75, scroll 164, hover 201); inline-style JS motion writes: 292
- Easing mix: custom-curve 191, default-ease 173
- Durations: p10 300 ms · median 500 ms · p90 1100 ms
- Entrance: 2251 ms span, 10 distinct start times
- Sections with motion on scroll: 8/9
- Hover: 8/12 controls respond, 7 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 202/386 over 50 ms, p95 66.8 ms (headless; indicative) · CLS 0.056

## Notes

- Desktop journey took 44.8s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
