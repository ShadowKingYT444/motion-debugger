# Motion critique — F (37/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab/drift/control-2/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/drift-control-2/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/drift-control-2/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/drift-control-2/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/drift-control-2/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/drift-control-2/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [blocker] Reduced-motion visitors lose content
- Evidence: 1 elements stay invisible when prefers-reduced-motion is set.
- Fix: The reduced-motion branch skips the code that reveals content. Make elements visible by default under reduced motion instead of skipping the reveal.

### [major] Interactive elements give no hover feedback
- Evidence: 4/12 distinct controls did not change on hover: Drift, RainSoft canopy, Monthly, Drift.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [major] Text contrast is too low
- Evidence: 25/154 checked text elements fail WCAG AA, e.g. "*Self-reported and in-app data from beta" 4.08:1, "Drift is a wellness app, not a medical d" 4.08:1, "Product designer · Lisbon" 4.08:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Layout properties are animated
- Evidence: 20 animations/transitions on width, height; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 28 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Body text is small on mobile
- Evidence: 10 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [polish] Some sections are static
- Evidence: Static on scroll: footer.foot (y=10116).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

### [polish] Paragraph line length is too long
- Evidence: main#main > section.stats > div.wrap > p.fine, section#science > div.wrap > p.fine
- Fix: Cap reading measure at ~60–75 characters (max-width: 62ch).

## Motion profile

- Animations observed: 490 (load 60, scroll 173, hover 257); inline-style JS motion writes: 1213
- Easing mix: custom-curve 302, default-ease 139
- Durations: p10 300 ms · median 900 ms · p90 1200 ms
- Entrance: 2050 ms span, 9 distinct start times
- Sections with motion on scroll: 9/10
- Hover: 8/12 controls respond, 8 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/741 over 50 ms, p95 33.3 ms (headless; indicative) · CLS 0.017

## Notes

- Desktop journey took 31.6s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
