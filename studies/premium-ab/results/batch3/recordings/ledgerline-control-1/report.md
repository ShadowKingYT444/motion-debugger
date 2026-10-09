# Motion critique — F (20/100)

Target: demos/ledgerline/control

## Look at the page first

- hover: scratchpad/eval3/recordings/ledgerline-control-1/hover.png
- desktopEntrance: scratchpad/eval3/recordings/ledgerline-control-1/desktop-entrance.png
- desktopScroll: scratchpad/eval3/recordings/ledgerline-control-1/desktop-scroll.png
- desktopFull: scratchpad/eval3/recordings/ledgerline-control-1/desktop-full.jpg
- mobile: scratchpad/eval3/recordings/ledgerline-control-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [blocker] Content stays invisible on mobile
- Evidence: 3 elements never revealed at 390px: button#flowToggle > svg.i-pause; span#flowToggleLabel; svg#flowSvg.
- Fix: Reveal thresholds that work on desktop can fail for tall mobile elements; use threshold ≤0.1 or rootMargin instead of a large visible fraction.

### [major] Interactive elements give no hover feedback
- Evidence: 7/12 distinct controls did not change on hover: Ledgerline, Platform, Pricing, button.icon-btn|header, Sign in, Get API keys →.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [major] Layout shifts while loading
- Evidence: Cumulative layout shift 1.047.
- Fix: Reserve space for images/media (width/height or aspect-ratio), load fonts with metric-matched fallbacks, and animate entrances with transform rather than inserting space.

### [major] Text contrast is too low
- Evidence: 3/266 checked text elements fail WCAG AA, e.g. "quillbank" 4.25:1, "parallel.io" 4.25:1, "fathom" 4.25:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Entrance sequence is long
- Evidence: Load animations span 4098 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 10 animations/transitions on paddingBottom, paddingTop; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 9 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: button#flowToggle 76×32, div.codebox.in > div.cb-bar > div.tabs > button.tab 59×34, div.codebox.in > div.cb-bar > div.tabs > button.tab 59×34, div.codebox.in > div.cb-bar > div.tabs > button.tab 75×34
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 11 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

## Motion profile

- Animations observed: 1595 (load 93, scroll 1066, hover 436); inline-style JS motion writes: 3069
- Easing mix: custom-curve 1319, default-ease 254
- Durations: p10 300 ms · median 1000 ms · p90 1000 ms
- Entrance: 4098 ms span, 28 distinct start times
- Sections with motion on scroll: 10/10
- Hover: 5/12 controls respond, 5 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/927 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 1.047

## Notes

- Desktop journey took 32.9s
- External origins requested: https://fonts.googleapis.com, https://cdnjs.cloudflare.com, https://cdn.jsdelivr.net, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
