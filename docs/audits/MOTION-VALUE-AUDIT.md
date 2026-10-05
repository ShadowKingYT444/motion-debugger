# Motion value audit: the missing difference is not just a demo problem

Status: research and diagnostic handoff. No runtime upgrade or agent benchmark is claimed.

## Decision

Keep FIELD as the proposed complete, from-scratch showcase. Do not choose another theme merely to find a favorable comparison. First make the observation layer sensitive to the motion relationships that FIELD needs, and measure whether the resulting feedback changes the agent's source for the better.

The present evidence supports four distinct conclusions:

1. The displayed SIGNAL pair is not a fresh test of the latest implementation. Its recorded assisted run did not use actor contracts, `motion_review`, `motion_probe`, or a measured repair.
2. Some important defects are outside the current numeric checks even when actors are supplied. Native calibration below shows missed rotation changes and missed label-to-object drift.
3. The actor-comparison gate rejects a valid failed-before/passed-after pair because it treats a detected actor defect as invalid evidence. That obstructs the repair result the product is supposed to demonstrate.
4. The plugin supplies evidence and construction code, but does not implement a visual preference critic. Better choreography still depends on the host using the returned images to make a useful revision.

This does not prove that the plugin cannot help. It does mean that “all regression tests pass” and “the page contains complex animation” do not establish a creation advantage.

## 1. What was actually available on GitHub

The audit checked both `main` at `fde065cdea0aecb4631e9106b48e0b53e327a8df` and the newer PR #12 head `4157fd25a696c8de1eef0f0fad83b0cd4b1fa622`. PR #12 was open, not merged, at inspection. This handoff adds files directly to main; it does not depend on merging #12.

PR #12 packages the frozen SIGNAL apps and four films, improves shared playback, adds error-centered frame selection, and repairs idle WebGL work and input timing in the handwritten ASSEMBLY example. Its description explicitly preserves the SIGNAL endpoints and films. Those changes cannot retroactively improve the original agent-generated pair. [R1]

The earlier four review defects are already documented in PR #11. The visible PR #12 diff does not implement that complete handoff: for example, its `reviewRecipe` still does not bind the plan's forbidden-visible selectors, and `reviewSummary` still starts from the first trusted input in the capture. Do not assume unpublished local fixes have landed. Do not refile these as new defects. The limitations below remain relevant even after those repairs. [R2], [R3]

## 2. Follow the feedback path, not the number of tools

The assisted SIGNAL record states that it made one recipe call, three capture calls, and three frame calls. It retained its first candidate without an evidence-led repair. The prose workflow names the camera and train cars, but the actual capture recipe does not provide `actors`. It selects `#network`, requests no replacement of that outer node, and checks that text says “Summit” and “Resume.” [R4], [R5]

The run therefore demonstrates real recipe use, browser recording, frame delivery, and useful terminal state checks. It does not demonstrate that the new review tools found a motion defect and improved the generated animation. The packet does not measure whether cars follow their routes, stay correctly oriented, remain visible, or stay consistent with the camera. Reading a prose actor plan does not register those actors in a capture.

There is a real construction difference: the assisted camera reuses a supplied spring. That can be useful without a later repair. But a copied primitive is not evidence that the observation/repair layer adds value beyond access to the same primitive. The experiment in `../evals/MOTION-VALUE-EXPERIMENT.md` separates these contributions.

Also, the demo is already from scratch. The problem is not simply that a prepared app was used. Its eight-minute build, independent visual designs, and functional checks leave the main motion-quality question unresolved. [R6]

## 3. Executed sensitivity checks

These are deliberately small, seeded **sensor calibration cases**, not a proposed README demo, a blind agent comparison, or a claim that the original SIGNAL app contains these defects. Existing studies were not edited.

The local harness used native Chromium, actual unforced input, real timers, the shipped browser probe, and exact shipped analysis function bodies. The SIGNAL case inlined the unchanged source files for `setContent`; the hidden-train variant changed only test-local CSS. The two actor fixtures share the same translation and endpoint. Native recordings and decoded frames were inspected.

| Controlled case | Independent observation | Current declared checks |
| --- | --- | --- |
| SIGNAL reference | Nine train groups visible; requested text states reached | Outer trajectory/identity and terminal text conditions passed |
| SIGNAL with hidden trains | Zero train groups visible; requested text states still reached | The same conditions passed |
| Coupled mark and label reference | Both travel 200 CSS px; horizontal label-anchor error below 0.001 px | Both actor results passed |
| Same motion with rotation changes | Eight observed 180-degree orientation jumps; translation remains unchanged | Both actor results passed |
| Same motion with label drift | Maximum horizontal label-anchor error 45.982 CSS px; same final endpoint | Both actor results passed |

All five final-run traces satisfied the existing trajectory coverage gate. The three two-actor fixtures had 121 samples per actor. None emitted an uncaught page error. Two earlier complete runs gave the same qualitative results, including eight orientation jumps and label drift of about 46 px. Both are retained separately, not substituted into the final receipt.

`motion-value/OBSERVATIONS.json` records the final values, source identities, and trace/video hashes. The opt-in script is `../../tests/diagnostics/motion-value-sensitivity.mjs`.

**Interpretation:** The hidden-train miss is a test-coverage problem that existing explicit visibility checks could catch. The rotation and relationship misses expose limitations in the available capture contracts. None of these passes is a claimed universal visual-quality certificate. Returned video frames can still help a human or host model notice what the numeric checks miss.

### Why the actor checks miss these cases

`actor-analysis.ts` evaluates screen-position differences, interval-average velocity changes, identity, travel, and a destination. It retains transforms but does not evaluate the orientation path. A circular element can rotate by 180 degrees without changing its bounding rectangle. Its position checks remain valid but incomplete for the user's intent. [R7]

The label case is different: two objects can each move continuously and arrive correctly while their relationship is wrong in the middle. Independent maximum-speed or endpoint checks do not enforce “this label stays attached to that part.” Lowering a universal speed limit is not a reliable repair; legitimate motion could then fail. The missing quantity is the relationship error during the relevant phase, not a global smoothness score.

### Evidence selection can omit another known defect

A separate synthetic unit input has findings at 800 ms and 3400 ms. With six frames, `reviewFrameTimes` selects `[100, 740, 800, 860, 900, 4000]`. The later finding receives no nearby frame. With the current detail budget, three source times become `[740, 800, 860]` before overview/detail duplication. These are unit inputs, not measured browser events. [R3]

Six images are a budget, not automatically a complete review. A packet should state which transitions or findings are not visually covered, rather than let one early finding consume the context required for another.

## 4. Structural limits of the current plugin

### 4.1 P1: actor repair results are blocked by the comparison gate

`compare` places failed and unverified actor contracts in the same comparability rejection. Thus a before capture with adequate browser-geometry evidence and a real detected actor violation cannot be compared successfully to an after capture that fixes it. Repeating the exact same recipe cannot remove a genuine baseline defect. [R13]

A synthetic unit case isolates this gate: identical recipe/runtime fields, sufficient declared evidence, valid trajectory/network/browser checks, and a DOM actor changing from failed to passed. The function returns `comparable:false` solely because the before actor failed. This is a comparison-policy unit test, not a native repair result. The output's legacy `contractsPassed` fields also do not represent the separate actor contract status.

Separate evidence validity from measured behavior. Refuse missing/insufficient coverage, incompatible definitions, unverified scene annotations, or changed contracts. Permit a well-observed DOM/SVG failure to be the baseline of a comparable repair. Return actor-specific before/after assertions and deltas. Preserve separate functional delivery and visual-preference status; a valid repair comparison is not a general aesthetic certificate.

Acceptance: a valid actor fail-to-pass pair is comparable and reports that actor's improvement; a valid pass-to-fail pair is comparable and reports regression; insufficient or incompatible evidence remains non-comparable. This is a new defect, separate from the four already in PR #11.

### 4.2 Review is evidence packaging, not an implemented taste critic

`motionReview` builds a summary, then decodes the requested frames. The decoded pixels do not feed back into a visual grading algorithm. `motionPreference` and `humanTracking` are explicitly `unverified`. `selectMotionCandidate` validates the caller's nomination, evidence references, declared function/design status, and cost. It does not generate alternatives or decide which one looks better. The authoring reference correctly calls it a nomination guard. [R3], [R8], [R9]

Thus adding `motion_review` to a run does not itself create a new visual judgment capability. The host still has to identify a useful difference in the images, connect it to source, and make a better revision. A valid evidence reference proves correspondence to a delivered artifact, not that the judgment is correct.

A model critic is an option, but not an automatic fix. It needs matched sequences, explicit criteria, uncertainty, and human calibration. An isolated “quality: 9/10” response would just move the unsupported judgment into another module.

### 4.3 The hardest 3D motion remains outside independent automated acceptance

Scene poses are app-reported hints. The analyzer keeps them unverified for visible-motion acceptance. This is appropriate. The separate pixel tracker uses bounded color masks for declared isolated fixtures; it is not general production-object recognition and is not a visual grader wired into `motionReview`. [R7], [R10]

Making the next demo more WebGL-heavy can increase the part of the task the automatic checks cannot judge. Add a general tracker only after specifying camera motion, occlusion, identity, and uncertainty. Do not promote smooth app-reported transforms to a visual pass. Do not add synchronous pixel reads to the real-time performance path.

### 4.4 Scroll consistency is not just velocity continuity

Capture is limited to 12 seconds and 16 actions, and probes start from fresh contexts. The probe starts after navigation/readiness and poster work. These are useful bounded local observations, not complete coverage of a long scroll story or its initial entrance. [R11], [R12]

Direct scrubbing correctly excludes ordinary continuity constraints: the user may intentionally jump to another progress value. But the replacement question still matters: at the selected progress, do the product, label, camera, and configuration agree? There is no general cross-history, progress-to-pose, or WebGL-to-SVG handoff contract in the current schema.

A longer movie alone does not solve this. Use one stateful native journey plus short reviewed windows, each linked to its actual input, transition, and phase. Compare equivalent declared states after a bounded settle period. Exclude intended hysteresis, autonomous clocks, and physical momentum from equality rules unless the task explicitly constrains them.

### 4.5 The benchmark does not currently reward the promised difference

The current ordinary and assisted builds can both satisfy their functional tests while differing in style and construction. The image viewer does not isolate the effect of better evidence. Native SDK calls and package checks prove that those paths work; they do not show that a fresh host chooses better motion because of them.

This distinction is not unique to this project. Anthropic distinguishes high-pass regression evaluation from new-capability evaluation and recommends grading outcomes rather than prescribing a tool sequence. Our proposed evaluation follows that distinction without importing its examples as evidence about Motion Debugger. [S1]

## 5. Upgrade the feedback before changing the brand of the demo

The following are implementation proposals, not commands added by this PR.

Fix the comparison gate above before using actor reviews as a repair benchmark. Then implement the following bounded additions.

### A. Declare coverage of the requested motion

Add a coverage report linking each required motion feature to actors, renderer, phase, observable rule, native trace, and image window. Mark every item measured, manually reviewed, or unsupported. An outer-container recording must not be described as reviewed internal motion. Make actor suggestions cheap, but require confirmation of ambiguous bindings.

Acceptance: the hidden-train calibration is caught with explicit actor visibility/outcomes; the unchanged control still passes. A capture with no actors cannot claim per-train continuity. Relevant unsupported rules remain visible in the report.

### B. Implement a small set of relational and transform rules

Extend `types.ts`, `safety.ts`, `transitions.ts`, and `actor-analysis.ts` with opt-in, phase-scoped rules:

- Orientation change near a named retarget event, using actual sample spacing and explicit units. Handle wrapped 2D angles; use a declared quaternion/axis policy for 3D. An ordinary fast rotation must not become a reset by definition.
- Label-to-part anchor offset in a declared coordinate space. Include camera projection where needed. Bound the error, not each object's independent speed.
- One visible representation and consistent pose at a renderer handoff. Keep geometric evidence distinct from painted-pixel evidence.
- Declared progress-to-pose or path/tangent agreement for scrubbed content. Support intentional cuts and separate active intervals.

Acceptance: detect the seeded rotation/label cases under their declared intent; preserve the smooth control, deliberate cut, and legitimate fast/direct-scrub negative controls. Return unsupported or unverified when coverage, identity, or camera mapping is insufficient.

Start with these narrow rules. A universal jerk, optical-flow, or aesthetic score is not the needed first implementation.

### C. Give stateful motion a repeatable observation path

Add a stateful journey runner or an explicit handoff to the host browser, not a silent relaxation of capture limits. Record actual scroll progress and selected state. Let the reviewer bind local windows to the same session. Check reverse/skip/resize paths ending at the same declared state after settling, and configuration preservation across those paths.

Acceptance: a stale callback that restores an older product variant fails. Two valid history-independent paths agree within predeclared tolerances. Deliberately history-dependent behavior is not mislabeled. The complete journey keeps its evidence, even when a local window is inconclusive.

### D. Make useful evidence cause a verifiable source revision

Allocate images across declared phases/findings before adding detail duplicates. Return an explicit list of uncovered events and offer a bounded next request. Keep native playback for humans, and a sequence-aware packet for image-only hosts.

Then record a minimal evidence-to-repair chain: observed problem, selected window, source checkpoint, proposed intervention, source diff, same-journey result, and non-regression results. Support up to three candidates, but do not require wasteful alternatives when the original is already good. The host may abstain.

Acceptance: a real generated defect, not a prewritten bad example, is corrected without restyling or disabling the feature. The independent checker agrees. Tool-call counts, cited hashes, or a self-written claim of improvement do not substitute for this result.

## 6. Product claim and stop rule

The practical near-term claim is **more reliable motion-consistency review and repair while preserving the design**. Broadly better choreography is a separate hypothesis that requires preference evidence.

A useful plugin need not improve every animation that a strong base agent already gets right. It should provide net benefit on a declared distribution of relevant tasks, including the cost of using it and any regressions. If proper tests with adequate exposure show no gain, narrow the claim or change the implementation. Do not keep replacing the prompt until one treatment wins.

The companion experiment keeps the complete from-scratch FIELD request and adds two realistic UI classes. It also includes a separate same-checkpoint revision test to identify the mechanism. That diagnostic must not replace the from-scratch product evaluation the user requested.

## 7. Reproduction and limits

After a normal repository installation and build:

```sh
node --import tsx tests/diagnostics/motion-value-sensitivity.mjs \
  --out /tmp/motion-value-new-run
```

This opt-in diagnostic is outside the default CI test glob. It records what the current measurements do; it does not assert that existing code has been fixed. Move the corresponding intended-behavior tests into the main suite with their implementations.

Local execution used Node 22.16.0, Chromium 144.0.7559.96, and the installed Playwright driver 1.57.0-beta-1764944708000, not the repository's locked driver. A clean network installation was unavailable. We downloaded GitHub Actions artifact `11316858363` from successful PR #12 run `37239837186`, extracted its actual npm tarball and source map, verified source identities, and compiled the exact probe/analyzer bodies with TypeScript 5.8.3. Only module loading and type-only imports were adapted; schemas and full capture orchestration were not exercised by the local calibration.

The downloaded package was built at CI merge checkout `b93652a78db3c76f87ff503ea91af1adc6355e45`. Its receipt retains modified CI re-recording outputs. Its films are CI recordings of the frozen apps, not new agent generations or the historical local films. The relevant source-map identities match the audited source.

An attempted standalone MCP capture first lacked the browser's ffmpeg helper, then failed loopback navigation with `ERR_BLOCKED_BY_ADMINISTRATOR`. Both attempts were retained. No navigation policy was bypassed. The successful calibration therefore uses `setContent`, real native inputs, blocked external requests, and separate recordings. Three full calibration runs support the qualitative result, not a probability estimate. No full native-host, locked-dependency, physical-FPS, blinded preference, or agent-superiority result is claimed.

## Pinned repository evidence

[R1]: https://github.com/ShadowKingYT444/motion-debugger/pull/12
[R2]: https://github.com/ShadowKingYT444/motion-debugger/pull/11
[R3]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/packages/core/review.ts
[R4]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/studies/rail-dispatch/source/motion/evidence/WORKFLOW.md
[R5]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/studies/rail-dispatch/source/motion/evidence/capture-trace.json
[R6]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/studies/rail-dispatch/README.md
[R7]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/packages/core/actor-analysis.ts
[R8]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/packages/core/authoring.ts
[R9]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/plugin/motion-debugger/skills/motion/references/transition-authoring.md
[R10]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/packages/core/pixel-actors.ts
[R11]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/packages/core/safety.ts
[R12]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/packages/core/capture.ts
[R13]: https://github.com/ShadowKingYT444/motion-debugger/blob/4157fd25a696c8de1eef0f0fad83b0cd4b1fa622/packages/core/analysis.ts
[S1]: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
