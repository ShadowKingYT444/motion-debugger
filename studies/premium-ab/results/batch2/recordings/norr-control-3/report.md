# Motion critique — D (52/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/norr/control-3/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-control-3/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-control-3/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-control-3/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-control-3/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/norr-control-3/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [major] Entrance animations all start at once
- Evidence: 4 load animations share one start time; nothing leads the eye.
- Fix: Give the entrance an order of importance: offset successive elements by 50–100ms (CSS `animation-delay: calc(var(--i) * 70ms)` or a JS stagger) so the headline lands first and supporting elements follow.

### [major] Interactive elements give no hover feedback
- Evidence: 3/7 distinct controls did not change on hover: Atelier Norr, Contact, Back to top ↑.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [major] Text contrast is too low
- Evidence: 4/90 checked text elements fail WCAG AA, e.g. "Bergen, Norway" 3.62:1, "Lofoten, Norway" 3.62:1, "Umeå, Sweden" 3.62:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Layout properties are animated
- Evidence: 0 animations/transitions on layout; 440 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 9 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Body text is small on mobile
- Evidence: 3 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

## Motion profile

- Animations observed: 89 (load 39, scroll 18, hover 32); inline-style JS motion writes: 16763
- Easing mix: custom-curve 38, default-ease 6
- Durations: p10 61 ms · median 600 ms · p90 600 ms
- Entrance: 600 ms span, 1 distinct start times
- Sections with motion on scroll: 6/6
- Hover: 4/7 controls respond, 3 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/883 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 0.011

## Notes

- Desktop journey took 28.5s
- External origins requested: https://fonts.googleapis.com, https://cdnjs.cloudflare.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
