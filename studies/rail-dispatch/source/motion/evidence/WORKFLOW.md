# Motion-assisted SIGNAL build

Original local railway dispatch console built from the shared brief. Audience: rail dispatch operators; task: follow services and inspect stations; direction: ivory editorial control room around a dark geographic atlas. Spacious desktop composition, restrained operational motion, moderate information density.

## Direct guidance read
- `plugin/motion-debugger/skills/motion-debugger/SKILL.md`
- `plugin/motion-debugger/skills/motion-design/SKILL.md`
- `plugin/motion-debugger/skills/motion/references/transition-authoring.md`
- `plugin/motion-debugger/skills/motion/recipes/transition-patterns.mjs`
- `tests/v2/review-browser.ts` for official SDK transport usage.
- Actual MCP `motion_recipe({id:"kinetic-field"})` response, including spring and handoff pattern source and evidence guidance, saved in `recipe-trace.json`.

The recipe's persistent spring preserves camera position and velocity when service or view changes mid-transition. Original SVG geometry and controls belong to this app. Stable three-car train groups follow real SVG path lengths at shared dispatch time. Scrubbing is an intentional direct seek. A single native elapsed-time loop renders camera and trains; visibility resets elapsed baseline. Reduced motion disables continuous travel, permits direct timetable seeking, and moves camera to useful final state. Pause freezes trains/signals while view input remains available.

## Transition plan
Clock: browser-monotonic-ms. Actors: SVG `#camera`, `#harbor-car-0..2`, `#summit-car-0..2`, `#valley-car-0..2`; DOM controls and inspector retain identity. Camera coordinates use SVG parent-local scene units; train cars use SVG path arc-length units. Camera beats retarget on focus/overview/service selection, no phase dependencies. Latest input wins and camera carries position and velocity. Timeline direct seek carries neither. Useful completion: selected service matches inspector, target station focus is legible, overview reverses camera, pause shows Resume. Protected source at first measured candidate: index.html, style.css, recipe spring; app.js motion edits allowed. No seeded defects; all source and palette are original except the supplied exact spring primitive.

## Native verification
Official SDK Client + StdioClientTransport to `build/mcp/index.js`, local credential-free loopback app port 4134. Browser session takes exclusive `/tmp/motion-rail-browser.lock` via flock. Captures and structured replies recorded in `capture-trace.json`; delivered native PNG bytes saved with SHA-256 hashes. The journey interrupts focus by selecting Summit, reverses overview, focuses again, pauses, and scrubs forward then backward. Desktop, 390px mobile, and reduced-motion recordings use the same journey and positive outcomes.

This records actual Chromium through the MCP protocol; it is not proof of a fresh installed coding-agent host invocation, statistical advantage, a blind preference study, or a rail safety product. Source freeze/commit and CI provenance are parent-owned.

## Result and limits at freeze
- SDK calls: 1 `motion_recipe`, 3 `motion_capture`, 3 `motion_frames`; 1 `listTools` schema discovery. No capture errors or failed requests. Exact requests, structured responses and elapsed timings retained; native image payloads preserved as PNG with hashes instead of redundant base64 in trace.
- Captures: desktop `3fcf5fb5-2b6c-4f30-9b7f-1eaa008dc48c`; mobile `2a029758-a25f-4849-843a-33e42e142ec2`; reduced motion `e5302494-1c03-46dc-95bf-75d2c45069d1`. Positive delivery passed on all three; 240 valid samples each and sampling sufficient. No detector findings under the declared presence/replacement/outcome contract.
- Target measurements are the network DOM rectangle, not individual train/camera actor continuity measurements. The largest target steps include native scrolling to controls (262px desktop, 479px mobile), so these do not imply train discontinuity or a smoothness pass. Native timed frames visually inspected at desktop/mobile initial and final states; mobile inspector separately inspected via actual browser screenshot.
- Actual browser functional assertions passed: time advances, pause freezes time, direct scrub sets time120, latest Summit service survives focus reversal, replay resets time and resumes, export downloads actual JSON, no page errors. `functional.json` retains observed states and export bytes are in `exported-dispatch.json`.
- No evidence-indicated repair made; candidate1 retained. Protected HTML/CSS/spring and app source hashes verified unchanged after capture.
- Remaining limitations: inspector departure/next-stop times are illustrative per-service schedule copy rather than recomputed nearest-stop predictions; train paths loop indefinitely; mobile overview intentionally crops outer endpoints and small geographic labels. No individual-actor latency/smoothness thresholds measured, no long-session endurance or hidden-tab browser test, no actual rail data.
