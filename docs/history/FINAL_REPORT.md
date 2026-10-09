# Motion feedback root fix — final report

## Outcome

This bounded PR14 closure changes only the review summary, its focused contract assertions, the native actor calibration fixture, and this report.

- A definite response, settling, or requested-velocity failure now also marks `summary.temporalContracts` failed and points `summary.nextInspection` at the responsible actor. The restored implementation and tests are byte-identical to the verified attempt-6 handoff.
- Native actor calibration now uses an independent magenta readiness marker outside the green actor path. The marker is painted regardless of actor visibility, and every decoded frame from the first marker-visible frame through EOF is evaluated. Frames are never trimmed by actor presence, and interior or trailing missing-actor frames are never dropped.
- The actual-browser `hidden-first-ready` control anchors its hidden window to renderer startup, not the click. It and the `hidden-interior` control both remain unverified. Jump/spoof still fail, legitimate fast travel still passes, and direct scrub remains not applicable.
- Production actor and pixel analyzers are unchanged. The all-visible, 20-frame, 80 ms cadence, and 12 CSS px/60 Hz fixture budgets are unchanged.

No package was published. No merge, external message, license, ownership, credential, saved model/settings, host/global configuration, supervisor policy, or runtime setting was changed.

## Authoritative matched detector A/B

The current matched old/final native detector comparison remains authoritative. Its human-readable and machine-readable delivery artifacts are:

- `artifacts/delivery/ab-proof/index.html`, SHA-256 `acaabc5e83b399e65b5fb07f2c9e0d87692283c0edb17b788c0486d7404c7c92`
- `artifacts/delivery/ab-proof/proof.json`, SHA-256 `d5ec3ea2cd377487c50311224cc981ccd48064cd0d5473c096334670e30c42ed`

| Matched case | Old detector | Final detector | Accurate interpretation |
| --- | --- | --- | --- |
| Clean control | passed | passed | Both accepted the unchanged valid trajectory. |
| Rotation flips | passed | failed | Old had no orientation guarantee; final measured 3.1733 rad/16.667 ms against 0.35 after eight flips. |
| Label drift | passed | failed | Old had no independent anchor guarantee; final measured 45.980 CSS px against 3. |

The old passes on rotation and label drift are unsupported old guarantees/blind spots, not evidence that those defects were acceptable. The final label failure used 120 one-to-one pairs with paired frame/read gaps at most 16.8/17.2 ms and 1.7 ms observation lag. The final negative-control films are SHA-256 `704e8c19c097f717341072c7f9e3b3ce87ae9d1390f40f92c77ec82c75d2d95e` and `1ee75e4eae3e5d99268d4a87b2f440f103228720e28a1fca94935e11a2851d9c`.

The retained underlying result files use the corrected attempt-5 paths:

- Old: `artifacts/bello-root-fix/attempt-5/motion-value-sensitivity/2026-10-07T07-39-00Z-old-4157/results.json`, SHA-256 `10b9214cc96f41f5094d78ceff265290eb5152c86c7c204d656d9461f671a615`
- Final: `artifacts/bello-root-fix/attempt-5/motion-value-sensitivity/2026-10-07T07-40-00Z-final/results.json`, SHA-256 `4cc6a2cfc95d8c59a86ed0c977afaa166f90ca45368d3dafd576942648b79102`

The actor analyzer and matched probe were not changed in this follow-up. Current source actor analyzer SHA-256 is `e1abce135c4ac0ca09d7b8812cddb60af4a2a1f7443d3426fd5cd12d2d3199af`; the authoritative A/B proof records final compiled core/probe SHA-256 values `f51b71925fb29f612c38052b5e6476f3e5c8cce1adba8915fa14899ea669549c` and `fd02bc311c82ca5eef62d2bbed97d8e9abeda37607fc89d68dd8dafab92db8d0`.

This is matched native-browser detector evidence over explicitly seeded fixtures. It is not a blind coding-agent benchmark, an aesthetic/preference benchmark, or evidence of general repair superiority.

## Native actor startup calibration

Hosted CI run `37595132463` actually ran and failed startup calibration. The exact retained WebM at `artifacts/ci/pr-14-run-37595132463/v2/actor-calibration/captures/190a79b9-c61a-47ca-af03-8e79e8db9a35/video.webm` contains one initial all-white pre-navigation frame at t=0; later real actor pixels are complete. That failure motivated the independent readiness epoch. It must not be described as a hosted-CI pass.

The revised actual-browser result is retained at `artifacts/bello-root-fix/final-closure/isolated-validation/actor-calibration/browser-verification.json`, SHA-256 `3fff7bce4d25cba7cfb68362058aa2b407b572c69e5d5899de004e12641edd78`. It records the full raw film and report hashes, fixture source hash, decoded frame count, startup-prefix count, first-ready timestamp, evaluated frame count, and EOF coverage for every case. Outcomes were:

- `jump`: failed; `spoof`: failed; `fast`: passed; `scrub`: not applicable.
- `hidden-first-ready`: unverified with insufficient all-visible coverage.
- `hidden-interior`: unverified with insufficient all-visible coverage.

Only `spoof` had a one-frame startup prefix, with readiness at 40 ms; the other five local films were marker-visible at their first decoded 0 ms frame. Every retained result says `evaluatedThroughEof: true`. The fixture is explicitly labeled a manual detector fixture using actual browser films—not generated traces, an agent benchmark, or an ordinary/full repair campaign.

The final hosted CI rerun is pending. This report does not claim it passed.

## Isolated validation and package evidence

Validation ran in a separate source checkout populated by its own `npm ci`; browser commands used `TMPDIR=/tmp`. The protected workspace dependency control was not used for validation. No additional broad browser campaign or agent repair experiment was run.

- Focused `tests/v2/review-contract.test.ts`: passed.
- Native actor calibration: all six expected outcomes above passed.
- `npm run check`: passed build and the complete local suite (10 API, 135 v2, 19 CLI, 16 workflow, 12 demo, 5 package, 15 ants with one intentional skip, 7 study, and 2 assembly tests).
- Fresh external packed install: passed all 18 established checks, including an independent 100-package install, installed CLI/core/MCP/config/skills, browser launch, byte-identical SIGNAL films, two real WebM captures and comparison, installed native review, and SDK PNG delivery.

The genuine packed-install evidence is retained at:

- `artifacts/bello-root-fix/final-closure/isolated-validation/packed-install/verification.json`, SHA-256 `ece795a76d950d99cd79fc8f2d00abf07d07a1c49c538dccf85eac6eb9506e8c`
- `artifacts/bello-root-fix/final-closure/isolated-validation/packed-install/commands.log`, SHA-256 `c6d08e015fc255d3e94c695437e4151868da8886a92c8bf8160f718f41964e48`
- `artifacts/bello-root-fix/final-closure/isolated-validation/packed-install/motion-debugger-0.5.0.tgz`, SHA-256 `63ee0cc7fb65ddc08ad6a7245be01da62a5a9d314df446e340aac97b3d0ee2be`

Previously accepted broad evidence was not rerun. Its retained paths are correctly rooted under attempt 5, including `artifacts/bello-root-fix/attempt-5/rail-runs/2026-10-07T06-57-42-516Z-e45fdaf3/verification.json`, `artifacts/bello-root-fix/attempt-5/install/2026-10-07T07-23-37.294Z/verification.json`, and `artifacts/bello-root-fix/attempt-5/native-codex/2026-10-07T07-24-56.655Z/verification.json`. The native Codex-host result is transport/host smoke only; provider-wire model identity is unverified, and it is not a benchmark.

## Interrupted repair-pair boundary

Attempt 6 is an interrupted preflight source handoff, not a completed repair experiment. Every entry in `artifacts/bello-root-fix/attempt-6/SOURCE-HANDOFF/MANIFEST.json` was verified by byte count and SHA-256 before restoring only `packages/core/review.ts` and `tests/v2/review-contract.test.ts`. No native-repair-pair implementation file was restored.

The native ordinary/full repair-pair preflights were interrupted before either arm completed. There is no completed repair pair, no result suitable for delivery, and no causal improvement claim. The unfinished repair experiment is excluded from the public export and from the outcome claims above. Failed and interrupted data remain retained as evidence of failure rather than rewritten as success.

## Source, package, and export provenance

Base commit: `f6a8d6322664e5688db6075400d225d07ac20cd9`.

| File | SHA-256 before final report export |
| --- | --- |
| `packages/core/review.ts` | `801a084d0b59b25ef4440afffc5dd91af2bc23598d3862db02a5d8893b18fdb9` |
| `tests/v2/review-contract.test.ts` | `5249f34969c9e4a6b72094e52167b5de3c4b2fcc6629967a4c6d8e98fa1a46a7` |
| `tests/v2/actor-calibration-browser.ts` | `a655bc9d344f1c29695607750ee84463a8a421f005d49fb488f9c14dfdf59fb3` |
| unchanged `packages/core/actor-analysis.ts` | `e1abce135c4ac0ca09d7b8812cddb60af4a2a1f7443d3426fd5cd12d2d3199af` |
| unchanged `packages/core/pixel-actors.ts` | `8b115fe828121e17db540901fc59889f9a190882f83d95fcb3d174cda0cce7a2` |

The source-only public export is `artifacts/bello-root-fix/final-closure/public-source/` and contains exactly these four owned files with their repository-relative paths:

1. `packages/core/review.ts`
2. `tests/v2/review-contract.test.ts`
3. `tests/v2/actor-calibration-browser.ts`
4. `FINAL_REPORT.md`

`.validation`, dependencies, films, reports, package tarballs, controller/evidence outputs, and every native-repair-pair file are excluded from that public source export. The generated tracked actor browser report was restored byte-for-byte to its committed baseline after the current films and verification report were preserved in final closure.

## Evidence boundaries

- DOM/SVG geometry is browser-observed but does not prove unoccluded painted pixels.
- App-reported scene state cannot independently establish rendered motion.
- Native video frames are real recorded pixels, but seek alignment uncertainty remains uncalibrated.
- Explicit actor, response, orientation, and anchor contracts test declared behavior; they are not universal motion-quality or preference scores.
- Browser rAF timing is not physical display FPS or human tracking.
- Final hosted CI remains pending.
