# Motion critique — F (13/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/runs/norr/control-1/site

## Look at the page first

- craft: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-control-1/craft.png — finish defects outlined on the real frames — fix these first
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-control-1/desktop-entrance.png — the first viewport from ~80 ms to 3 s
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-control-1/desktop-scroll.png — the whole scroll journey at a glance (rhythm, variety, blank screens)
- desktopDetail1: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-control-1/desktop-detail-1.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail2: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-control-1/desktop-detail-2.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail3: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-control-1/desktop-detail-3.png — scroll frames at a size where type, spacing and alignment are readable
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-control-1/mobile.png — the phone layout
- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-control-1/hover.png — each control at rest and on hover
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/norr-control-1/desktop-full.jpg — one full-page screenshot (scroll scenes appear in their final state)

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, finish, and whether the motion explains something.

## Findings

### [blocker] Content stays invisible after scrolling the whole page
- Evidence: 4 text/image elements still have opacity≈0 after a full scroll: section#top > div.hero__inner.container > p.eyebrow "Nordic architecture studio"; section#top > div.hero__inner.container > div.hero__foot > p.hero__lede "We design timber civic buildings and homes across the north "; div.hero__foot > div.hero__actions > a.btn.btn--solid > span "Selected work"; div.hero__foot > div.hero__actions > a.link-arrow > span "Our philosophy".
- Fix: A reveal never fired. Check the IntersectionObserver targets/threshold (use threshold ≤0.15 and a negative bottom rootMargin, not 1.0), that every hidden element gets observed, and gate the hidden initial state behind a class added by JS (`.js [data-reveal]{opacity:0}`) so content is never lost if script fails.

### [major] Text is clipped on mobile
- Evidence: Overflowing: section#studio > div.container > h2.sr-only.
- Fix: Use fluid type (clamp()) and allow wrapping; never set overflow:hidden on a heading container sized for desktop.

### [major] Text contrast is too low
- Evidence: 8/183 checked text elements fail WCAG AA, e.g. "69.6492° N, 18.9553° E" 1.11:1, "Tromsø · Oslo" 1.11:1, "Scroll" 1.11:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [major] Copy scrolls underneath a sticky panel
- Evidence: 3 text element(s) hidden behind a position:sticky element while in view. mobile scrollY 7319px: “We walk the site with the people who wil” is under the sticky div.process__sticky; mobile scrollY 8945px: “Panels are machined and assembled in a c” is under the sticky div.process__sticky; mobile scrollY 8945px: “Off-site build” is under the sticky div.process__sticky.
- Fix: A pinned visual that sits beside the copy on desktop often stacks over it on phones. Below the breakpoint, unpin it (position:static) or give the copy its own full-height steps so it never shares the screen with the sticky panel.

### [minor] Layout properties are animated
- Evidence: 98 animations/transitions on height, marginLeft, margin-left, marginTop, margin-top; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Hover feedback is sluggish
- Evidence: 2 hover transitions last over 600 ms (e.g. body > header.site-header > a.brand > svg.brand__mark: 800 ms).
- Fix: Hover/press feedback should start immediately and settle in 150–300ms; longer feels laggy under the pointer.

### [minor] Many elements loop forever
- Evidence: 18 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: div.hero__inner.container > div.hero__foot > div.hero__actions > a.link-arrow 132×32, article.card.card--land > div.card__meta > h3.card__title > button.card__open 168×35, article.card.card--port > div.card__meta > h3.card__title > button.card__open 131×35, article.card.card--port > div.card__meta > h3.card__title > button.card__open 104×35
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Text is clipped on desktop
- Evidence: section#studio > div.container > h2.sr-only
- Fix: Allow wrapping or enlarge the container.

### [minor] The page looks like the default AI-built template
- Evidence: It shares 7 of 9 traits of the landing page coding agents build by default: display face Instrument Serif, italic accent word in the headline, warm paper ground, small uppercase eyebrow above the headline, pill buttons, grain overlay, marquee.
- Fix: Unless the brief asks for these, change at least four: a display face chosen for this subject, a ground and accent taken from its world, a hero built around one dominant element instead of headline-left/object-right, square or cut button shapes, and sections laid out from their content rather than eyebrow, marquee and bento. A page can earn every trait; it should not get them by default.

### [polish] Placeholder text is visible
- Evidence: mobile scrollY 12198px: placeholder text “Your name”
- Fix: Replace placeholder copy, .example addresses and zeroed phone numbers with plausible content (labelled illustrative where needed), or remove the line.

## Motion profile

- Animations observed: 1232 (load 190, scroll 390, hover 652); inline-style JS motion writes: 6886
- Easing mix: custom-curve 708, default-ease 94, linear 285
- Durations: p10 150 ms · median 500 ms · p90 1400 ms
- Entrance: 1973 ms span, 6 distinct start times
- Sections with motion on scroll: 7/7
- Hover: 11/12 controls respond, 11 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Template likeness: 7/9 default-agent traits (display face Instrument Serif, italic accent word in the headline, warm paper ground, small uppercase eyebrow above the headline, pill buttons, grain overlay, marquee)
- Finish checks: 29 settled screens measured; 0 mostly-empty screens, 0 hollow boxes, 0 text overlaps, 0 near-miss alignments, 0 edge-crowded texts
- Scroll frames: 0/991 over 50 ms, p95 16.8 ms (headless; indicative) · CLS 0.025

## Notes

- Desktop journey took 38.3s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
