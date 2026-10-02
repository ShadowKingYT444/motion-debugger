# Motion Debugger

A small local proof-of-concept for **reproducible motion-regression evidence**: execute a controlled bug, connect its browser observations to explicit fixture source annotations, execute a one-line fix, and compare continuity and final state.

This is an instrumented-fixture debugger, not a general animation analyzer or an AI repair agent. It uses no paid services, credentials, or inference API.

## Run locally

Requires Node.js 22+ and a browser capable of Web Animations.

The working MVP is on the `mvp` branch while [pull request #1](https://github.com/ShadowKingYT444/motion-debugger/pull/1) is in draft. Clone that branch, or unzip the source bundle:

```sh
git clone --branch mvp https://github.com/ShadowKingYT444/motion-debugger.git
cd motion-debugger
npm ci
npx playwright install chromium
npm run build
npm start
```

Open http://127.0.0.1:4173 and select **Record & verify**. The backend launches Chromium and captures baseline then fixed; a report usually takes 8–12 seconds. The production build intentionally avoids React StrictMode's development-only double effects.

On Linux, install browser system libraries if needed with the official Playwright instructions (`npx playwright install --with-deps chromium`). If Chromium is already installed, the runner prefers Playwright's version-matched installed browser, then checks standard Linux locations. An explicit `CHROMIUM_PATH` overrides that choice. Video also requires Playwright's FFmpeg component, installed with Chromium. `PORT` can choose another loopback port. The server binds only to 127.0.0.1.

```sh
npm run dev             # Vite middleware + local API, when dist/ is absent
npm run capture -- 350  # Submit a capture to an already-running server
npm test                # Deterministic analysis rejection and correctness tests
npm run test:e2e        # Production browser/API end-to-end tests (requires browser)
npm run check           # Typecheck, production build and unit tests
```

`npm start` and `npm run dev` use the existing dist/ build when present. Rebuild after source edits, or remove dist/ to use development middleware. Runtime artifacts stay in `artifacts/runs/`, ignored by git. Reports survive server restart; interrupted runs are marked failed and can be rerun.

## Why this scope

Recording/frame analysis, agentic runtime debugging, motion audits and visual animation editing already exist in [web-motion-skill](https://github.com/Schmandarine/web-motion-skill), [Replay MCP](https://docs.replay.io/basics/replay-mcp/overview), [MotionScore](https://score.motion.dev/docs) and [Motion Studio](https://motion.dev/studio). This MVP focuses on an inspectable, controlled before/after regression proof. It makes no novelty claim. See [the research rationale](docs/PRIOR-ART.md).

## The regression

1. A trusted click shows logical card `card-42` and starts a 1,400ms linear Web Animations entrance
2. A real GET request to the local backend returns revision 1 after a configurable 150–800ms delay
3. In the baseline, the React key is the **revision**. A response during entrance changes identity
4. The old component's cleanup cancels its active animation. React removes the DOM node and mounts a replacement for the same logical card
5. The replacement restarts the entrance, producing a sampled backward position jump and opacity drop
6. In the fixed branch, the key is the stable **card.id**. The response updates the same component and DOM node; its entrance continues

The application contains both code branches so the same endpoint, animation, browser, viewport and response can be compared. It does **not** silently edit a user's repository or claim an autonomous repair. The displayed patch is the stable-key change executed by the fixed branch.

## Evidence, not just a recording

- A WeakMap assigns stable identities to actual DOM elements
- A MutationObserver captures additions and removals
- The fixture-owned Element.animate wrapper records starts, currentTime at cancellation and completion
- requestAnimationFrame records actual element geometry, opacity and transform in the page's performance.now clock
- Explicit application marks capture request IDs, state commits and React mount/unmount lifecycle
- Playwright independently observes the API HTTP status, captures real WebM recordings and takes screenshots with animations allowed
- Source references are generated from explicit markers in `src/fixture/Fixture.tsx`; they are fixture mappings, not source locations inferred from video

The deterministic diagnosis requires the complete active-cancellation / same-card replacement / restart / sampled-discontinuity chain. The fixed run must preserve identity, provide a valid sampled trajectory, settle at the expected endpoint, and preserve API-driven final state. Missing, null, nonfinite and unfinished trajectories cannot earn continuity passes.

The timeline is relative to the input click. The recordings begin before that click and use a measured host-side offset for approximate synchronized playback; rAF data remains the authoritative clock for metrics. Video encoders and browser scheduling can introduce small playback alignment differences.

## Safety boundaries

Only the built-in local `key-remount` fixture can run. The API accepts its name and a bounded integer delay. It rejects arbitrary URLs, uploaded source, executable scripts, unknown input keys and cross-origin mutation requests. There is no URL fetcher, shell runner, database, authentication or external deployment. Only one capture can run at a time.

The app is intended for trusted local use. It should not be bound to a public interface without adding authentication, request throttling, storage quotas and deployment hardening.

## Code map

- `src/dashboard/`: evidence workspace, synchronized replay, trajectory chart, timeline and source inspector
- `src/fixture/Fixture.tsx`: actual baseline/fixed React code and real request
- `src/fixture/instrumentation.ts`: fixture-scoped browser/lifecycle instrumentation
- `server/capture.ts`: local-only Playwright runner and capture assertions
- `server/analysis.ts`: deterministic diagnosis, metrics and cross-run assertions
- `server/source-map.ts`: explicit source annotation mapping
- `src/types.ts`, `docs/API.md`: shared report contract
- `tests/`: analysis and production end-to-end tests

## Verified result

[GitHub Actions run #36972013110](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/36972013110) passed against source head `d31feddb81f5f2de3b76c9fe79da2c70baf85621`: typecheck/build, ten analysis/API tests, four end-to-end suites, three real 150/350/800ms capture pairs, and twenty-four dashboard checks. Baseline backward jumps of **22.86 / 57.13 / 134.28px** became **0px** with the stable-key branch. All fourteen assertions per pair passed and final state was preserved.

See [the verification record](docs/VERIFICATION.md) for exact provenance, measured results, report IDs and limits. Actual browser tests ran in hosted CI because the restricted build computer could not launch Chromium. No fake report or recording was substituted. The fixed variant is an executed fixture code branch, not an autonomous repository repair.

## Limitations

This MVP establishes a narrow, instrumented regression proof. It does not discover root causes in arbitrary applications, infer source from pixels, understand arbitrary tween libraries, audit accessibility, or prove universal visual quality. Sampling may miss sub-frame glitches. A stable key is appropriate here because the logical card identity does not change; the same patch is not correct for every component-reset bug.
