# Execution record

Built within the twenty-minute local design budget on 2026-10-04 UTC. One owner authored the source. A requested independent test-agent launch failed at infrastructure initialization; verification continued locally. No sibling study arms or coordinator repository were inspected.

## Delivered

- Editorial ivory, charcoal, and vermillion page with an original clay workbench.
- Four procedural ants with articulated six-leg gaits, antennae, mandibles, polished bodies, carried contributions, lighting, clay grain, and grounded shadows.
- One shared task state drives the controls, stage progress, colony, cancellation, handoff, and finished-plan drawer.
- Scroll-based close view with damped rapid reversal; pointer and keyboard scene exploration.
- Mobile composition with a sticky colony above the controls, reduced-motion stage poses, and an illustrated WebGL fallback.

## Browser verification

Headless Chrome `/usr/bin/google-chrome`, Playwright, loopback only.

`journey-rerun-partial.log` confirms launch, pause/resume, cancellation, all four stages, completion, replay, stage details, about disclosure, drawer close/Escape/focus restoration, Tab containment, rapid scroll reversal, and mobile launch/pause with no horizontal overflow. That run stopped on a test selector ambiguity caused by selecting the body as well as a stage button; the reusable script now explicitly selects buttons.

`final-smoke.log` confirms the complete mobile task and plan, return-to-colony action, idea link, colony navigation, and captures pointer dragging. `finish-test.log` and `final-test-results.json` confirm complete reduced-motion and forced-fallback journeys, plan access, forward/reverse focus containment, Escape, restored focus, and no JavaScript/resource errors.

`motion-check.mjs` captures successive walking frames, paused frames, keyboard view changes, and reduced-motion scroll frames. `pixel-evidence.json` compares them: moving and interactive views change; paused scene pixels remain identical. Reduced-motion comparison excludes the leftmost 100 pixels, where scrolling editorial text overlaps the canvas; the colony itself remains identical. Video and a contact sheet were reviewed to check articulated movement.

## Preserved failures and fixes

- Initial root-route 404: corrected server pathname mapping; failed capture retained.
- Scene initialization accessed rod geometry before initialization: moved shared geometry before scene creation; fallback captures retained.
- Removed Three.js shadow constant: updated to supported PCFShadowMap.
- Drawer Tab escaped the modal: added explicit forward/reverse focus containment, then rechecked.
- Mobile automated clicks conflicted with CSS smooth scrolling: retained explicit launch scrolling and made automatic focus scrolling immediate. Corrected mobile heading line breaks after visual inspection.
- Pixel review attempts encountered unavailable Pillow, a script-download navigation, and an SVG canvas namespace mismatch; final comparison uses browser canvas with the HTML namespace. Logs are retained where generated.
- Final visual inspection found the printed output beneath its backing sheet; raised the printed surface above the backing.

## Remaining limitations

This is a fixed scripted interaction study, not an AI service or announced Anthropic product. Paths and gait are authored rather than physically simulated; small feet or antennae can intersect paper edges. Headless software WebGL produces driver readback warnings and does not establish performance on physical phones. Verification covers Chromium, a 390px phone viewport, and desktop sizes; Safari, Firefox, and real touch hardware were not tested. No backend, custom-task input, or generated outputs are provided.
