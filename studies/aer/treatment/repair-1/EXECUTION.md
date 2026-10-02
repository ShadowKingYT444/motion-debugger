# AER treatment execution record

## Brief and scope
A premium industrial-design landing page for a compact sculptural desk fan, with procedural 3D, visible rotor, power and three speeds, controllable orbit, details drawer, live scene reveal, responsive layout, keyboard controls and reduced motion.

## Direction
For design-conscious desk users, an ivory editorial page frames a graphite circular object; restrained motion and low information density keep the object and its controls primary.

## Factual actions
- Read the frozen `motion-design`, `motion-3d-ui`, `motion-build-inspect-repair` and `motion-evidence` skills supplied for this treatment.
- Read Motion API/workflow documentation to prepare capture requests. No baseline implementation or seeded example source was read.
- Built a self-contained vanilla Vite + Three.js implementation with pinned dependencies. Geometry, materials and lights are procedural, without external visual assets or API calls.
- Implemented power/speed state with one damped rotor velocity, bounded camera orbit, touch/pointer and keyboard controls, reduced-motion behavior, a native modal details drawer and a first-render scene telemetry reveal.
- Exposed `window.__aer.getState()` and `motion:mark` events as explicit application annotations, not browser-inferred measurements.

## Observation status
Initial source construction is in progress. No browser screenshots or recorded motion have yet been observed. Build and actual browser evidence will be requested and recorded below.

## Initial build verification
- First dependency install failed because the default npm cache directory is read-only. Retried with a writable cache under `/tmp`.
- `npm install --cache /tmp/aer-npm-cache --ignore-scripts --no-audit --no-fund` succeeded and produced a lockfile.
- `npm run build` succeeded with Vite 7.3.6. Output: CSS 11.59 kB, JS 519.02 kB (134.72 kB gzip). Vite reported its normal >500 kB chunk warning; no compile error.
- Actual runtime/browser observation is pending. Requested ordinary checks and actual Motion MCP captures are recorded in `CAPTURE_REQUESTS.json`.

## Actual initial evidence reviewed (2026-10-02)
Evidence came from GitHub Actions run 37028537496, source commit c0a965fa1b31a8ee6d21954387e1a9437bcec1c4. Only the treatment evidence was read.
- Viewed actual ordinary PNGs: layout-1440, layout-320, drawer-open, after-orbit and both canvas observations.
- Viewed actual recorded-video PNGs for capture d2c0eca1-50fb-4d80-8375-997db4604200 at 200ms and750ms, and reduced-motion capture237a2955-8a09-472c-9334-f517d9198684 at700ms and1300ms. These show different rotor orientations in ordinary motion and the same rotor pose in the reduced-motion frames. They do not establish smooth motion.
- The320px heading visibly joined “differentatmosphere” after its second explicit break was hidden. The narrow philosophy heading broke into five short lines. Ordinary horizontal overflow checks nevertheless reported scrollWidth320, demonstrating that no-overflow alone did not catch the typography defect.
- Desktop and mobile renders showed a pale rectangular WebGL ground plane distinct from the intended ivory page.
- App-annotated ordinary state reported6 rendered frames at2seconds,29 at8seconds,29 render calls and22,454 triangles. The report’s Motion cadence gates failed: live-reveal maximum gap283.3ms; reduced-motion maximum gap266.7ms. There is no passing temporal verification from these captures.
- Ten ordinary drawer repetitions ended closed. The real drawer Motion request returned a3000ms locator.click timeout, without identifying the failing step in the supplied response. That timeout is unresolved, not assigned a fabricated cause.
- The real rapid_motor request was rejected because its17 actions exceeded the tool’s16-action limit. The original request is preserved unchanged; a separately bounded recipe removes only its initial250ms wait for a fresh paired initial/final capture.
- Root independently reported and repaired a Motion serializer defect: the tool previously collected only data-* final attributes although accepting aria-busy/open contracts. The app already set aria-busy; the original tool’s missing attribute is not treated as an app defect.
- Browser observations reported no uncaught app errors. GPU ReadPixels warnings were present. The sampled renderer resource counts were20 geometries and1 texture at both observation times; this is not a general leak proof.

## Evidence-led candidate edits
- Retained explicit heading breaks on mobile and added a literal separating space, restoring readable text. At widths360px and below, the philosophy label and heading stack rather than compressing the heading into a narrow side column.
- Removed the full-screen lit ground plane and repeated shadow-map rendering. Added a small layered procedural geometry contact-shadow proxy against the transparent scene background.
- Baked fixed geometry by its existing material and merged the three rotor blades into one articulated rotor mesh. Reduced cylinder/ring subdivision while preserving the original shapes and materials. This targets the observed render workload; actual performance improvement remains to be measured.
- Render only when the scene is visible and changing, and skip WebGL draws behind the open modal. Reduced-motion mode keeps functional controls and a real static3D pose without continuously redrawing it.
- Integrated the eased rotor velocity over the same bounded wall-clock interval and advance that state before power/speed retargeting. The original50ms cap caused simulation time to advance much less than observed wall time under the slow recorded cadence. The changed math retains velocity through retargets and bounds suspended-frame catch-up at250ms.
- Added an explicit data-ready telemetry annotation without replacing the existing aria-busy accessibility state.
- Added FINAL_VERIFICATION_REQUESTS.json with the separately corrected16-action motor recipe and ordinary supplementary observations. CAPTURE_REQUESTS.json, original valid recipes and all budgets remain unchanged.
- `node --check src/main.js` and `npm run build` passed after these edits. Bundle warning remains: JS524.62kB (136.32kB gzip), CSS11.72kB.

## Candidate status
Candidate source is ready for actual before/after verification. No final browser or motion success is claimed until the requested returned evidence is inspected.
