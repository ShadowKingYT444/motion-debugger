# Drawer continuity: a new source-repair case

This is a supplemental agent-authored source repair, separate from both the frozen historical AER paired-build study and the new shared-start repair ablation. It does not establish an advantage over an ordinary debugging agent.

The before page copies the five runnable files from `studies/aer/treatment/final` at source commit `63eff24c88dcbf42438230117834d8247e103367` byte for byte. No bug was planted. Ordinary Chromium inspection found that the native details dialog animates in but disappears immediately on close. The first recorded post-close sample had zero width and `display:none`.

The after page uses native `display` and `overlay` discrete transitions to retain the real dialog through exit. The recovered CSS-only checkpoint failed keyboard reopening: `showModal()` reapplied `@starting-style` and reset the entry pose. The new JavaScript repair distinguishes reopening a still-rendered exit from a fresh entry. CSS suppresses `@starting-style` for that retained exit, allowing the native transition to reverse from its current pose. This avoids replacing the transition or a synchronous geometry handoff. The obscured WebGL renderer stays parked through the retained exit and resumes when its actual CSS transitions finish; motor integration remains continuous. This removes competing GPU work during modal exit on a software-rendered runner. The original failure recording/report is retained under `artifacts/repair-failure-20261002/`; final browser checks and named playable recordings are under `artifacts/repair-case/`. The existing `prefers-reduced-motion` rule disables these transitions. Browsers without discrete transition support retain the original immediate-close behavior. The procedural Three.js geometry, motor integration and rendering cache are preserved.

Run from the repository:

```sh
npm run demo:repair
# Cached dependencies, offline:
npm run demo:repair -- --offline --cache /path/to/npm-cache
```

Open the printed loopback address. The two app origins are distinct. Try details → Escape → Enter on the restored opener, including Escape during entry and rapid reopening. The viewer never edits source or runs another agent. Source identities are shown below each live page.

Browser evidence and shipped MCP transport:

```sh
npm run build
npm run test:repair:browser
```

The browser harness checks eight repeated keyboard reversals (0/20/60/80ms delay, desktop and mobile), asserting immediate pose continuity and actual rAF-observed inward progress. The functional check waits for a real frame rather than treating a fixed 60ms host sleep as proof a frame advanced. It records elapsed frame/read time, while the separate temporal capture still enforces the unchanged 80ms gate. The harness and writes actual desktop/intermediate/mobile screenshots, timed browser videos, drawer traces, two real 3D canvas observations, capture/inspection responses, recorded-frame PNGs and comparisons under `artifacts/repair-case/`. It checks source-pair behavior, focus restoration, power/speed retargeting, orbit reversal/reset, actual WebGL pixels, final state and reduced motion. The Motion process collects evidence through the official SDK over the current built tool's real stdio transport; source editing belongs to the host agent. The separate exit continuity expectation is an explicit browser observation, not a claim that the tool can infer every app's intended close behavior.

A green browser test does not override a failed cadence assertion or non-comparable temporal result. The report retains every tool assertion and comparison as returned. This case is not a blind coding-agent benchmark. The corrected same-start experiment is recorded separately in `studies/shared-start-aer/`.

The working viewer serves named before/after browser videos only when their source manifest and media hashes match. `/evidence.json` exposes the actual report; byte ranges support playback and seeking. Run the browser harness before the viewer when recordings are absent.
