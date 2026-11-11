# Motion critique — F (30/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/runs/ledgerline/control-1/site

## Look at the page first

- craft: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/ledgerline-control-1/craft.png — finish defects outlined on the real frames — fix these first
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/ledgerline-control-1/desktop-entrance.png — the first viewport from ~80 ms to 3 s
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/ledgerline-control-1/desktop-scroll.png — the whole scroll journey at a glance (rhythm, variety, blank screens)
- desktopDetail1: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/ledgerline-control-1/desktop-detail-1.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail2: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/ledgerline-control-1/desktop-detail-2.png — scroll frames at a size where type, spacing and alignment are readable
- desktopDetail3: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/ledgerline-control-1/desktop-detail-3.png — scroll frames at a size where type, spacing and alignment are readable
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/ledgerline-control-1/mobile.png — the phone layout
- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/ledgerline-control-1/hover.png — each control at rest and on hover
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/c617552f-71c7-55aa-92e5-28d8f5c048c2/scratchpad/ab4eval/eval/recordings/ledgerline-control-1/desktop-full.jpg — one full-page screenshot (scroll scenes appear in their final state)

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, finish, and whether the motion explains something.

## Findings

### [blocker] Content stays invisible after scrolling the whole page
- Evidence: 4 text/image elements still have opacity≈0 after a full scroll: details.qa.is-in > div.qa-body > div > p "RTP, FedNow, ACH, wires, SEPA (credit transfer and Instant),"; details.qa.is-in > div.qa-body > div > p "Yes. Import historical entries in bulk with their original t"; details.qa.is-in > div.qa-body > div > p "Writes keep committing on the remaining two regions. In-flig"; details.qa.is-in > div.qa-body > div > p "The sandbox runs the same code path as production with simul".
- Fix: A reveal never fired. Check the IntersectionObserver targets/threshold (use threshold ≤0.15 and a negative bottom rootMargin, not 1.0), that every hidden element gets observed, and gate the hidden initial state behind a class added by JS (`.js [data-reveal]{opacity:0}`) so content is never lost if script fails.

### [major] Text contrast is too low
- Evidence: 24/244 checked text elements fail WCAG AA, e.g. "Trusted by the engineering teams behind" 3.35:1, "Python" 3.31:1, "cURL" 3.31:1.
- Fix: Muted text still needs ≥4.5:1 (≥3:1 for 24px+). Raise lightness contrast of secondary text instead of lowering opacity.

### [minor] Entrance sequence is long
- Evidence: Load animations span 4096 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 76 animations/transitions on width, height, marginTop, margin-top, max-height; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Hover feedback is sluggish
- Evidence: 3 hover transitions last over 600 ms (e.g. header#nav > div.wrap.nav-inner > div.nav-cta > a.btn.btn-lime::after: 900 ms).
- Fix: Hover/press feedback should start immediately and settle in 150–300ms; longer feels laggy under the pointer.

### [minor] Many elements loop forever
- Evidence: 9 distinct elements run infinite animations.
- Fix: Limit ambient loops to one or two focal elements (a hero visual, a marquee). Constant motion everywhere competes with content and drains battery; pause off-screen loops.

### [minor] Tap targets are small on mobile
- Evidence: div.wrap.hero-grid > div.hero-copy > div.install > button.copy 34×34, button#ledgerToggle 28×28, div#term > div.term-bar > div.tabs > button 51×33, div#term > div.term-bar > div.tabs > button 67×33
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [minor] Body text is small on mobile
- Evidence: 10 paragraphs under 14px at 390px.
- Fix: Keep body copy ≥16px on phones.

### [minor] Code is cut off at the panel edge
- Evidence: mobile scrollY 6533px: code is cut off at the box edge
- Fix: Let long lines scroll (overflow-x:auto with a visible fade) or wrap them, and size the sample so its longest line fits; on phones, shorten the sample.

### [polish] The page looks like the default AI-built template
- Evidence: It shares 6 of 9 traits of the landing page coding agents build by default: text face Geist, italic accent word in the headline, near-black ground, small uppercase eyebrow above the headline, headline left, object right, marquee.
- Fix: Unless the brief asks for these, change at least four: a display face chosen for this subject, a ground and accent taken from its world, a hero built around one dominant element instead of headline-left/object-right, square or cut button shapes, and sections laid out from their content rather than eyebrow, marquee and bento. A page can earn every trait; it should not get them by default.

## Motion profile

- Animations observed: 783 (load 50, scroll 423, hover 310); inline-style JS motion writes: 1548
- Easing mix: default-ease 228, custom-curve 539, ease-out 5
- Durations: p10 400 ms · median 800 ms · p90 1200 ms
- Entrance: 4096 ms span, 17 distinct start times
- Sections with motion on scroll: 12/12
- Hover: 9/12 controls respond, 9 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Template likeness: 6/9 default-agent traits (text face Geist, italic accent word in the headline, near-black ground, small uppercase eyebrow above the headline, headline left, object right, marquee)
- Finish checks: 29 settled screens measured; 0 mostly-empty screens, 0 hollow boxes, 0 text overlaps, 0 near-miss alignments, 0 edge-crowded texts
- Scroll frames: 0/979 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 0.077

## Notes

- Desktop journey took 35.6s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
