# Interrupted courier: evidence contract

The default `/examples` scene is an original SVG articulated courier delivering a note. Both lanes play the same destination changes and reach the same final pose. The seeded lane deliberately resets position and velocity during the first redirect. The repair is handcrafted source behavior, not a claim of autonomous agent repair.

## Exact changed-file manifest

- `src/examples/KineticScene.tsx`: deterministic spring integration, articulated pose, anticipation, secondary motion, interruption, settling, autoplay and manual controls
- `src/examples/kinetic.css`: cream editorial comparison, responsive two-lane scene and controls
- `src/examples/Examples.tsx`: new first/default scenario and four-tab keyboard wrapping; previous scenarios preserved
- `src/examples/recipes.ts`: fourth identical-action capture pair plus source mapping; previous contracts unchanged
- `src/examples/verify-kinetic.mjs`: continuous video and real browser frame-trace QA
- `src/examples/verify-examples.mjs`: invokes new verifier after prior UI checks
- `src/examples/KINETIC-QA.md`: this manifest and evidence specification

## Measurable gates

Run `BASE_URL=http://127.0.0.1:4173 node src/examples/verify-examples.mjs` after building/starting the application with a Playwright Chromium installation.

- Real pose travel exceeds 210 CSS px at 1440 viewport, 140 CSS px at 390 viewport
- Seeded normalized frame displacement exceeds 90 px at 1440, 50 px at 390
- Repaired normalized frame displacement stays below 40 px per 60Hz equivalent step
- Body tilt and antenna each show over 30 distinct poses in the real recorded sequence
- Both lanes reach the exact same `translate(365.000 166.000)` pose with `data-state=delivered`
- Pause freezes the actual pose; keyboard play resumes from it
- Manual redirect changes the actual destination, not just a label
- Reduced-motion prevents autoplay; replay provides an immediate equivalent delivered pose
- No horizontal viewport overflow at 1440, 1024, 390, 320 widths
- Four tabs wrap correctly under keyboard navigation
- No uncaught browser errors

Evidence in `artifacts/qa/examples/kinetic/`: uninterrupted `courier-continuous.webm`, `frame-traces.json` (real RAF clocks/geometry/articulation), `frame-captures.json` (actual capture clock/phase bounds), `motion-checks.json`, and actual timed anticipation/flight/redirect/landing/settled screenshots at desktop and mobile widths. Frame screenshot names indicate their target phase; trace timestamps reflect actual browser timing, not a synthesized frame.

Core MCP recipe pair: `/examples?scenario=kinetic&mode=baseline|fixed&autoplay=0`, selector `#courier-target`, replay + 4000 ms + 200 ms waits, total 4400 ms, 1280×1000 viewport, no-preference reduced motion. Contract: maximum normalized step 40 px, zero replacements, visible delivered final state. Both recipes have identical selectors/actions/viewport/contracts. Browser probe and capture artifacts provide the observed proof.

Visual review remains required: watch the video and inspect the frames for clipping, character-scale legibility, clear destination change, phase ordering, envelope continuity, responsive controls, and perceptible overshoot/settle. Typecheck alone does not establish these properties.
