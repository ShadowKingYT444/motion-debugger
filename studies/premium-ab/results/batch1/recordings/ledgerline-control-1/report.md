# Motion critique — D (50/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab/ledgerline/control-1/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/ledgerline-control-1/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/ledgerline-control-1/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/ledgerline-control-1/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/ledgerline-control-1/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/ledgerline-control-1/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [blocker] Content stays invisible after scrolling the whole page
- Evidence: 4 text/image elements still have opacity≈0 after a full scroll: form#sform > div.success > div.ck > svg "svg"; form#sform > div.success > h3 "Your sandbox is ready."; form#sform > div.success > p "This is a concept page, so no account was created and no key"; button#again "Start over".
- Fix: A reveal never fired. Check the IntersectionObserver targets/threshold (use threshold ≤0.15 and a negative bottom rootMargin, not 1.0), that every hidden element gets observed, and gate the hidden initial state behind a class added by JS (`.js [data-reveal]{opacity:0}`) so content is never lost if script fails.

### [major] Text contrast is too low
- Evidence: 31/245 checked text elements fail WCAG AA, e.g. "tessera/" 3.25:1, "orbitly" 3.25:1, "paylane.io" 3.25:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Layout properties are animated
- Evidence: 39 animations/transitions on width, marginTop, margin-top, max-height; 43 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Tap targets are small on mobile
- Evidence: button#replay 85×33, div.term > div.term-bar > div.tabs > button.tab 53×30, div.term > div.term-bar > div.tabs > button.tab 53×30, div.term > div.term-bar > div.tabs > button.tab 67×30
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 4 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [polish] Some sections are static
- Evidence: Static on scroll: footer.foot (y=15495).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

## Motion profile

- Animations observed: 1099 (load 81, scroll 490, hover 528); inline-style JS motion writes: 476
- Easing mix: custom-curve 637, default-ease 453
- Durations: p10 250 ms · median 500 ms · p90 1000 ms
- Entrance: 1757 ms span, 16 distinct start times
- Sections with motion on scroll: 9/10
- Hover: 10/12 controls respond, 9 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/936 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.028

## Notes

- Desktop journey took 33.8s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
