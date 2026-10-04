# Anthropic Ants

An unofficial launch-page design concept. No affiliation, announced product, AI integration, or product-performance claim is implied.

## Run

```sh
npm start
```

Open http://127.0.0.1:4173. The server listens on loopback only. Three.js r186 is copied from the supplied installation into `assets/`; all fonts, textures, geometry, and downloads are local. No build step or network access is required.

## Experience

A sculpted terracotta workshop hosts ten original articulated ants. A shared brief brings them together, three work stations divide the planning, paper tokens return to the workbench, and a finished repair-café plan becomes available. Scroll moves the camera closer. Spring retargeting preserves in-flight position and velocity during cancellation, relaunch, and scroll reversal.

Launch runs a fixed, scripted 12-second demonstration. Pause freezes the task and colony, Cancel resets the example, and Replay starts again. The plan opens in a native modal drawer, with a visible close button, Escape, Tab containment, focus return, and a text download. Mobile uses a compact sticky colony above the task. Reduced motion removes camera travel, gait, and pointer movement while retaining task stages and a meaningful scene. Unavailable WebGL uses a readable diagram and the same complete task controls.

## Verify

With the provided Playwright installation and `/usr/bin/google-chrome`:

```sh
node evidence/journey-tests.mjs
```

The test uses ordinary clicks and keyboard input, actual browser timers, outcome deadlines, screenshots, and recorded videos. See `EXECUTION.md` for observed results and limitations. Raw Motion Debugger recordings, reports, native extracted frames, and unsuccessful attempts are retained in `.motion-evidence/`. Ordinary browser evidence is in `evidence/`.

## Source

- `index.html`: semantic page and full finished artifact
- `style.css`: editorial system, mobile layout, reduced-motion styles
- `app.js`: shared task state, original Three.js workshop and articulated ants
- `lib/spring.mjs`, `lib/drawer.mjs`: locally copied motion recipes, with dynamic opener focus added
- `assets/repair-cafe-plan.txt`: the example download
- `server.mjs`: credential-free local static server

## Limits

This is a deterministic demonstration, not a live agent backend. Motion was reviewed from real recorded frames, but software WebGL in this headless environment has uneven cadence; smoothness at a target frame rate is not established. Ant paths are coordinated targets, not collision-aware navigation. Browser testing covers supplied Chrome; cross-browser and physical-device testing remain outside this run.
