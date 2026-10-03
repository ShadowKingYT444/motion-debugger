# MONO: independent workflow trial

**This Luna trial does not establish Motion superiority.** Both agents built useful animated product concepts. Motion used real installed tools to reduce an observed drawer displacement, but its normalized contract still failed and its finished site had a broken Undo control. Final software-rendered recordings fail temporal sampling requirements.

[Ordinary recording](../../docs/assets/workflow-mono-20261003/control.mp4) · [Motion recording](../../docs/assets/workflow-mono-20261003/treatment.mp4) · [Actual interface preview](../../docs/assets/workflow-mono-20261003/comparison.png)

## Method

Two fresh **GPT-6-Luna Max** contexts independently built fictional MONO headphone sites from the same [brief](BRIEF.md), empty scaffold, locked Three.js/Vite dependencies and twenty-minute wall-clock budget. Both could build, test and refine with ordinary tools and the user's connected Chrome. The Motion arm additionally received the four installed plugin skills and actual local MCP tools. Construction ran sequentially. There was no injected defect, completed site reuse or deliberately weakened control.

This is an end-to-end workflow comparison, including design guidance, not an isolated debugging ablation. Source folders were separated by instructions, not an OS sandbox. The standing GPT-6.1 preference was clarified after both Luna runs; **no GPT-6.1 result or replacement trial is claimed**. See [protocol](PROTOCOL.json) and [preserved earlier work](HISTORY.md).

The ordinary agent completed early. Motion reached its hard stop after one evidence-led repair; its own comparison and final report were unfinished. The coordinator later performed read-only evaluation, without giving either agent extra source repair time. The [ordinary source](frozen-control/src/main.js) and [Motion source](frozen-treatment/src/main.js) are frozen. Treatment's timer discrepancy and byte-for-byte runtime source equivalence at the intended deadline are recorded in [deadline evidence](evidence/TREATMENT-DEADLINE-CHECK.json).

## Actual results

| Check | Ordinary workflow | Motion workflow |
| --- | --- | --- |
| Procedural Three.js headphone and three finishes | Works in Chrome | Works in Chrome |
| Selected warm finish and quantity 2 | Umber, $1,038 | Clay, $1,640 |
| Escape and keyboard bag reopening | Completed in capture | Completed before Undo timeout |
| Remove and timely Undo | Restores 2 items in completed capture | Undo pointer input disabled; click times out |
| 360 × 800 bag and subtotal | Final-state checks pass | Final-state checks pass |
| Reduced-motion page load | Configured `reduce`; load/error checks pass | Configured `reduce`; load/error checks pass |
| Final video temporal evidence | Inconclusive | Inconclusive |

Direct checks used the user's Chrome on owned loopback tabs. Unrelated tabs and the ARHE/Daytona work were left alone. Responsive/reduced-motion checks used fresh isolated contexts as well. All ten final/responsive captures pass their stated final-state, uncaught-error and network-policy checks. That is not a complete accessibility or reduced-motion compliance audit.

The ordinary result has a stronger detailed headphone model and fuller product specifications in the observed frames. Motion has a different typography system, rotating scene control, ticker and animated custom drawer. Those are visible design differences; they do not establish an objective aesthetic improvement. Ordinary canvas click automation also timed out in an exploratory journey, so the final matched configuration clips show finish selection and return to the hero rather than falsely claiming a completed interactive orbit check.

## Real Motion repair

The treatment installed `motion-debugger@0.4.0` from a fresh tarball, installed all four skills into its project and used the official MCP SDK to invoke the real stdio server. Its initial ambiguous selector failed; the corrected capture succeeded. It inspected events and native recorded frames, changed the drawer's transform easing in source, then captured the same interaction again.

| Supplied contract / measured value | Before | After |
| --- | ---: | ---: |
| Largest observed frame displacement; budget 90 px | 134.326 px | 32.259 px |
| Normalized displacement at 16.667 ms; budget 25 px | 60.550 px | 35.714 px |
| Maximum sample gap; integrity limit 80 ms | 62.5 ms | 55.5 ms |
| Final state equivalent | Yes | Yes |
| All supplied contracts pass | No | No |

The [coordinator's later comparison](evidence/coordinator-treatment-compare/0-motion_compare.json) finds comparable recipes and equivalent final state, while explicitly reporting that the after capture still violates a contract. These are browser geometry measurements, not a perceptual smoothness score. The headed native frames were cropped by the desktop recording backend; they do not provide a clear visual demonstration of that drawer repair.

[Before report](evidence/treatment-agent-captures/31391413-0c6a-488f-8b4f-f3f7bbf6dc37/report.json) · [After report](evidence/treatment-agent-captures/83793e48-f235-4608-9de4-5f466eab780b/report.json) · [Tool responses and native frames](evidence/treatment-agent-tools/)

## Recordings and integrity

The final exported videos use Chromium's actual **headless SwiftShader** renderer at 1280 × 900, identical planned waits and shared visitor goals: story scroll, finishes, then bag reopening/quantity/removal. Sites expose different selectors and product prices. Actual interaction times remain in each trace. The final arms were captured sequentially; earlier exploratory corrected captures briefly overlapped and are separately retained.

Exports concatenate the three full recordings in order, including pre-roll, with a label bar above the viewport. There are no speed changes, generated replacement frames or cherry-picked successful excerpts. Native WebM files and full reports are retained in [final evidence](evidence/final-recordings/). See [export manifest](../../docs/assets/workflow-mono-20261003/EXPORT.json).

All six final desktop clips fail the unchanged 80 ms sampling gate. Ordinary gaps are 283.2–366.7 ms; Motion gaps are 116.7–1266.5 ms. Body geometry cannot measure motion inside the 3D canvas. These videos show actual UI behavior, including runner stutter, and cannot substantiate a smoothness advantage.

The preregistered [journeys](JOURNEYS.json) and both [first adaptation](JOURNEY-ADAPTATION.json) and [final adaptation](evidence/FINAL-RECORDING-ADAPTATION.json) remain available. The final bag clips end after removal on both arms. Ordinary's successful full Undo capture and Motion's failed Undo attempt remain in [exploratory evidence](evidence/heldout-attempts/); neither was silently replaced with a success. A failed `motion_capture` deletes its partial recording, so the treatment timeout is supported by its retained error trace and direct Chrome check, not a completed failure video.

Headed recorder diagnostics found a narrow desktop window and gray padding. Maximization enlarged the window but did not repair video scaling; an X11 launch failed. No desktop settings or personal browser profile were modified. Diagnostic captures are [retained](evidence/recorder-diagnostics/). A successful small `doctor` recording is not proof that a complex page records correctly.

## Package verification and reproduction

`npm run check` passes 58 tests. Fresh consumer verification covers tarball installation, official SDK handshake/tool listing, real tool calls, browser recordings, four editor configuration formats and installed skills. It does not claim interactive testing in every editor. The first final consumer run failed the unchanged 80 ms gate; all three attempts remain available. One sequential retry after the unit suite finished passed, including two actual recordings and comparison. Both runs are retained. This was package verification, not another coding arm. [Test details](evidence/TESTS.json).

```sh
npm ci
npm run check
npm run test:install
cd studies/workflow-mono-20261003/frozen-control
npm ci
npm run build -- --base=/control/
cd ../frozen-treatment
npm ci
npm run build -- --base=/treatment/
cd ../../..
node scripts/local-trial-preview.mjs
```

Open `http://127.0.0.1:4340`. Use the [final recording requests](evidence/control-final-recording-request.json) and [Motion request](evidence/treatment-final-recording-request.json) with paths resolved to your checkout. Evidence uses explicit `${REPO_ROOT}` placeholders for exported local paths; it is not claimed to be executable without resolving them. The SDK helper requires a new empty output folder to preserve prior attempts.

No credentials, personal tabs or real customer/payment information appear in the fictional apps or videos. [Privacy export](evidence/PRIVACY-EXPORT.json) records path redaction and raw/export hashes. Original raw capture files remain local; image/video pixels, event clocks, measurements and pass/fail fields are unchanged. The first treatment tool response was overwritten by the original helper on its retry, but its error trace and core failure JSON remain. The helper now rejects nonempty output directories.
