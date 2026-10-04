# v0.3 private preview: verified behavior

The package is not published to npm. Repository visibility and licensing are unchanged.

## Full release-path check

Source: `370ac841187f335514250998e17701d4f31b932b`.

[CI run 37021661092](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/37021661092) passed:

- Build/typecheck and 30 unit, transport and installer tests
- Existing v1 browser proof and responsive viewer checks
- Four before/after example pairs through actual MCP stdio
- Actual PNG image responses from `motion_frames`, decoded from saved WebM
- 31 existing example UI checks and 26 kinetic/interaction checks
- An independent RAF-driven page with a deliberate callback stall
- Fresh tarball installation into a separate consumer, with its own 100 dependencies
- Separate standalone-plugin install with its own two dependencies and SDK handshake
- Installed CLI/library/configs/recipes, Chromium launch and packaged demo
- Two fresh installed-package video captures, inspection and before/after comparison

These checks exercise protocol and package behavior. They do not establish live interactive compatibility with every editor, or an autonomous coding-agent repair rate.

## What the installed package measured

The courier's deliberately reset trajectory exceeded its 40px-per-60Hz-equivalent displacement budget: **283.148px**. Its continuous repair measured **17.739px**, passed the same expectations and preserved the final delivered pose.

These are scenario-specific motion contracts, not universal smoothness scores. The two variants are intentionally authored examples.

## A real recorder bug caught during release testing

Reading geometry inside a recorder RAF callback can happen before the app's own RAF callback. Under uneven frame intervals this pairs a stale pose with a newer timestamp, creating a false velocity spike.

The recorder now reads in a post-RAF task, retains the associated frame timestamp and records `observedAtMs` separately. Superseded pending observations are discarded. The independent constant-speed test, including a 40ms callback stall, measured the expected **3.333px per 16.667ms**, with a 50ms maximum observed frame gap.

This is an observation strategy, not a guarantee of compositor-perfect timing. Delayed or missing samples remain subject to evidence-integrity checks. Video seeking uses a measured host offset and is approximate; use sampled evidence for precise timing claims.

## Reproduce

```sh
npm ci
npx playwright install --with-deps chromium
npm run check
npm run test:e2e
npm run test:v2:e2e
npm run test:install
```

`test:install` installs the packed artifact instead of linking the source tree. Its full mode requires actual browser launch and captures. `--skip-browser` is an explicitly labeled local fallback, not a passing browser result.

CI artifacts include source-run traces, video/PNGs, frame provenance, kinetic timed recordings, and `install/verification.json` plus command logs. Do not share captures of unrelated private applications.
