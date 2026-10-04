# LOOP execution record

Built and verified on 2026-10-04 within the requested 30-minute window. Vanilla HTML/CSS/JS, supplied Three.js 0.186.1 and Playwright 1.63.0. Preview: http://127.0.0.1:39417. Start command: `npm start` (`LOOP_PREVIEW_PORT`, default 3000).

## Delivered behavior

The large original sculpture becomes a sticky live editor preview as the visitor scrolls. Forty-eight persistent capsule pieces become a breathing radial Pulse, three crossing Weave threads or spatial interlocking Orbit rings. Spring retargeting preserves positions and velocities under repeated style changes. Palettes, intensity, name, timeline, pause/resume and replay feed the same state. The native modal provides settings and two real downloads, with focus containment and opener restoration. Reduced motion gives composed, scrub-selectable static poses. WebGL failure activates the vector preview.

The `motion`, `motion-design`, `motion-3d-ui` and `motion-build-inspect-repair` skills guided the design, local construction and browser evidence. Locally copied spring/field/drawer modules were adapted; no absolute skill paths are needed at runtime. Reference principles came from the supplied `REFERENCES.md`; no reference artwork or layout was copied.

## Functional verification — passed

`evidence/journey.mjs` and `evidence/keyboard-and-motion.mjs` executed ordinary unforced input in disposable Chromium contexts. Results are in `journey-results.json` and `keyboard-motion-results.json`.

- Desktop 1440×1000: NOVA → Weave → Ember → 100% → pause → held-pointer forward/backward scrub → details → valid SVG and parsed JSON. Name, style, palette and intensity agree; JSON contains 48 transforms. XML was parsed by the browser DOMParser.
- Pause freezes phase; resume advances it; replay resets the loop. Paused style changes settle while playback stays paused. Running scrub holds phase during pointer capture and resumes afterward. Rapid style switching was tested while running and paused.
- Keyboard-only Tab/Enter/Space journey: name, all styles, palette, Home/End/Arrow sliders, modal, JSON download, focus wrap and Escape restoration. Special-character SVG names and the empty-name LOOP fallback were exercised.
- Mobile 390×844: name, style, palette, sticky specimen, details and close; no horizontal overflow. The panel's downloads remain reachable by scrolling.
- Reduced motion 1280×900: phase stays fixed, style changes compose immediately, timeline endpoints and details/export stay functional.
- WebGL-unavailable: browser context initialization disabled WebGL, the vector preview became visible, style controls changed it, and export stayed available.
- All three formation loops return the same position, orientation and scale at phase 0 and phase 1. No uncaught page errors in either completed journey.

The first ordinary test used a 600ms dialog-close wait, which ended before the spring had settled; it was replaced with a bounded native hidden-state wait. Subsequent tests exposed a real style-selector collision and a hidden SVG fallback; both were repaired, then the journeys passed.

## Visual inspection — completed

Viewed actual saved images: desktop hero/editor, all three completed formations, desktop export, mobile hero/editor/export, reduced-motion composition and vector fallback. The final hero and formations are `final-hero.png`, `final-pulse.png`, `final-weave.png` and `final-orbit.png`. The review confirmed spatial occlusion, reflected highlights, distinct silhouettes, readable controls and deliberate narrow composition. The native keyboard/rapid-input journey also has a 24.16-second WebM in `evidence/native-video/`. Actual extracted frames at 8, 13 and 18 seconds were viewed (`native-frame-08.png`, `native-frame-13.png`, `native-frame-18.png`).

## Recorded motion — functional outcomes passed; cadence unverified

Actual Motion Debugger capture → inspect → native frames calls were made, and returned recorded images were viewed. Captures and reports are preserved under `evidence/motion-captures/`; the unchanged bounded recipe and comparison are in `motion-manifest.json`.

| Capture | ID | Result |
|---|---|---|
| Initial longer journey | `4c5d225a-c10f-4f13-8d8c-ab2d3d3166d5` | Incomplete: final wait exceeded 12-second action deadline. Retained as failed evidence. |
| Bounded baseline | `618e3212-217b-495c-b8e4-c0bde5457e31` | Finished; required Orbit selection failed because stage metadata also matched the control selector. |
| Repair 1 | `30e8bb7f-cfcb-4f81-b9ce-5fff62ee0ce5` | Selection and replay outcomes passed after selector correction, loop closure and instancing. |
| Repair 2 | `09e9e2a1-ce31-4d11-8ac6-cb350acc2d57` | Same selection/replay outcomes passed after fallback visibility and rendering-cost repair. |
| Mobile reduced motion | `29511b2a-c013-4c83-a11d-b3bbec830642` | Pulse/Ice details outcomes passed; cadence and coverage sufficient for this static-mode capture. |

Both requested before/after comparisons were run. Their temporal comparison was inconclusive because the desktop SwiftShader recordings exceeded the unchanged 80ms coverage gate. Final desktop capture had 230 observed samples over 12 seconds, with a maximum rAF gap of 416.7ms. No passing smoothness score or 60fps claim is made. Canvas rectangle continuity cannot establish internal mesh smoothness. Viewed footage shows the spatial pose changes, held scrub, replay and surviving selection; sparse recording does not certify fluidity on every device. The mobile reduced-motion recording mainly shows the settled modal because those actions complete quickly.

## Remaining limits

- SVG is a flat vector interpretation of the captured transforms, with simplified lighting and capsule orientation; it is not an exact WebGL render. The dialog preview and SVG download use the same vector artwork. The fallback is also flatter and less coherent than the spatial rendering.
- JSON needs the delivered source to recreate motion. No rendered video is exported.
- Performance is device-dependent. Software WebGL uses a lower pixel density, 48 pieces are instanced into three draw calls, and offscreen drawing is skipped. Dense motion cadence remains unverified by the recorder.
- Verified in supplied Chromium; Safari/Firefox and actual touch hardware were not available. Narrow tests emulate mobile and do not establish hardware touch performance.

Final source identity is recorded in `evidence/source-sha256.txt`. Verification and delivery completed before the absolute session deadline of 08:51:20 UTC. No deployment or external publication was performed.
