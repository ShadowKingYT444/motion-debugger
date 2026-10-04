# AER baseline execution log

- 2026-10-02 15:14 UTC: Received the independent baseline brief. Work is scoped to this directory. No experimental plugin, treatment artifact, or temporal-debugging tool is used.
- Initial implementation: self-contained Vite application with pinned Vite 6.1.0 and Three.js 0.170.0, procedural model, three speeds, power control, orbit controls, finish selection, responsive layout, accessible details dialog, and live render-data reveal.
- Local validation: `npm run check` / `node --check src/main.js` passed. First `npm install --ignore-scripts` failed with EROFS because the default npm cache is not writable. Retried using `--cache /tmp/aer-baseline-npm-cache`.
- Browser evidence requested from the ordinary mechanical execution bridge: desktop 1440×1000; mobile 390×844 and 320×720; details drawer; actual console and power/speed/orbit/keyboard/reduced-motion interaction results. Awaiting real execution, no browser success claimed.
- Cache-path retry succeeded: 12 packages installed, producing package-lock.json. `npm run build` passed; Vite emitted its ordinary >500 kB bundle-size advisory for bundled Three.js.
- 2026-10-02 15:22 UTC: Initial build ready for source freeze and actual browser inspection.
