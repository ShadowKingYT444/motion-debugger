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

## Explicit continuation handoff, 2026-10-02 16:23 UTC
The final repair pass below was performed by a **different continuation worker**, previously assigned only public visual-reference research. The original treatment builder could not be resumed and a fresh worker could not be created because the agent-thread limit was reached. This is a second-worker, second-pass treatment continuation, not a matched single-agent execution. The worker was told to inspect the actual treatment evidence independently, preserve the brief and frozen requests, and stop for root-run actual CI. It received no prescribed implementation fix and did not access baseline directories or seeded examples.

## Second-pass observations and diagnosis
- Read this execution record, treatment source, the original AER prompt, and all four frozen design/3D/workflow/evidence skills.
- Viewed the actual final desktop and 320px mobile layouts, canvas-frame-a and drawer-open PNGs. The prior mobile typography and plane-background fixes are visibly present; the fan remains real procedural 3D with a coherent silhouette and readable blades.
- Viewed actual recorded-video frames from motor capture `c6f0ce65-ea9d-4a94-9d82-3f192f797c43` at 450ms and 950ms, and drawer capture `6bd7c07f-f24f-4d04-8273-127995187de9` at 340ms. The rotor orientations differ, but those sparse images do not establish smooth motion. The 340ms drawer frame still shows the closed page; the trace shows delayed real actions, so no invented drawer-specific cause was assigned.
- Read actual raw reports and motor rAF/event traces. Final motor sampling reports 109 samples over 13259.4ms, maximum gap 300ms. Drawer reports 216.7ms maximum gap; live reveal reports 16 samples/1556.5ms, maximum gap 116.7ms. Reduced-motion reports 138 samples/2386.6ms, maximum gap 50ms and passes its unchanged contracts. Motor trace begins with repeated roughly 100ms sample intervals while app-marked rotor states advance.
- Candidate cause: repeatedly shading the fixed housing, guard, pedestal and shadow alongside the rotor consumes substantial rendering time in the recorded environment. This is a hypothesis supported by the animated/static contrast, not a proven attribution to a specific GPU or shader. The discriminator is a fresh identical capture with the fixed scene cached, comparing cadence, final states and actual intermediate pixels.

## Second-pass candidate repair
- Added a camera-pose-local color **and depth** render-target cache of the existing fixed real geometry. Every rotor frame still renders the actual three-dimensional blade mesh through Three.js. The cached depth keeps the guard and housing occluding the rotor; no flat replacement illustration or CSS rotor was introduced.
- While orbit moves, render the complete original scene. Rebuild the cache when orbit settles or the canvas resizes. Snap the already-settled camera to its exact target so cached geometry and dynamic depth use one pose.
- Preserved the original material palette, lights, geometry, interaction/motor math, responsive CSS, power/speed controls, reduced motion and drawer behavior. Added disposal for the cache target and labelled cache/resource counters to existing app telemetry. Added no dependency or external data source.
- Retained a source snapshot at `continuation-evidence/main.before-continuation.js` for this specific pass.
- Both frozen request files remain byte-for-byte unchanged: CAPTURE_REQUESTS SHA-256 `5fdee64beb2f1968af7c9d4ea5048b124a7a98f7cf2e2c60a57dd1ad8e32e438`; FINAL_VERIFICATION_REQUESTS SHA-256 `24bff6feeb6a2d4cad9fb0f793854fc88de2c12bb81b56906e0338051ed58979`.

## Second-pass verification boundary
- `node --check src/main.js` and `npm run build` pass. Vite retains the known >500kB bundle warning.
- The default `npm run dev` host discovery hit `uv_interface_addresses` in this sandbox; explicitly binding Vite to `127.0.0.1:4174` started successfully without changing source or scripts.
- The cloud browser refused that loopback URL with `ERR_BLOCKED_BY_CLIENT`. No alternate access path was attempted. The worker has no exposed Motion MCP tools in this execution context.
- New shader/runtime rendering, visual fidelity, occlusion under orbit, resource counts and unchanged temporal gates therefore require the parent’s actual CI/browser capture. Successful compilation is **not** a claim of runtime or motion success. No publication, credential, paid-service or user-computer action was taken.
