# AER: a runnable paired case

From the repository root, with Node.js 22+ and npm:

```sh
npm run demo:study
```

Open the printed `http://127.0.0.1:4110/` URL in a fresh, credential-free browser profile. No root dependency install is needed for the launcher itself. Ctrl+C stops the viewer and its four owned app servers. It never opens a browser automatically or binds a public interface.

## What you see

Two independently built AER product pages, shown as **Without the plugin** and **With the plugin + skills**. Each panel selects **Initial build** or **Repaired build** from an actual saved source directory. You can interact with the 3D fan, use its controls, open its details, or open the full page at its own loopback URL. Reload replays the app's real startup; it does not replay a fabricated recording.

A short demo:

1. Read the linked product brief and compare the two initial pages
2. Try power, speed, orbit, loading reveal and details; check a narrow viewport too
3. Select each repaired build and repeat the same interaction
4. Follow the evidence guide for the agent's requested observations, diagnosis, source changes and actual captures

The stage selector changes which preserved app is loaded. Neither app contains an authored initial/fixed switch. Different app origins isolate application state from the viewer and the other arm. At a narrow viewer width the panels stack; **Open full page** is the clearest way to inspect an individual desktop or mobile viewport. The viewer reports the embedded frame width, so side-by-side previews are not mistaken for identical 1440px evidence captures.

## Installation and build behavior

The command copies each snapshot into `.motion-debugger/study-demo/`, verifies its `SOURCE-HASHES.json`, then runs these steps visibly, using **that app's own package and lockfile**:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run --ignore-scripts build
```

Dependency installation needs access to `https://registry.npmjs.org` unless the cache already contains the locked packages. The launcher uses a local npm cache and empty user/global npm configuration; it does not read a personal npm login or forward API/auth environment variables. Dependency lifecycle hooks and pre/post-build hooks are disabled. The saved app's explicit build script runs, normally `vite build`. Its source, package and lockfile remain unchanged; generated files live only in the copy. No new dependencies are added to the root project. Vite/Three.js versions can differ between arms because each builder selected its own pinned dependencies.

The bundled apps use procedural geometry. Runtime does not need a CDN, credentials or model APIs. App response policy blocks outbound connections, external scripts, embedded remote resources and forms. Every server binds `127.0.0.1`, accepts only its printed Host, and serves read-only build assets. The viewer is **not** an interactive agent host: it does not run a new generation or repair, and it does not install the plugin into your coding agent. The linked case record documents the actual prompt-to-page and autonomous evidence-led repair work.

Useful options:

```sh
# Reuse only builds whose source-manifest AND output-file hashes still match
npm run demo:study -- --reuse-builds

# Fully offline after the appropriate pinned packages are in this npm cache
npm run demo:study -- --reuse-builds --offline

# Pick an available loopback port automatically
npm run demo:study -- --port 0

# Build all four snapshots and exit; fail if any are missing or failed
npm run demo:study -- --prepare-only --require-all

# Optional existing credential-free npm cache (for restricted/offline environments)
npm run demo:study -- --offline --cache /tmp/aer-npm-cache
```

A missing snapshot is explicitly **unavailable**. A source hash mismatch or install/build error is explicitly **failed**, with no iframe for that stage. The full output remains in the terminal and `.motion-debugger/study-demo/<arm>-<stage>/build.log`; status is in `.motion-debugger/study-demo/status.json`. Stop the launcher, resolve the problem, then rerun. Preparation exits nonzero for any failed build; `--require-all` also fails when a stage is missing. A running viewer remains available to inspect the successfully built outputs and the visible failure state.

Only one launcher may own the prepared copies at a time. If an interrupted process left `launcher.lock`, inspect its recorded PID and remove the lock only after confirming that process is gone. Cached builds are rehashed before reuse. `--reuse-builds` is a startup optimization, not a replacement for a fresh install when checking dependency availability.

## Verify honestly

Dependency-free mechanical checks:

```sh
npm run test:demo
```

These test source integrity, exact version requirements, credential-free package sources, omitted secret environment variables, loopback/Host/method restrictions, traversal/symlink rejection, separate app origins and visible missing/failed states. They do not establish visual or motion quality.

On a browser-capable machine, first install the root test dependencies and the official Playwright Chromium build, then run the real-output smoke checks:

```sh
npm ci --ignore-scripts
npx --no-install playwright install chromium
npm run test:demo:browser
```

No browser security flags or global OS configuration changes are part of this flow. On a machine missing Chromium system libraries, use a browser-capable CI runner rather than disabling security or changing global settings through this demo. `--allow-partial` is an explicit browser-test option for inspecting completed initial stages while a repaired snapshot is pending; it never treats failed builds as passing.

The browser spec loads real iframe pages and verifies their headings/canvases, correct snapshot origins, stage switching, reload, keyboard activation, reduced-motion navigation and viewer overflow at 1600, 960, 390 and 320px. It saves screenshots, an execution report and launcher logs under `artifacts/study-demo/`. Screenshots must be visually inspected before claiming visual QA. A canvas being visible is not proof that its meshes animate smoothly or that the repair succeeded; inspect the saved study recordings and Motion MCP evidence separately. The browser smoke suite is deliberately narrower than the study's interaction/motion harness.

## Scope and limitations

This is **one paired case**, not a general benchmark or a causal estimate. The baseline is a genuine independent build; it was not intentionally broken for a contrast. Both arms receive ordinary browser evidence, and the treatment additionally uses the frozen design/3D/workflow skills and Motion MCP temporal evidence. Build and repair decisions belong to the independent agents. Differences in dependencies, unseeded model execution, requests and iteration counts limit attribution. A successful launcher or CI run proves only the stated checks completed, not that the treatment improved quality.

The pages represent a fictional product. Pricing and specifications are illustrative. Nothing is purchased, no personal browser profile is imported, and no public network deployment occurs. See the case's linked method and evidence guide for exact execution provenance and any still-pending verification.
