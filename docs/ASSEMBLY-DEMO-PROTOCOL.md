# ASSEMBLY: a motion creation demo with a fair comparison

Status: proposed protocol, not an executed experiment. No ASSEMBLY app, agent runs, recordings, or winning results are supplied by this PR. See [the upgrade RFC](MOTION-QUALITY-UPGRADE.md) for the diagnosis and implementation plan. The [JSON manifest](assembly-demo.protocol.json) lists inputs that must be frozen before a benchmark can start.

## 1. What the viewer should see

Use one polished camera configurator. Its body, lens, aperture ring, labels, lighting, typography, and layout are identical in both arms. A visitor opens the camera into a spatial explanation, selects a lens while parts are moving, reverses the movement, then saves the actual selected configuration.

The intended difference is visible in motion: whether the selected part remains easy to follow; whether parts and labels have a coherent order; whether a new input redirects an ongoing move instead of restarting it; and whether the result feels responsive rather than slow or abrupt.

Do not declare a winner because one side uses a spring, more meshes, or more tool calls. A well-made ordinary version can win. A clear crossfade is valid when the brief does not require tracking a persistent part. The task below requires continuity for identified parts, not a blanket ban on opacity transitions.

The supplied LOOP screenshot can guide an approved restrained visual direction. Do not overwrite either frozen LOOP output. Start a separate fixture, obtain or create original/licensed assets, and freeze its art before the agent comparison. The existing study remains historical evidence, not a source of interchangeable winner screenshots.

## 2. Create the common starting point

Build one small, already functional app. Buttons, selected state, keyboard operation, final views, fallback content, and configuration export must work without animated transitions. Provide the assembled and exploded endpoint poses. Both should already look good. This is a scaffold for **creating the motion between states**, not a complete animation repair disguised as generation.

Both agents receive the same app bytes, asset files, local dependencies, reference material, and public requirements. Provide the same raw actor names, camera definition, endpoints, and state API to both. The plugin must earn its advantage through authoring/review support, not through secret access to a better rig. The evaluator's read-only observation adapter is also identical and must not import treatment-only code.

Freeze a design manifest covering layout, copy, assets, materials, lighting, endpoint poses, and accepted responsive layouts. Allow motion modules and explicit adapter hooks to change. Permit CSS or camera motion only through declared fields. Detect forbidden edits with source hashes and endpoint screenshots. Do not insist on whole-file identity when a file intentionally contains an allowed motion field; separate those fields in the scaffold first.

Record a functional baseline. A human-authored reference motion may validate evaluator feasibility on a separate development fixture, but its solution must not appear in an agent worktree, history, installed skill, or accessible artifact folder. Label all seeded development defects. Do not copy the reference motion into either evaluated output.

## 3. Exact shared task prompt

Use this text for all arms, adding only their declared tool/skill instructions:

> Refine ASSEMBLY's motion without redesigning the app. Keep the supplied layout, copy, materials, lights, geometry, and final poses. The controls and saved configuration already work.
>
> Make opening the camera into its component view feel deliberate and easy to follow. Keep the selected lens recognizable while parts separate and labels move into place. Make selection changes, reassembly, and the transition into the inspector feel connected rather than like unrelated entrances.
>
> A user can reverse a transition or choose another lens before the current animation finishes. Respond to the latest input from the current visible state. Do not disable controls, reset to the starting pose, or queue stale selections. A held scrub must follow the pointer directly, including reversals, and release into the documented playback state.
>
> Keep the app useful with keyboard input, reduced motion, a narrow viewport, and no WebGL. Pause must stop decorative motion. Export must match the current selected configuration. Do not replace the requested spatial transition with a static page in normal-motion mode.
>
> Use your normal coding and browser tools. You may use the supplied animation libraries and official documentation. Preserve the protected design. Spend at most thirty minutes, including tool calls and failed attempts, with the last six minutes reserved for verification. Deliver the source, evidence, and any unresolved limits. Do not claim success that you did not verify.

Publish all evaluated behavior requirements to the agents. Hide only held-out action schedules and test instances, not surprising product requirements. Numerical acceptance values must be calibrated on the development fixture and copied into the public task contract before freezing. They are not defined by the current plugin's preferred output.

## 4. Arms and budget

Run both actual native Codex and Claude Code, recorded as separate host blocks. Within each host, pin the model/effort settings and runtime version across arms. Record model identity only to the level the host exposes; do not invent provider-wire confirmation.

| Arm | Available support | Question |
| --- | --- | --- |
| A: strong ordinary | Normal coding/browser tools, the same libraries, current documentation, and applicable free official Motion/GSAP skills | Can the proposed product beat a realistic alternative rather than an under-equipped agent? |
| B: current Motion Debugger | Everything in A, plus a frozen current v0.5.0 build and its default workflow | Does the upgrade improve the actual released baseline? |
| C: upgraded Motion Debugger | Everything in A, plus the proposed frozen transition/review build and workflow | Does the additional capability help? |

To test the layered effect, use a distinct treatment entry rather than replacing the baseline's animation knowledge. Resolve skill-name collisions consistently and record the loaded files. This protocol does not compare against paid Motion+ features unless access is separately authorized and the tested configuration is disclosed.

The first pilot has three independent repetitions for each of three arms on each of two hosts: **18 sessions, up to nine hours of agent wall time**. This is a proposed compute budget, not work authorized or started by this documentation PR. It is not enough for a broad statistical claim. Rendering/evaluation time and human review are additional costs and must be reported.

Randomize arm order within host/repetition blocks. Do not run competing GPU browser evaluations concurrently. Use isolated worktrees, profiles, evidence directories, and caches with declared warm/cold policy. Prevent cross-arm access to outputs and history. Apply the same retry policy. If an infrastructure problem invalidates a comparison, rerun the affected block under the predeclared rule rather than giving only one arm another attempt.

After the pilot, use the observed variance and a predefined practical effect to size a confirmatory test. Add held-out tasks such as a DOM/SVG board-to-detail transition and a data-view transformation, then freeze them before further tuning. Report each host separately before any aggregate. For mechanism attribution, subsequently remove candidate selection or actor evidence one at a time; do not infer their effects from the bundled three-arm result.

## 5. Journeys and graders

The following test families are proposed. Exact selectors, data, expected states, tolerance values, and device identities must be filled into the JSON manifest and validated before execution.

**Creation quality:** open into component view; track the selected lens; change it; reassemble; move into the inspector; export. Judge motion at normal speed first. A correct endpoint with an incoherent journey is not a full quality pass.

**Interruption:** reverse opening and reassembly at several phases. Switch A to B to C before settling and check that C wins. Use held forward/backward scrubbing, release, pointer cancellation, and keyboard actions. Public development schedules can guide implementation; evaluation schedules use separately committed hidden offsets. Record actual event times, not just requested sleeps.

**Robustness:** repeat at 1440×960 and 390×844, with reduced motion and WebGL unavailable. Test resize during a transition and pause/resume. A desktop viewport emulation is not a physical phone performance test. Add actual mobile hardware before mobile smoothness claims.

**Design preservation and function:** compare protected inputs and approved endpoints; verify visible error absence, positive completion, enabled controls, focus behavior, and downloaded configuration contents. Final control text alone cannot certify that the renderer showed the correct selection.

**Temporal evidence:** inspect scene actors and native pixels around interruption, handoff, and arrival. Use continuity/settling bounds only where the declared policy requires them. Include negative controls: an intentional cut, a fast valid transition, direct scrub jumps caused by pointer movement, and a smooth annotation paired with an incorrect render. Preserve the existing 80ms integrity rejection; do not repurpose it as a frame-rate target.

**Native performance:** run the same frozen output on the same named device, browser, renderer, refresh rate, and DPR. Measure browser work and frame timing separately from encoded video cadence. Use an uninstrumented run to quantify capture/probe overhead. No virtual-time capture, frame interpolation, or slow-motion playback may support a real-time performance claim. A weak measurement is unverified, not a pass or an automatic application failure.

Split long journeys into named bounded capture windows and a separate complete visitor film. Preserve continuity of the recorded starting state across windows. Do not silently enlarge the current twelve-second capture limit or compare different action recipes just to avoid a timeout.

### Human review

Randomize anonymous A/B presentations and alternate their left/right order. Provide identical-sized normal-speed recordings and the same interaction script. Allow “tie,” “neither,” and “insufficient evidence.” Do not show plugin names, tool counts, source code, or metric badges before the judgment.

Ask two different questions: “Which sequence is easier to follow and control?” and “Which motion would you prefer in this otherwise identical product?” Also use a tracking task: identify the selected lens after an interrupted transition. Keep subjective preference, tracking accuracy, function, and speed separate.

The primary agent outcome is the proportion of full delivered apps that pass public requirements and preserved-design checks. Always report failures from all arms. Report motion preference and tracking both with all-output context and conditionally among functional outputs; do not hide a high failure rate by showing only the surviving beautiful examples.

Use repeated trials and appropriate code, human, and calibrated model judgments, rather than grading a required tool sequence. Anthropic's evaluation guidance supports this distinction between outcome, trace, trial, and grader. The exact ASSEMBLY design is a proposal, not a result from that source. [E1]

Multiple raters and video frames do not create independent agent trials. Report task/host-level effects, uncertainty, cost, and failure counts. Predeclare the statistical analysis for the confirmatory suite, including clustering by task and treatment of ties. A one-task pilot cannot establish generalization to unseen motion tasks.

## 6. The launch film

First show a single app fullscreen at normal speed. Let the viewer open the camera, reverse it mid-flight, select a different lens, and keep that lens visually connected to its label. End with the actual saved configuration. The point is a useful sequence under input, not an idle rotating sculpture.

Then show an anonymous, synchronized same-design comparison for the exact same recorded input schedule. Keep image size, timing, device, camera, and starting state consistent. Add optional slow-motion replay afterward to explain a particular failure, clearly labeled as slowed playback.

Finish with one short evidence panel: the failing or ambiguous beat, the corresponding source change, and the unchanged replay that tests it. Any numbers displayed must be derived from that exact run. Do not place proposed thresholds or example values in a results card.

A compelling candidate sequence is: body holds position, selected lens separates, secondary parts make space, the label follows, and a new selection redirects the movement without losing the lens. It is a creative target, not a predetermined treatment result. Show it only if the agent actually produces it and the checks support it.

Choose the launch example by a rule frozen before reviewing outputs. Use the first valid block or a declared representative block; never silently choose the largest treatment win. Link all pilot runs and failures from the demonstration. If the ordinary arm wins or they tie, publish that result and revise the product claim.

## 7. Execution gates

A future runner must refuse to start while `runnable` is false or any required freeze field is null. Resolve app and asset hashes, exact candidate packages, host settings, reference permissions, hidden schedule commitment, evaluator hash, hardware identities, endpoint baselines, and public numerical thresholds. Commit those inputs in a follow-up protocol version. Keep this proposal unchanged as the planning record.

Before a public comparison, require: complete function and protected-design grading; credible native timing on the named hardware; blind motion judgments; disclosed wall time and tool cost; and no post-freeze manual repairs. Decide the practical-effect and non-regression margins before the confirmatory runs, not after observing a favorable difference.

Before advertising native-host support, install the packed build in a clean project in each claimed host, invoke its namespaced entry, exercise the real tools, receive image output, and uninstall without changing unrelated settings. SDK transport checks alone are insufficient. The current repository documents that distinction. [E2]

Until these gates are satisfied, ASSEMBLY is a planned evaluation. This PR authorizes no package publication, paid benchmark campaign, repository visibility change, or replacement of the historical LOOP/Ants evidence.

[E1]: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
[E2]: https://github.com/ShadowKingYT444/motion-debugger/blob/6887824e3a3d64e8a8702615a88072ff2b968410/docs/CLIENTS.md
