---
name: motion-evidence
description: Capture and compare temporal browser motion evidence on an explicitly requested local application. Use for interrupted reveals, responsive layout jumps, pointer-following continuity, animated drawers and bounded child motion.
---

# Motion evidence workflow

Use the motion-debugger MCP tools, not final screenshots alone, when the bug is temporal.

1. Confirm the caller's local URL, unique target selector and authorized interaction recipe. A capture runs clicks/hover/keys/pointer moves and can change app state. Do not enter credentials, click destructive or payment actions, or load unrelated targets.
2. Define explicit expectations: per-frame position/height budget, visible containment, identity or cancellation budget only if the intended design requires it, and a final interaction-state contract. These are design-specific constraints, not generic quality scores.
3. Set `contract.targetPresence: 'may-disappear'` only if the intended recipe mounts/unmounts or hides the target. Default `continuous` retains the finite-target start/end requirement. Inspect `coverage.intervals` to distinguish observed absence/hidden state from unsampled recorder time. The 80ms integrity gate remains mandatory, even if a caller asks for a larger gap budget.
4. Call `motion_capture` for the before version. It returns compact metrics, failing contracts, candidate event/sample windows and local artifact paths.
5. Use `motion_inspect` with a bounded time window around a finding, then call `motion_frames` with the capture ID. It returns native images decoded from the saved video near a failing window; optionally select up to six capture-relative timestamps. Video seeking is approximate, so use rAF samples for precise measurements. For full raw evidence read `motion-evidence://capture/<id>`.
6. Explain what is browser-observed versus explicitly app-marked/source-mapped. Cancellation can be intentional retargeting; do not diagnose a defect from cancellation alone. A source annotation is not automatically inferred causality.
7. Apply a narrow fix through the coding tools and permissions already authorized by the user. This plugin never edits source itself.
8. Capture after with the same recipe/contracts and call `motion_compare`. Verify intended final state still matches. Report precise contract deltas, evidence paths and remaining limits. `inconclusive` assertions are not passes: lack of an observed violation in an undersampled span does not establish motion quality. Samples never bridge hidden/absent spans or different node identities. Compare the environment/probe/analyzer hashes; diagnose software rendering, long tasks, probe-read cost and superseded tasks before attempting one bounded repeat, and retain every failed attempt.

Optional app annotations use CustomEvent `motion:mark` with `type`, `label`, `sourceKey` and scalar `state`. Optional source mappings require the server owner's explicit MOTION_SOURCE_ROOTS. Do not ask for tokens or persistent access.

If the browser cannot launch, report the blocker and run in a supported environment; never substitute synthetic evidence. Detector ablation is not a benchmark of coding-agent or LLM quality.
