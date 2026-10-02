# AER baseline execution log

- 2026-10-02 15:14 UTC: Received the independent baseline brief. Work is scoped to this directory. No experimental plugin, treatment artifact, or temporal-debugging tool is used.
- Initial implementation: self-contained Vite application with pinned Vite 6.1.0 and Three.js 0.170.0, procedural model, three speeds, power control, orbit controls, finish selection, responsive layout, accessible details dialog, and live render-data reveal.
- Local validation: `npm run check` / `node --check src/main.js` passed. First `npm install --ignore-scripts` failed with EROFS because the default npm cache is not writable. Retried using `--cache /tmp/aer-baseline-npm-cache`.
- Browser evidence requested from the ordinary mechanical execution bridge: desktop 1440×1000; mobile 390×844 and 320×720; details drawer; actual console and power/speed/orbit/keyboard/reduced-motion interaction results. Awaiting real execution, no browser success claimed.
- Cache-path retry succeeded: 12 packages installed, producing package-lock.json. `npm run build` passed; Vite emitted its ordinary >500 kB bundle-size advisory for bundled Three.js.
- 2026-10-02 15:22 UTC: Initial build ready for source freeze and actual browser inspection.

## Evidence-led repairs

- 2026-10-02 15:36 UTC: Inspected actual screenshots and raw DOM/console evidence from GitHub Actions run 37027352655 / commit 34ec230c5d40e2805e6b50cfef55bbdfcba22795. All three viewport overflow checks passed. No app errors were reported; console contained software-WebGL ReadPixels performance warnings. Drawer open/Escape close and changed canvas frames were observed.
- Actual 320px screenshot: intro link and stage label nearly touch due to wrapped text and a fixed stage offset. Added vertical clearance in narrow/mobile layouts and corresponding room below controls.
- Actual desktop and reduced-motion screenshots: control card intersects the hero footer separator. Increased hero height to give the controls a clear reserved area.
- Actual DOM evidence: the canvas diagnostic data-speed attribute was selected by the speed-button synchronization query, producing invalid aria-pressed on the canvas. Restricted speed queries to buttons and renamed the diagnostic to data-active-speed.
- Actual model screenshots: support stem crosses the front of the blade assembly. Moved the stem and mounting bracket behind the fan enclosure.
- Actual screenshots: strong warm lighting and crisp pierced shadows distract from the matte product. Reduced light intensity/exposure and softened the real shadow with VSM filtering and lower opacity.
- Enlarged power/speed/material touch targets while retaining small visual finish dots. Added read-only orbit coordinates for ordinary interaction checks.
- Raised the integration delta cap from 50ms to 150ms to avoid unnecessarily slowing physical time on slow software-WebGL frames; long inactive gaps remain bounded.
