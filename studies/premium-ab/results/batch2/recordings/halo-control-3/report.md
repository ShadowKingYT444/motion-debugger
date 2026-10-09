# Motion critique — C (69/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/halo/control-3/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-control-3/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-control-3/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-control-3/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-control-3/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/halo-control-3/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [major] Interactive elements give no hover feedback
- Evidence: 4/12 distinct controls did not change on hover: HALO, Conventional, Halo, Chalk.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [minor] Entrance sequence is long
- Evidence: Load animations span 3381 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 15 animations/transitions on width, left, height; 2 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 13 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: main#top > section.hero > div.wrap.hero-foot > a.scroll-cue 1×46, div.wrap.foot-grid > div.foot-cols > div > a 159×33, div.wrap.foot-grid > div.foot-cols > div > a 159×33, div.wrap.foot-grid > div.foot-cols > div > a 159×33
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

## Motion profile

- Animations observed: 1175 (load 177, scroll 444, hover 554); inline-style JS motion writes: 4338
- Easing mix: custom-curve 280, linear 841, default-ease 21
- Durations: p10 200 ms · median 200 ms · p90 900 ms
- Entrance: 3381 ms span, 66 distinct start times
- Sections with motion on scroll: 9/9
- Hover: 8/12 controls respond, 7 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/987 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 0.026

## Notes

- Desktop journey took 34.8s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
