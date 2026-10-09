# Motion critique — C (67/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab/halo/control-1/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/halo-control-1/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/halo-control-1/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/halo-control-1/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/halo-control-1/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/halo-control-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [major] Interactive elements give no hover feedback
- Evidence: 4/10 distinct controls did not change on hover: Halo, Motion, Forward-firing, The object.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [minor] Entrance sequence is long
- Evidence: Load animations span 4669 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 66 animations/transitions on width, height, marginLeft, margin-left, marginTop; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 26 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: button#pt-conv 98×35, button#pt-halo 48×35, div.wrap > div.foot-top > div > a 160×30, div.wrap > div.foot-top > div > a 160×30
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [polish] Some sections are static
- Evidence: Static on scroll: footer.footer (y=18158).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

## Motion profile

- Animations observed: 595 (load 86, scroll 395, hover 114); inline-style JS motion writes: 5536
- Easing mix: default-ease 33, custom-curve 341, linear 160
- Durations: p10 250 ms · median 597 ms · p90 1800 ms
- Entrance: 4669 ms span, 12 distinct start times
- Sections with motion on scroll: 8/9
- Hover: 6/10 controls respond, 6 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/1251 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.034

## Notes

- Desktop journey took 36.3s
- External origins requested: https://fonts.googleapis.com, https://cdn.jsdelivr.net, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
