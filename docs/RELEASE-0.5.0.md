# Motion Debugger 0.5.0 release candidate

This private, unpublished candidate adds a normal-prompt motion router, seven runnable construction modules, readonly MCP recipe discovery, positive task-outcome checks and whole-journey/detail frame inspection. The colony now has original articulated geometry, grounded lighting, responsive composition and instanced rendering. Drawer keyboard containment/opener restoration and elapsed task lifecycle have actual browser regressions.

The seven reviewed PRs were consolidated by starting from #7 (including useful release/runtime/provenance work from #2–#6), then cherry-picking #8's independent timer diagnosis and functional-first guidance. #4's recovery history is preserved in the branch history. Existing failed MONO/AER studies remain visible. Missing original Ants files were not claimed as recovered.

`npm run check` passes 154 tests across legacy behavior, core/SDK, install, workflow, demos and packaging, with one explicitly skipped opt-in native test. That viewer test passes separately. A fresh tarball install passes actual dependency installation, five-skill installation into four client destinations, SDK handshakes for npm and standalone plugin, all seven exact recipe payloads, native Chrome launch, two WebM captures, inspection and a seeded contract comparison. [Machine-readable verification](RELEASE-0.5.0.json) records its tarball hash and local evidence paths. Native recipe, colony, elapsed-sequence and outcome checks additionally cover desktop/mobile/reduced motion, interruption, keyboard, teardown and useful completion.

The [Ants study](../studies/ants-launch/README.md) demonstrates actual fresh-session tag/skill/MCP use with two matched native builds. Both complete useful journeys and deliver substantive original 3D. It does not establish a general aesthetic or smoothness advantage; normal browser testing also repaired the ordinary build's task clock. Study sources and trial runtime are frozen separately from subsequent release refinements. Complete source-bound footage, retained failures and independent expectations accompany the results.

The [portable package builder](PLUGIN-PACKAGES.md) produces Codex, Claude Code, Cursor and standalone Agent Skills archives with exact file/archive hashes. Fresh dependency and SDK checks establish server compatibility; actual Claude Code/Cursor/Gemini/OpenCode host discovery remains unverified. The fallback archive is not a native plugin. Publication and licensing are unchanged.

The new kinetic field supplies original Pulse/Weave/Orbit formations with stable object identity and continuous spring position/velocity. Play, Resume, paused changes, renderer failure recovery and teardown have separate exact-source native proofs. Native held drags now exercise forward/backward scrub reversals; capture deadlines apply to exploratory recordings too. `motion_list` distinguishes functional delivery from temporal assertions. The bundled seeded kinetic example leaves 1200ms for actual pointer input in addition to 4200ms waits.

The [LOOP studio comparison](../studies/loop-studio/README.md) uses two actual thirty-minute native sessions and an immutable initial intervention package. Its source and trial runtime are independent of the later lifecycle/deadline repairs. Both actual sessions completed before the deadline. Full recordings, original failures, current-choice exports and an independently preregistered review accompany the result. The earlier release record remains in [the Ants verification snapshot](RELEASE-0.5.0-ANTS.json).

Reproduce the release checks with `npm ci`, `npm run check`, `npm run test:install`, then `npm run package:plugins`. Open the frozen comparisons with `npm run demo:loop` or `npm run demo:ants`. The viewer fits each 1440×960 live desktop composition to its panel, supports 390px/native fullscreen views and actual iframe downloads. This presentation scale does not modify recorded media.

## Reproduce the native browser suites

From a clean checkout, install the repository's locked dependencies and Playwright's version-matched Chromium. On Linux, the explicit `--with-deps` command also installs required browser OS libraries using the runner's normal administrative mechanism; on an already prepared machine, use `npx playwright install chromium` instead.

```sh
npm ci
npx playwright install --with-deps chromium
export CHROMIUM_PATH="$(node --input-type=module -e 'import { chromium } from "playwright"; console.log(chromium.executablePath())')"
export MOTION_CHROME_PATH="$CHROMIUM_PATH"
npm run test:recipes:browser
npm run test:colony:browser
npm run test:sequence:browser
npm run test:kinetic:browser
npm run test:drag:browser
npm run test:duration:browser
npm run test:outcomes:browser
```

An explicitly selected local Chrome/Chromium binary can replace the two environment values. These are process-local selectors, not host configuration changes. CI selects the installed full Playwright binary for direct native fixtures; core captures retain Playwright's default version-matched headless shell and existing explicit browser override. CI runs all seven suites; its always-run evidence upload preserves both successful and failed runs under `artifacts/v2/`.

The colony suite needs no separate Three installation: it reads committed `studies/ants-launch/source/ordinary/assets/three.module.js` and `three.core.js` at pinned Three **0.186.1**, verifies their frozen SHA 256 entries and the consumer package/lock hashes, and copies the exact consumed bytes and metadata into its own run directory. It does not edit or execute the frozen app. An optional `MOTION_THREE_DIR=/absolute/path/to/node_modules/three` override must have that exact package version; its actual module bytes and source mode are recorded. WebGL verification uses ANGLE/SwiftShader and reports software-renderer evidence, not a physical GPU performance verdict.

Each suite leaves a run-scoped report. Recipes, colony, sequence, kinetic, duration and outcomes also write a latest `browser-verification.json` in their `artifacts/v2/` directory; drag writes `artifacts/v2/drag/<run>/verification.json`. The release JSON binds the exact verified report paths. Colony and sequence archive fixture/module bytes and retain complete recordings. Outcomes now additionally archives every exact HTML fixture, original and effective capture recipes, the tested implementation sources and runtime-function hashes, and SHA 256/size bindings for actual capture reports, screenshots and videos. The seeded caught-error, missing/ambiguous/late-result and deadline cases intentionally fail functional delivery while their regression expectations pass. Their failures remain evidence; none is a blind coding-agent comparison. A nonzero suite exit or a report marked failed must be investigated rather than presented as release proof.

The historical drawer-repair direct fixture also honors `MOTION_CHROME_PATH`, records browser identity and writes source-bound exit/native-event diagnostics before assertions. Installed full Chromium 153 passes its original two-intermediate-frame minimum, repeated reversal, mobile and reduced-motion checks. No frozen case source or transition/assertion threshold changed. Prior CI failures remain retained separately from the main handoff.

The colony fixture supplies full elapsed rAF seconds to its analytic motion instead of capping each frame at 50ms. The cap slowed physical time on software frames around 200ms and delayed its stationary pixel result. Its exact pixel-stop, gait, spacing, fitted camera and disposal assertions are unchanged; Chromium 153 passes desktop/mobile/reduced conditions. Release proof links use immutable run files; original fixture proof and failed CI are preserved separately.

Historical repair-fixture steps that intend a fully settled close now observe actual `display:none` with a three-second bound, rather than treating a fixed wait as proof of completion. The helper retains pre/post native state, animation time, event timestamps, full trace and timeout evidence. Early retained-frame and reversal timing, focus restoration, reduced-motion immediate checks and the 350ms CSS source are unchanged. The final local native run passes with all fourteen completion observations, including one actual late transition.
