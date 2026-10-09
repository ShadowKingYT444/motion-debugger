# Motion critique — D (49/100)

Target: demos/drift/control

## Look at the page first

- hover: scratchpad/eval3/recordings/drift-control-1/hover.png
- desktopEntrance: scratchpad/eval3/recordings/drift-control-1/desktop-entrance.png
- desktopScroll: scratchpad/eval3/recordings/drift-control-1/desktop-scroll.png
- desktopFull: scratchpad/eval3/recordings/drift-control-1/desktop-full.jpg
- mobile: scratchpad/eval3/recordings/drift-control-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [major] Interactive elements give no hover feedback
- Evidence: 4/12 distinct controls did not change on hover: Drift, Drizzle, Download free, Drift.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [major] Text contrast is too low
- Evidence: 4/142 checked text elements fail WCAG AA, e.g. "Product" 4.42:1, "Learn" 4.42:1, "Company" 4.42:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Layout properties are animated
- Evidence: 122 animations/transitions on width; 111 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Hover feedback is sluggish
- Evidence: 3 hover transitions last over 600 ms (e.g. div.wrap.hero-grid > div.hero-copy > div.cta-row.is-in > a.btn.btn-glow::after: 800 ms).
- Fix: Hover/press feedback should start immediately and settle in 150–300ms; longer feels laggy under the pointer.

### [minor] Many elements loop forever
- Evidence: 22 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: footer.footer > div.wrap.foot-grid > div > a 159×32, footer.footer > div.wrap.foot-grid > div > a 159×32, footer.footer > div.wrap.foot-grid > div > a 159×32, footer.footer > div.wrap.foot-grid > div > a 159×32
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 5 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [polish] Some sections are static
- Evidence: Static on scroll: footer.footer (y=10213).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

### [polish] Paragraph line length is too long
- Evidence: section#hero > p.foot-note.wrap, section#science > div.wrap > p.foot-note
- Fix: Cap reading measure at ~60–75 characters (max-width: 62ch).

## Motion profile

- Animations observed: 1059 (load 47, scroll 249, hover 763); inline-style JS motion writes: 1165
- Easing mix: custom-curve 334, linear 161, default-ease 290, ease-out 244
- Durations: p10 200 ms · median 400 ms · p90 1000 ms
- Entrance: 1964 ms span, 10 distinct start times
- Sections with motion on scroll: 7/8
- Hover: 8/12 controls respond, 9 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/807 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.01

## Notes

- Desktop journey took 31.7s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
