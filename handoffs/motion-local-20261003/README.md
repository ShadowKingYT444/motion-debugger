# Local Motion handoff

Local work is stopped. No more local Motion builds, tests or recordings are authorized. The parent is starting a separate ANTS AI assistant launch-site trial in Codex Cloud.

[Retained source and evidence bundle](retained-mono-source-evidence.tar.gz) · [File hashes](FILES.json) · [Provenance receipt](RECEIPT.json)

The bundle contains both independently built GPT-6.1 Sol Standard (medium reasoning) MONO sites, their existing checks, all five treatment capture attempts with original reports/raw videos/frames and actual SDK traces, setup/calibration evidence, and the interrupted treatment freeze. All original file bytes are retained; dependencies, generated distribution, client configuration and symlinks are excluded. Nothing was newly recorded or tested during handoff.

Unpack the bundle with `tar -xzf retained-mono-source-evidence.tar.gz`. Paths under `motion-local-handoff/`:

| Content | Path |
| --- | --- |
| Complete ordinary source and deadline freeze | `studies/workflow-mono-gpt61-20261003/frozen-control/` |
| Complete retained Motion source and actual MCP evidence | `studies/workflow-mono-gpt61-20261003/treatment/` |
| Interrupted treatment freeze, incomplete | `studies/workflow-mono-gpt61-20261003/frozen-treatment/` |
| Registered brief, journeys and status | `studies/workflow-mono-gpt61-20261003/` |
| Original treatment recordings/reports | `studies/workflow-mono-gpt61-20261003/treatment/.motion-evidence/` |

The control's 35 original manifest files still match. The treatment deadline copy was interrupted before it wrote its source manifest or FREEZE.json; its complete working source is preserved separately. Do not call that partial copy a verified deadline freeze.

The agent reported two evidence-led source repairs: restoring internal 3D assembly state and lengthening the drawer transition under the unchanged speed budget. Before/after canvas geometry contracts both passed for the first repair; they did not detect the mesh defect. The cart after capture and one bounded repeat remained temporally inconclusive (284.7 ms and 347.2 ms animation-frame gaps). No matched final two-arm recordings or independent final visual assessment were completed. No overall Motion advantage is established. Earlier unsuccessful Luna evidence remains unchanged.

Latest reusable plugin runtime: `ee720e8b90cf80c241a69ca778a4577997cb3159`. Main reusable fix commit: `d25aa8c18cbfd7261281799aff656531363df832` (privacy-gated failed-interaction evidence, explicit incomplete comparisons, opt-in native GPU recording, workflow guidance and velocity interpretation). The later commit declares the example's actual mounted-target lifecycle without changing timing gates. [Full CI passed](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/37104829783), and [saved-evidence replay passed](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/37104829865). These are prior verification, not new handoff tests.

Host inspection found no remaining Motion preview/test processes and no listeners on its ports 4340–4345. No processes needed termination. Unrelated ARHE experiments and personal Chrome were left untouched. Treat these MONO artifacts as historical evidence, not as a starting app for the new independent ANTS builds.
