# Independent Ants verification

Both frozen builds completed the four-stage colony task and produced a useful repair-cafe plan in all eight matched browser journeys. Replay, cancel/restart, task-clock pause/resume, drawers with keyboard focus containment and Escape restoration, advertised view controls, and Motion's advertised plan downloads worked. Pixel measurements remain mixed; the original failed tests are preserved. This single paired build does not establish a general animation-smoothness or coding-agent advantage.

| Arm | Condition | Four stages + useful plan | Replay, cancel/restart | Independent lossless pause |
| --- | --- | --- | --- | --- |
| ordinary | desktop | Passed | Passed | Exact |
| motion | desktop | Passed | Passed | Exact |
| ordinary | mobile | Passed | Passed | Exact |
| motion | mobile | Passed | Passed | Exact |
| ordinary | reduced | Passed | Passed | Exact |
| motion | reduced | Passed | Passed | Exact |
| ordinary | fallback | Passed | Passed | Strict failure, tiny delta |
| motion | fallback | Passed | Passed | Exact |

Desktop is 1440×960; mobile is 390×844. Reduced motion and disabled-WebGL fallback use desktop dimensions. Both arms used headless system Chrome 152.0.7977.64 with the same native pointer/keyboard inputs and expectations. Actual Three.js/WebGL rendering used ANGLE Vulkan SwiftShader software rendering. The fallback condition explicitly disabled WebGL. No candidate source was repaired after freeze.

## Watch and inspect

Run `npm run demo:ants` for the hash-verified paired viewer. [STUDY.json](STUDY.json) allowlists all eight complete primary recordings plus both retained initial verifier recordings. Framing and timing are unchanged: scale 1, time scale 1, no crop. Videos start before navigation and include entrance, work, interruptions and the final plan.

- Desktop: [ordinary full journey](evidence/runs/ordinary-desktop/page@0f7f72f1f3283e83b2a40f57bfafc0b1.webm), [Motion full journey](evidence/runs/motion-desktop/page@5d57ced47dfc4cb585bbc9ee4a8ab754.webm); [ordinary useful plan](evidence/runs/ordinary-desktop/useful-plan-frame.png), [Motion useful plan](evidence/runs/motion-desktop/useful-plan-frame.png).
- Mobile: [ordinary full journey](evidence/runs/ordinary-mobile/page@6a7916487829ab5f6d7d284a8cb5fbcd.webm), [Motion full journey](evidence/runs/motion-mobile/page@bce626f3a9c249c6a50c34efe6f01de6.webm); [ordinary useful plan](evidence/runs/ordinary-mobile/useful-plan-frame.png), [Motion useful plan](evidence/runs/motion-mobile/useful-plan-frame.png).
- [Machine-readable results](RESULTS.json) link every scenario report, native input/DOM trace, selected frame and lossless measurement. [Artifact manifest](evidence/EVIDENCE-HASHES.json) records exact delivered evidence sizes and SHA-256 hashes.

Actual desktop/mobile screenshots and decoded stage frames were inspected. Both pages contain articulated 3D ants, lighting/shadows and visible phase changes. Motion's initial mobile composition fits more of the scene/caption on screen; ordinary's scene extends below the initial viewport. Both can show some ant overlap during intermediate formations. Both plans contain practical scheduling, volunteers, tools and safety; these are scripted examples rather than live AI output. These observations are not a perceptual smoothness score.

## Failures and limits

The original VP8 stationary-pixel bound failed for Motion desktop, mobile and fallback. The bound remains unchanged and failed: mean absolute RGB channel delta ≤1.5 and ≤0.2% of channels changing by >12. Separate nonrecording-context lossless native screenshots found exact paused scene pixels in seven of eight conditions, including those three Motion conditions. Ordinary fallback failed strict byte equality with mean channel delta 0.00016556595 and no channels changing by >12. This is a retained measurement failure, not evidence of visible scene motion. Resume advanced native stage and scene pixels in all eight supplemental checks.

Initial retained verifier attempts had a stale final DOM sample and an overbroad stage selector. Primary mobile verification also attempted hidden desktop header links and required an exact home-scroll offset despite anchor scroll padding. The focused supplement checked the actual advertised navigation and visible home headline successfully. Original reports and videos remain in evidence; none of these failures was relabeled as an original pass.

Headless desktop/mobile corner calibration covered the full requested viewport. A headed supplemental calibration failed full-content coverage and is retained under `evidence/retained-headed`; it is excluded from visual conclusions. Primary videos are lossy VP8 at 25fps and DOM observations sample every 50ms. Frame selection uses approximate host/video offsets (about ±100ms), not synchronized per-frame app timestamps. Sparse decoded frames and this software WebGL runtime cannot establish dropped-frame performance on physical phones, other browsers or GPUs.

## Provenance and reproduction

[PROTOCOL.json](PROTOCOL.json) records the matched model, budget, package identity and source manifests. Source manifest SHA-256: ordinary `b81e0589ffe15f4ce16ddd2ec7941d195fa94b75ba34341489e7cbfcd88ad9c4`; Motion `d266f9165ead6f6e07323fdeee8938b8c0f3a28d69b1e3b3ec83b7b6fdea3eb7`. Chrome binary SHA-256: `44bd90e776ea03a952242b3536d4a10a2e43c64a227c243af2840f07f1f0ed17`. Every full video has its exact hash in [STUDY.json](STUDY.json).

The exact primary verifier snapshot is [archived](evidence/provenance/harness-a4e2bad616cd0ce4e88b5cf6c5bffed2a168ff323aae1125cded6244a1b0ea1b.mjs), SHA-256 `a4e2bad616cd0ce4e88b5cf6c5bffed2a168ff323aae1125cded6244a1b0ea1b`. The supplemental run recorded its verifier hash but did not archive that intermediate source's exact bytes; the [final verifier](../../tests/v2/ants-study-browser.mjs) and its [snapshot](evidence/provenance/current-harness.mjs) preserve the final reproduction logic. This limits byte-exact replay of the supplemental harness. Original source, reports, observations and images are preserved.

Run `node tests/v2/ants-study-browser.mjs` for the matched complete journeys, or `ANTS_FREEZE_ONLY=1 node tests/v2/ants-study-browser.mjs` for independent lossless pause/resume checks. New runs write separate ignored artifacts, never modify the frozen sources or replace these delivered results.
