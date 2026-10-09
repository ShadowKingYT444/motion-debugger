# Motion critique — D (54/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/drift/control-3/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-control-3/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-control-3/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-control-3/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-control-3/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-control-3/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [blocker] Content stays invisible after scrolling the whole page
- Evidence: 4 text/image elements still have opacity≈0 after a full scroll: div.faq-list.reveal > details > div > p "No. Audio is analysed on your phone to detect breathing and "; div.faq-list.reveal > details > div > p "No. Drift works with just your phone on the nightstand. If y"; div.faq-list.reveal > details > div > p "Overnight sensing is lightweight. Keep your phone plugged in"; div.faq-list.reveal > details > div > p "No. Drift is a wellness app. It can't diagnose or treat slee".
- Fix: A reveal never fired. Check the IntersectionObserver targets/threshold (use threshold ≤0.15 and a negative bottom rootMargin, not 1.0), that every hidden element gets observed, and gate the hidden initial state behind a class added by JS (`.js [data-reveal]{opacity:0}`) so content is never lost if script fails.

### [minor] Layout properties are animated
- Evidence: 25 animations/transitions on width, left, top; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Many elements loop forever
- Evidence: 31 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: section#top > a.scroll-cue 24×40, footer.footer > div.wrap.foot-grid > nav > a 160×24, footer.footer > div.wrap.foot-grid > nav > a 160×24, footer.footer > div.wrap.foot-grid > nav > a 160×24
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 6 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [polish] Some sections are static
- Evidence: Static on scroll: footer.footer (y=9995).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

### [polish] A few text elements have low contrast
- Evidence: "© 2026 Drift Sleep Labs. Drift is a well" 3.44:1, "Back to top ↑" 3.44:1
- Fix: Raise contrast of these elements to at least 4.5:1.

## Motion profile

- Animations observed: 340 (load 79, scroll 108, hover 153); inline-style JS motion writes: 1068
- Easing mix: custom-curve 200, linear 1, default-ease 80
- Durations: p10 300 ms · median 500 ms · p90 1100 ms
- Entrance: 2400 ms span, 13 distinct start times
- Sections with motion on scroll: 8/9
- Hover: 9/12 controls respond, 8 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/805 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 0.004

## Notes

- Desktop journey took 31.6s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
