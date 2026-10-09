# Motion critique — F (25/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab/halo/control-2/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/halo-control-2/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/halo-control-2/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/halo-control-2/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/halo-control-2/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/halo-control-2/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [blocker] Content stays invisible on mobile
- Evidence: 9 elements never revealed at 390px: div.obj-stage > div.obj-steps > article.obj-step > span.num; div.obj-stage > div.obj-steps > article.obj-step > h3; div.obj-stage > div.obj-steps > article.obj-step > p.
- Fix: Reveal thresholds that work on desktop can fail for tall mobile elements; use threshold ≤0.1 or rootMargin instead of a large visible fraction.

### [major] Interactive elements give no hover feedback
- Evidence: 4/12 distinct controls did not change on hover: Skip to content, Specs, Halo, The object.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [major] Layout shifts while loading
- Evidence: Cumulative layout shift 4.004.
- Fix: Reserve space for images/media (width/height or aspect-ratio), load fonts with metric-matched fallbacks, and animate entrances with transform rather than inserting space.

### [major] Text contrast is too low
- Evidence: 35/162 checked text elements fail WCAG AA, e.g. "Halo" 1.04:1, "03 — Materials" 4.46:1, "Three materials, chosen because they age" 4.46:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Entrance sequence is long
- Evidence: Load animations span 2611 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 81 animations/transitions on height, left, top, width; 838 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 25 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Body text is small on mobile
- Evidence: 3 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

## Motion profile

- Animations observed: 830 (load 141, scroll 516, hover 173); inline-style JS motion writes: 19226
- Easing mix: custom-curve 686, default-ease 83
- Durations: p10 398 ms · median 800 ms · p90 800 ms
- Entrance: 2611 ms span, 27 distinct start times
- Sections with motion on scroll: 9/9
- Hover: 8/12 controls respond, 7 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/1124 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 4.004

## Notes

- Desktop journey took 35.2s
- External origins requested: https://fonts.googleapis.com, https://cdnjs.cloudflare.com, https://cdn.jsdelivr.net, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
