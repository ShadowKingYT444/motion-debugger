# Motion critique — D (45/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/ledgerline/control-3/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/ledgerline-control-3/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/ledgerline-control-3/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/ledgerline-control-3/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/ledgerline-control-3/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/ledgerline-control-3/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [blocker] Content stays invisible on mobile
- Evidence: 8 elements never revealed at 390px: table.tacc > tbody > tr > td.mono; table.tacc > tbody > tr > td.mono; table.tacc > tbody > tr > td.mono.
- Fix: Reveal thresholds that work on desktop can fail for tall mobile elements; use threshold ≤0.1 or rootMargin instead of a large visible fraction.

### [major] Text contrast is too low
- Evidence: 12/153 checked text elements fail WCAG AA, e.g. "Powering money movement at" 3.35:1, "Customer names and figures on this page " 3.35:1, "Annual save 20%" 4.37:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Entrance sequence is long
- Evidence: Load animations span 4149 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 10 animations/transitions on marginTop, margin-top, max-height, top; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Tap targets are small on mobile
- Evidence: div.codecard.in > div.code-top > div.tabs > button.tab.active 65×33, div.codecard.in > div.code-top > div.tabs > button.tab 65×33, div.codecard.in > div.code-top > div.tabs > button.tab 75×33, button#copyBtn 56×33
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 9 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [polish] Some sections are static
- Evidence: Static on scroll: footer.foot (y=9432).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

## Motion profile

- Animations observed: 643 (load 57, scroll 301, hover 285); inline-style JS motion writes: 318
- Easing mix: custom-curve 337, linear 20, default-ease 276
- Durations: p10 300 ms · median 500 ms · p90 900 ms
- Entrance: 4149 ms span, 37 distinct start times
- Sections with motion on scroll: 9/10
- Hover: 10/12 controls respond, 7 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/778 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 0.033

## Notes

- Desktop journey took 31.3s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
