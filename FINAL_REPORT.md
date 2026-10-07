# Motion feedback root fix — final report

## Outcome

Motion Debugger now uses one evidence model for capture assessment, actor contracts, comparison, review, frame selection, and probes. Browser-observed motion failures can no longer be hidden by a passing legacy target summary, while sparse, mismatched, scene-reported, or unsupported evidence remains unverified rather than becoming a pass.

The final continuation closes two additional false-pass paths:

- Anchor tracking now validates the ordered subject/anchor pairs themselves. A complete one-to-one sequence is accepted; otherwise paired frame gaps, paired read gaps, and observation lag must all stay within the unchanged 80 ms gate. The exact 64-sample control with 11 missing interior pairs and a 192 ms paired hole now remains unverified, while complete fast pairs still pass.
- Response no-op exemptions are now bound to the uniquely mapped action epoch, relevant beat, coordinate system, and beat target. In the `100 → 50 → 100` control, an actor frozen at 100 fails the first `go` epoch and may legitimately no-op only for the mapped `back` epoch. Missing or ambiguous correspondence stays `unverified-target-correspondence`.

The broader delivered change also makes actor contracts first-class comparison evidence, shares product-failure signatures and failure windows, requires complete review outcomes/exclusions, preserves terminal-arrival and supersession semantics, adds bounded orientation and independent screen-anchor contracts, and ships reproducible browser, package, native-host, SIGNAL, and study tooling.

No npm package was published. No merge, external message, license/ownership/credential change, or host/global configuration change was made.

## Matched old/final detector evidence

The matched native Chromium sensor used identical fixture bytes, intended actions, browser, and locked Playwright dependency. Old commit `4157fd25a696c8de1eef0f0fad83b0cd4b1fa622` and final runtime results are retained separately:

| Runtime | Result | SHA-256 |
| --- | --- | --- |
| Old 4157 | `artifacts/motion-value-sensitivity/2026-10-07T07-39-00Z-old-4157/results.json` | `10b9214cc96f41f5094d78ceff265290eb5152c86c7c204d656d9461f671a615` |
| Final | `artifacts/motion-value-sensitivity/2026-10-07T07-40-00Z-final/results.json` | `4cc6a2cfc95d8c59a86ed0c977afaa166f90ca45368d3dafd576942648b79102` |

The reference passed both runtimes. The old runtime passed a fixture containing eight rotation flips and passed about 45.975 CSS px of label drift because orientation and independent anchor guarantees were unsupported there; those are detector blind spots, not fulfilled old guarantees. The final runtime failed the rotation fixture at 3.1733 radians over 16.667 ms against 0.35 and failed the label fixture at 45.980 CSS px against 3. Its label result used 120 one-to-one pairs with paired frame/read gaps of at most 16.8/17.2 ms and 1.7 ms observation lag. Final negative-control films are SHA-256 `704e8c19c097f717341072c7f9e3b3ce87ae9d1390f40f92c77ec82c75d2d95e` and `1ee75e4eae3e5d99268d4a87b2f440f103228720e28a1fca94935e11a2851d9c`.

Runtime identities for that comparison:

- Old compiled core: `0c39ba4ab038a4e9fb267cda73441e5691459e579a32ffac98f8f48946958c48`; old probe: `c194a3f5d19128b37c056db2f190d2670d054e65453724ee5778fc0b08a72542`.
- Final compiled core: `f51b71925fb29f612c38052b5e6476f3e5c8cce1adba8915fa14899ea669549c`; final compiled probe: `fd02bc311c82ca5eef62d2bbed97d8e9abeda37607fc89d68dd8dafab92db8d0`.
- Final source actor analyzer: `e1abce135c4ac0ca09d7b8812cddb60af4a2a1f7443d3426fd5cd12d2d3199af`; final source review: `2d6bf9246e2079dbc49c349f083e81c5e8bbc897d88a6275888487165f1beaba`.

The sensor establishes detector behavior over native browser observations. Its synthetic frame/comparison controls are unit evidence only; it is not a coding-agent or aesthetic benchmark.

## Browser, package, and native-host verification

- `npm run check` passed the complete local build and Node test set with the original Node subprocess verification restored; no Bun fallback remains.
- Focused actor/review tests and actual Chromium actor, review, authoring, transition, coverage, repair, failure, recipes, colony, sequence, kinetic, drag, duration, outcomes, assembly, demo, ants, v2 e2e, and ordinary e2e suites passed. Retained failed attempts include the initial localhost SPA routing and colony timing races that were fixed without weakening contracts.
- Final SIGNAL verification passed 29 checks in each of six ordinary/Motion desktop, mobile, and reduced-motion journeys: `artifacts/rail-runs/2026-10-07T06-57-42-516Z-e45fdaf3/verification.json`, SHA-256 `52dea6d70c4c5958e9f8054857d7f43091ea90ee402c6b4d9c018a8565fc8fc0`. The runner measures station focus relative to each arm's pre-click camera scale and preserves each frozen app's own reduced-motion policy.
- Fresh package verification passed all 18 checks in an external consumer that installed its own 100 dependencies: `artifacts/install/2026-10-07T07-23-37.294Z/verification.json`, SHA-256 `e2ec6dbc5fede9b7410778af5a3d5eb10556e0bb51e47081dc1f357bb7a969f8`. It exercised the installed CLI/core, configuration formats, skill and MCP installs, standalone plugin, real browser, packaged SIGNAL viewer, two-WebM comparison, native review, and SDK PNG delivery. Tarball SHA-256: `f8333df107382aa4123dddcfd1cc6dcace49da55ac646768998ab82c094c6ac2`.
- Native Codex-host smoke passed at `artifacts/native-codex/2026-10-07T07-24-56.655Z/verification.json`, SHA-256 `2faad273f2c66e9ad45fc070481e79a41e01dca8004d51a31551f6f1f2c3144c`. Codex CLI 0.160.1, using the saved `gpt-6.1-sol`/`xhigh` configuration, called packaged `motion_review` once, received three actual image blocks, kept application source stable, and identified the labeled 240 CSS px reset at 549.8–566.5 ms. Provider-wire model identity remains unverified. This is a packaged transport/host smoke, not a benchmark.

Desktop, mobile, reduced-motion screenshots and timed native recordings were inspected directly. They show coherent SIGNAL state and responsive layouts; the native-host frame also illustrates that a selected frame need not precisely bracket a short reset. Browser rAF timing is not physical display FPS, human tracking, or an aesthetic judgment.

Hosted CI was not run in this workspace. The local reports retain exact browser, source, package, and working-tree provenance.

## Frozen pilot and final regrade

No completed nine-session product cohort exists. The frozen attempt at `artifacts/bello-root-fix/attempt-2/motion-value-pilot/2026-10-07T05-41-07.202Z` launched three tasks × three arms under Codex CLI 0.155.1, which rejected the configured host model. All nine sessions exited `agent-failed` in about three to five seconds; none created an initial checkpoint, and no Motion arm called Motion tools. Three construction-arm final directories contain changed bytes, but they are not successful agent trials or bound repairs.

The final package regraded those preserved final bytes without launching agents. The immutable held-out commitment verified, but the result remained 0 agent-completed, 0 functional passes, 0 motion-consistency passes, and 0 Motion adoption: `artifacts/motion-value-regrade/2026-10-07T08-00-00Z-final/RESULTS.json`, SHA-256 `44d7d2e96c9c87c5848bfd163d02dc976c995b0b3b0975dbeec03add77945162`. The regrade used final package SHA-256 `f8333df107382aa4123dddcfd1cc6dcace49da55ac646768998ab82c094c6ac2`, evaluator `0b89d1ca53cdfdb999967ea4093fd8d70ef291c4b251efddfb0a7ac724f14aed`, runner `95e4e5293afac89a99ebe3abaed01f0815b3f3677bbe5b5bc40a8b2f8710df8e`, Playwright `a0f5715ea22354f922791a9c53dc012d5d5c067ff9cc4cd35ffb7cd272071a9f`, and Chromium 152.0.7977.64.

Earlier failed regrade attempts are preserved: one detected incompatible current snapshot semantics, and one exposed an unhandled download-wait rejection. The final runner fixes download ordering and validates frozen source digests with the archived snapshot helper.

These results support no claim of general product superiority, agent repair causality, money savings, or aesthetic preference. The existing study document remains a protocol for a future properly powered campaign, not a conclusion from this failed cohort.

## Evidence boundaries

- DOM/SVG geometry is browser-observed but does not prove unoccluded painted pixels.
- App-reported scene state cannot independently establish rendered motion.
- Native video frames are real recorded pixels, but seek alignment uncertainty is uncalibrated.
- Explicit actor and response contracts test declared behavior; they are not universal motion-quality scores.
- Failed, denied, interrupted, and non-adoption attempts remain retained rather than rewritten as passing evidence.
