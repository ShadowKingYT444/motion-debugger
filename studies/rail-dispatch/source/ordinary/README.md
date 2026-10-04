# SIGNAL / ordinary workflow arm

Original local HTML, CSS, inline SVG and JavaScript railway console. Open `index.html` under a static server. No external runtime dependencies or assets.

The timetable drives three independently routed three-car trains. Harbor and Summit selection, camera focus/overview, pause/resume, scrub, replay and JSON export use the shared browser hooks. Camera targets interpolate from the current camera rather than queuing transitions. Reduced motion starts paused, immediately settles camera changes and uses discrete minute updates when resumed.

## Verification performed

Headless Chromium with ordinary Playwright, exclusively under `/tmp/motion-rail-browser.lock`. Served by Python's static HTTP server. Parsed the inline script. Tested pause time stability, scrub to 12:00, focus → Summit → overview interruption, replay resetting to zero and resuming, export download filename, 390px horizontal overflow, and reduced-motion focus. No browser page errors observed. Verified all three rendered route stroke colors. Inspected actual desktop/mobile screenshots. Captured an actual timed browser video of the interruption and scrub journey; the parent will supply identical common recordings across arms.

Artifacts are under `verification/`: desktop and mobile screenshots, mobile focus screenshot, and native Playwright WebM.

Known limitations: this is an explicit local timetable simulation, not real train telemetry. Inspector stop times are schematic departures derived from the current hour. Overview station labels are small on mobile; station focus enlarges them. The continuously running simulation wraps at the end of the day, and bidirectional services reverse at route endpoints.

No seeded defects, no Motion tools, no commits. Source frozen at 2026-10-04 19:55 UTC.
