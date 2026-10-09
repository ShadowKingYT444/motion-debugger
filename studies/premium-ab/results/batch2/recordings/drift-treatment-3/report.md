# Motion critique — B (83/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab2/drift/treatment-3/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-treatment-3/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-treatment-3/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-treatment-3/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-treatment-3/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval2/recordings/drift-treatment-3/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [minor] Many elements loop forever
- Evidence: 12 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Body text is small on mobile
- Evidence: 4 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [minor] The page logs errors
- Evidence: request failed: https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap net::ERR_CONNECTION_CLOSED | console: Failed to load resource: net::ERR_CONNECTION_CLOSED
- Fix: Fix script errors first — a thrown error often stops the animation code that follows it.

### [polish] A few text elements have low contrast
- Evidence: "Yearly −50%" 1.01:1, "−50%" 1.01:1
- Fix: Raise contrast of these elements to at least 4.5:1.

## Motion profile

- Animations observed: 512 (load 36, scroll 194, hover 282); inline-style JS motion writes: 794
- Easing mix: custom-curve 206, linear 289
- Durations: p10 160 ms · median 280 ms · p90 900 ms
- Entrance: 2331 ms span, 12 distinct start times
- Sections with motion on scroll: 10/10
- Hover: 9/10 controls respond, 8 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/856 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 0

## Notes

- Desktop journey took 30.9s
- External origins requested: https://fonts.googleapis.com (passive font/style/script/image GETs allowed; anything else blocked)
