# Motion critique — D (51/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab/norr/control-1/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/norr-control-1/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/norr-control-1/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/norr-control-1/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/norr-control-1/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/norr-control-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [major] Entrance animations all start at once
- Evidence: 7 load animations share one start time; nothing leads the eye.
- Fix: Give the entrance an order of importance: offset successive elements by 50–100ms (CSS `animation-delay: calc(var(--i) * 70ms)` or a JS stagger) so the headline lands first and supporting elements follow.

### [major] Interactive elements give no hover feedback
- Evidence: 4/7 distinct controls did not change on hover: Atelier Norr, Philosophy, Request the monograph, Back to top ↑.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [major] Layout shifts while loading
- Evidence: Cumulative layout shift 3.035.
- Fix: Reserve space for images/media (width/height or aspect-ratio), load fonts with metric-matched fallbacks, and animate entrances with transform rather than inserting space.

### [major] Text contrast is too low
- Evidence: 7/104 checked text elements fail WCAG AA, e.g. "ii." 2.34:1, "iii." 2.34:1, "2025" 2.1:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Layout properties are animated
- Evidence: 40 animations/transitions on height, marginLeft, margin-left, marginTop, margin-top; 151 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

## Motion profile

- Animations observed: 1821 (load 9, scroll 967, hover 845); inline-style JS motion writes: 11913
- Easing mix: custom-curve 1808, default-ease 11
- Durations: p10 800 ms · median 1200 ms · p90 1200 ms
- Entrance: 1200 ms span, 1 distinct start times
- Sections with motion on scroll: 7/7
- Hover: 3/7 controls respond, 3 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/952 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 3.035

## Notes

- Desktop journey took 28.4s
- External origins requested: https://fonts.googleapis.com, https://cdnjs.cloudflare.com, https://cdn.jsdelivr.net, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
