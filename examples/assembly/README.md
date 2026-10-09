# ASSEMBLY

Original camera configurator built as an engineering demo of the motion recipes. This is a **hand-authored engineering demo**, not an ordinary/assisted agent pair or a superiority benchmark. The full campaign remains disabled in `docs/assembly-demo.protocol.json`.

Run `npm run demo:assembly` and open the printed loopback URL. The packed binary also serves it at `/assembly/` after `motion-debugger demo`. All geometry is original, and Three.js is vendored locally with its MIT notice. No CDN, user profile, telemetry or external service is used.

Open the camera; select another lens while it moves; reverse and reopen; explore the sensor; save the current selection. Every physical lens stays in the scene. The labeled part follows its actual projected position. Held range input seeks directly in either direction. Release and cancellation keep the held pose paused; Resume moves to the current desired endpoint. Replay deliberately restarts the opening. Reduced motion snaps to meaningful states. The SVG fallback keeps selection, state, keyboard controls and export available when WebGL is unavailable.

`design.mjs`, HTML, CSS and vendor bytes define protected art and endpoints. `design-manifest.json` declares the exact protected hashes and the approved responsive camera field. `motion/controller.mjs` contains the authored timing. `app.mjs` contains state/renderer wiring and explicit post-render observation. App pose annotations do not prove painted pixels; normal-speed recordings remain necessary.

`public-contract.json` publishes behavior and calibration bounds. `npm run test:assembly:browser` verifies desktop/narrow, interruption, latest-selection wins, direct scrub/cancel, pause/replay, keyboard/export, reduced motion and forced WebGL failure. It retains every failed attempt, native endpoint screenshots, whole native films and named bounded trace windows under `artifacts/assembly/`. Emulated mobile and recorded video cadence do not establish physical phone performance or display FPS.

To prepare the **same functional input** for future motion creation arms:

```sh
node scripts/prepare-assembly.mjs --destination /absolute/new-assembly-input
```

This creates a fresh atomic directory with common art, actor names, camera, endpoint poses, state API, local dependency and observation hooks. Its controller switches endpoints instantly. It omits the authored animation controller, recordings, prior agent outputs and Git history. The input is a starting scaffold, not a completed normal-motion solution. Freeze tool/skill access, endpoint screenshots, host settings, hidden schedules and evaluation inputs separately before any agent trial. The preparation command neither enables nor launches a campaign.
