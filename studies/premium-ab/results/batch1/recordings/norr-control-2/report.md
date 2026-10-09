# Motion critique — C (72/100)

Target: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/ab/norr/control-2/site

## Look at the page first

- hover: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/norr-control-2/hover.png
- desktopEntrance: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/norr-control-2/desktop-entrance.png
- desktopScroll: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/norr-control-2/desktop-scroll.png
- desktopFull: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/norr-control-2/desktop-full.jpg
- mobile: /tmp/claude-1000/-home-terryd-Projects-Prenium-Motion/5836d1e1-fa23-4581-b296-9efcaffe569a/scratchpad/eval/recordings/norr-control-2/mobile.png

Open these images. The score is a lint for common defects, not a taste judgment: a page can pass every check and still look generic. Judge the frames like a design director would — hierarchy, rhythm, restraint, and whether the motion explains something.

## Findings

### [major] Interactive elements give no hover feedback
- Evidence: 4/11 distinct controls did not change on hover: Skip to content, Atelier Norr, Motion on, Back to top ↑.
- Fix: Every link/button needs a state change: buttons lift 1–2px or shift background with a 160–240ms ease-out transition and a pressed scale(.97); text links animate an underline (scaleX 0→1 from the left); cards raise shadow and scale media 1.03.

### [minor] Entrance sequence is long
- Evidence: Load animations span 7409 ms.
- Fix: Keep the hero sequence ≲1.6 s from first paint to settled; shorten delays rather than durations. Visitors should be able to read the headline within ~600 ms.

### [minor] Layout properties are animated
- Evidence: 76 animations/transitions on paddingBottom, padding-bottom, paddingTop, padding-top, height; 0 inline-style layout writes.
- Fix: Animate transform and opacity (and clip-path for reveals) instead of width/height/top/left/margin; they run on the compositor and avoid reflow jank. For accordions use grid-template-rows 0fr→1fr or measure once and animate a scale/clip.

### [minor] Tap targets are small on mobile
- Evidence: div.contact__info.reveal > ul > li > a 260×24, div.contact__info.reveal > ul > li > a 260×24, div.contact__info.reveal > ul > li > a 260×24, footer.footer > div.wrap.footer__row > div.footer__col > a 350×23
- Fix: Give touch controls at least 44×44px of hit area (padding or a pseudo-element hit box).

### [polish] Some sections are static
- Evidence: Static on scroll: footer.footer (y=12350).
- Fix: Consider a subtle reveal for these sections so the page keeps a consistent rhythm, or keep them deliberately calm if they are dense reading areas.

## Motion profile

- Animations observed: 1888 (load 44, scroll 937, hover 907); inline-style JS motion writes: 7186
- Easing mix: custom-curve 1501, default-ease 181, linear 200
- Durations: p10 250 ms · median 600 ms · p90 600 ms
- Entrance: 7409 ms span, 28 distinct start times
- Sections with motion on scroll: 7/8
- Hover: 7/11 controls respond, 6 animate · Focus visible: 8/8
- Reduced motion: handled; 0 moving animations still running
- Scroll frames: 0/860 over 50 ms, p95 16.7 ms (headless; indicative) · CLS 0.033

## Notes

- Desktop journey took 30.2s
- External origins requested: https://fonts.googleapis.com, https://fonts.gstatic.com (passive font/style/script/image GETs allowed; anything else blocked)
