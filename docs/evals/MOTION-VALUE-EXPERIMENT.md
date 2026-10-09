# Test useful motion feedback, not a lucky redesign

Status: protocol plus one attempted bounded 3-task × 3-arm × 1-repetition pilot. All nine generation sessions were `agent-failed`; no completed product cohort exists. A final-package regrade of the preserved bytes is retained at `artifacts/motion-value-regrade/2026-10-07T08-00-00Z-final/RESULTS.json`, but it is not a replacement for successful agent trials. See [`FINAL_REPORT.md`](../history/FINAL_REPORT.md) and read the [source audit and calibration](../audits/MOTION-VALUE-AUDIT.md) first.

## 1. The question

Does adding Motion Debugger improve useful motion quality, consistency, or time-to-verified-quality over the same capable agent with ordinary browser and animation tools?

The primary outcome is the finished interface. The diagnostic question is how any gain arose: construction guidance, better observations, a useful source revision, or a different visual style. Do not assume an overall benefit because package tests pass. Do not assume no benefit merely because both agents produce a competent page.

There is already a strong ordinary baseline. Motion's official AI Kit provides agent-oriented animation guidance and tools; GSAP ScrollTrigger provides pinning, scrubbed timelines, and scroll callbacks; Chrome DevTools MCP provides browser inspection and performance evidence. These are maintainer-described capabilities, not benchmark wins over this project. Allow equivalent ordinary library knowledge and normal browser access in every arm. [S1], [S2], [S3]

## 2. Keep a demanding from-scratch task

Keep FIELD rather than invent another showcase. Both agents start from the same empty application scaffold and approved asset bundle. Do not give either a prebuilt page, planted defect, finished animation, or the other arm's source.

### Exact common user prompt

> Build FIELD, a complete spatial-audio headphone launch website, from the supplied blank scaffold and original asset bundle. The site should feel like one connected motion experience, not a stack of sections with fade-ins.
>
> Begin with a strong typographic/product composition. Scroll carries the same product into an exploded technical view. A recognizable signal passes through the driver into a full-screen listening environment, then through a horizontal sequence of listening spaces. Later that signal becomes an interactive waveform/playhead. Finish by reassembling the currently configured product and exporting its actual selected settings as JSON.
>
> Use motion to explain how the product and listening modes relate. Keep important labels attached to their parts. A visitor must be able to follow the selected component and signal through changes of scale, camera, layout, and renderer. Use the approved assets and content, but author the page composition and animation yourself. The static design must also be coherent and usable.
>
> Visitors will reverse scroll, skip chapters, change the listening mode while motion is active, drag the waveform, resize, and use keyboard controls. The latest choice must survive those actions. Reaching the same chapter and selected configuration by different history-independent paths should produce the same meaningful scene after settling. An intentional direct scrub may jump; a stale animation must not overwrite newer input.
>
> Make desktop and mobile compositions deliberate. Reduced motion must preserve meaning and function. Do not require a personal account or external service. Do not add more decorative motion instead of completing the experience. Use the available browser tools to inspect the actual running result and refine what needs work. Preserve an initial working checkpoint, your final source, and evidence of the important journeys.

Only the installation/entry instruction differs by arm. Do not give the ordinary agent less ambitious acceptance criteria. Do not put proprietary Motion-only schema terms in the common prompt.

### Why this is demanding

The difficulty is not the number of particles, effects, or lines of code. It is coupled behavior: shared identity, synchronized state, changing layout, meaningful ordering, interruptible transitions, and reliable renderer handoffs. Many independent animations can be easy even when the page looks busy. Conversely, a simple-looking cart or editor can require difficult consistency.

Do not require a particular curve, duration, spring, or staging order merely because the plugin implements it. The agent may choose a better composition. Required user outcomes and which histories must agree are fixed before generation; exact input values/order for held-out tests are hidden, not the requirements themselves.

## 3. Use a small task bank, not only FIELD

Use three frozen task classes in the pilot:

| Task | Coupled behavior | Independent acceptance |
| --- | --- | --- |
| FIELD scroll story | Persistent product/signal, scroll and selected state, labels, renderer handoff | Reverse/skip/resize histories; meaningful scenes; configuration preservation; selected-part tracking |
| Commerce collection-to-cart site | Filter/reorder, selected item, gallery-to-detail motion, cart count, responsive sheet | Selected item stays identifiable; latest filter/variant survives reversal; item representation agrees across views |
| Creative editor | Timeline/playhead, selection overlay, inspector, rearrangement, zoom/resize | Controls agree with rendered state; overlay stays attached; interrupted edits preserve selection and undo semantics |

All three are complete from-scratch UI tasks. Publish their exact briefs and asset/scaffold hashes before starting. FIELD is the marketing candidate, not the only test of the product. Three task classes cannot establish “most UIs”; they can expose large early effects and failure modes.

Freeze one model/effort configuration and one native host for the first block. A second host is a separate replication block, not a pooled claim based on different runtimes. Record the actual visible configuration and transcripts; do not invent provider-wire model identities.

## 4. Separate construction material from runtime feedback

Use three arms:

**A — Strong ordinary workflow.** Normal coding, real browser tools, screenshots, current engine documentation, and the same approved dependencies/assets. No Motion Debugger materials or runtime.

**B — Construction material only.** A plus the exact Motion design/construction references and recipes. Do not give runtime-only instructions that require unavailable tools. Freeze this reduced instruction bundle and disclose it; this is a construction-material arm, not an identical-prompt placebo.

**C — Full Motion Debugger.** A plus the actual released Motion installation and normal entry skill, including its review/probe/evidence workflow. No private extra critic, designer, or larger budget unless it is part of the declared product being tested.

Primary use is natural: score all assigned C runs, even when the agent never calls review or configures the wrong target. That is part of product usability. Do not drop these runs and report only successful tool users.

A separately labeled, guided-exposure diagnostic can explicitly ask C to bind relevant actors and review the transition. It answers whether the tools help when correctly used. It cannot substitute for the ordinary product experience or be compared to A with an uncounted extra instruction/budget.

Proposed full pilot: three tasks × three arms × two repetitions = 18 sessions on one host. Cap each session at 60 minutes, with a planned working checkpoint near 45 minutes and the remainder reserved for observation/refinement. This is at most 18 agent-hours of wall budget before grading, not a cost quote. The attempted nine-session diagnostic below does not satisfy this design. Seek approval before provisioning any future paid runtime.

Count initial installation/context overhead, actor/plan setup, tool and decoding work, failed attempts, source editing, and review. Record missing timing rather than entering zero. Run browser-heavy measurements serially or on equivalent isolated workers so one arm is not measured under another arm's rendering load.

## 5. Prove the checker can see the thing it will grade

Before the campaign, run the sensor calibration from the audit. The current hidden-train, rotation, and relation results show why a numeric pass is not enough.

For each required feature, freeze an independent acceptance method. Examples:

- A projected label anchor remains within a declared CSS-pixel tolerance while its attachment phase is active. Use local/native visual evidence as a cross-check; bounding boxes are not complete occlusion proof.
- A selected product variant survives reverse scroll, skipped sections, and resize. Validate the actual exported state, not just a visible success message.
- A direct scrub reaches the declared scene state after a bounded settle period. Compare equivalent progress/state histories where the brief requires equivalence. Do not punish intentional physics or declared history dependence with an invalid equality test.
- A renderer handoff has no unexplained duplicate/disappearance and preserves the selected object. The matching method and limitations must be explicit. App-reported identity alone cannot establish painted correspondence.

Use negative controls: correct fast motion, an intentional cut, a legitimate occlusion, already-good source that should remain unchanged, and reduced motion. Do not optimize until everything moves as slowly as possible.

The seeded calibrations are tests of the measurement system, not “ordinary agent” outputs. Never put their broken versions into the marketing comparison as the unassisted baseline.

## 6. Grading and a real evidence-to-repair chain

Report four outcomes separately: task completion without functional regression; declared motion consistency; blind normal-speed motion preference; and total time/cost. Static composition gets its own assessment so a prettier lighting setup cannot silently become evidence of better motion. Retain failed builds and unusable evidence; do not compare only survivors.

Use anonymous, randomized left/right presentations and matched semantic visitor goals. Different page geometry may require different scroll distances; disclose that. For scroll-specific clips, record actual progress/input separately rather than pretending simultaneous video playback synchronizes the scenes. Human preference is not a frame-step metric. A model judge needs human calibration and an “unverified” option. [S4]

The unit of generation is the task/run, not each screenshot, frame, or human vote. Report raw paired results and uncertainty; multiple votes on one generated pair are not independent agent trials. This pilot is not powered by assertion to prove broad superiority. Expand only after the measurement process is credible.

During each C run retain this chain when it occurs:

```text
native observation -> specific unresolved property -> source checkpoint
-> proposed change -> actual source diff -> same-journey check
-> other-journey regression checks -> retained result or abstention
```

A delivered PNG hash or “I viewed it” statement proves neither perception nor causality. Record the source immediately before and after tool use and the actual revision. Construction from a supplied primitive is credited separately; useful value does not require a repair on every task.

### Separate mechanism test: same checkpoint, ordinary revision versus Motion revision

From a preregistered sample of real generated working checkpoints, create isolated copies. Give fresh agents the same concrete improvement request, tools/assets, allowed design edits, and measured revision budget; vary only the Motion intervention. Do not seed a defect or choose only checkpoints where Motion already won.

This controls static design variance and tests the repair mechanism directly. It is additional diagnostic work requiring its own budget, not part of the 18-session arithmetic and not a replacement for the from-scratch evaluation.

## 7. Interpret the results before changing the prompt again

| Observation | What it supports, and what to do |
| --- | --- |
| B and C beat A, but C does not beat B | Construction guidance/recipes may provide the gain. Do not attribute it to review technology. |
| Guided C helps, natural C does not | Improve routing, plan/actor setup cost, and evidence presentation. Do not hide non-adoption. |
| C helps from the same checkpoint, but not from scratch | The tool may be useful for refinement; creation or early feedback integration remains weak. |
| The independent checker sees failures the tool cannot express | Improve targeted sensors/contracts. A larger prompt will not create those measurements. |
| All arms pass function, but users prefer one motion design | Inspect the preference reasons and separate style from choreography. Do not invent a deterministic winner from geometry. |
| C still provides no benefit with valid tests and adequate exposure | Rework the feedback implementation or narrow the product claim. Do not keep selecting more favorable demos. |

These are hypotheses to investigate, not conclusions already established by one small run. Also allow a legitimate no-change result when the ordinary output is already good.

## 8. README presentation and launch gate

Lead with a real 12–18 second normal-speed FIELD excerpt showing a connected transition, a reversal, and the interactive handoff. Use a representative run chosen by a published rule, not the largest treatment margin found afterward. Then offer complete source-bound footage and the full from-scratch comparison.

Below it, show a separate same-design before/after only when actual Motion-guided work earns it. Name the defect, show the native event/window, the narrow source change, and the independent non-regression check. A real contribution is more convincing than another side-by-side restyle.

Do not replace the existing truthful footage with a fabricated winning demo. If the next evaluation finds verification savings but no preference gain, launch with that narrower claim. A general promise of better motion design requires evidence across tasks, not just a more elaborate hero.

## 9. Retained execution record

The bounded one-repetition attempt is frozen at `artifacts/bello-root-fix/attempt-2/motion-value-pilot/2026-10-07T05-41-07.202Z`. It used Codex CLI 0.155.1 with the configured `gpt-6.1-sol`/`xhigh` settings and package SHA-256 `c012b9cd15b86c1b318c2e3508dd965f321e517f0197f05a229aee439950367b`. That host rejected the configured model: all nine sessions ended `agent-failed` after roughly three to five seconds, none produced an initial checkpoint, and no Motion arm adopted Motion tools. Three construction final-source directories changed, but those bytes are not completed products or verified repairs.

The regrade-only runner subsequently validated the frozen source digests and held-out commitment and exercised the preserved final bytes with the final package. Its completed receipt is `artifacts/motion-value-regrade/2026-10-07T08-00-00Z-final/RESULTS.json` (SHA-256 `44d7d2e96c9c87c5848bfd163d02dc976c995b0b3b0975dbeec03add77945162`): 9 sessions, 0 agent-completed, 0 function-passed, 0 motion-consistency-passed, and 0 Motion adoption. Several held-out controls were absent and timed out, which is retained as a failure rather than imputed as a score.

The final regrade package is SHA-256 `f8333df107382aa4123dddcfd1cc6dcace49da55ac646768998ab82c094c6ac2`; evaluator SHA-256 is `0b89d1ca53cdfdb999967ea4093fd8d70ef291c4b251efddfb0a7ac724f14aed`; regrade runner SHA-256 is `95e4e5293afac89a99ebe3abaed01f0815b3f3677bbe5b5bc40a8b2f8710df8e`. Browser grades describe only the bytes that existed after failed generation. They provide no successful before/after repair pair, causal Motion evidence, aesthetic preference, or product-effectiveness cohort.

Separately, the matched detector calibration compares commit `4157fd25a696c8de1eef0f0fad83b0cd4b1fa622` with the final runtime on identical fixtures and actions. The old runtime was blind to the newly declared wrapped-orientation and independent-anchor guarantees; the final runtime rejects the planted 3.1733-radian flip and 45.980 CSS px anchor drift while the reference still passes. This establishes detector sensitivity, not agent or product superiority. Exact artifacts and identities are in [`FINAL_REPORT.md`](../history/FINAL_REPORT.md).

## Primary technical references

[S1]: https://motion.dev/ai-kit
[S2]: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
[S3]: https://github.com/ChromeDevTools/chrome-devtools-mcp
[S4]: https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents
