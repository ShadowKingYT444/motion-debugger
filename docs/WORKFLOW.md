# Bounded build → inspect → repair workflow

Motion Debugger's workflow is a directed acyclic graph (DAG). Repetition is a new numbered node, so repair 2 and verify 2 are explicit rather than a loop back to repair 1. The host coding agent implements and repairs the page; Motion Debugger supplies design guidance and real local motion evidence. This is a declarative host-agent plan, not a new runner or orchestrator.

```mermaid
flowchart TD
  brief["Brief"] -->|complete| design["Design"]
  brief -->|blocked| blockedreport["Blocked report"]
  design -->|complete| build["Build"]
  design -->|blocked| blockedreport
  build -->|complete| inspect["Inspect"]
  build -->|blocked| blockedreport
  inspect -->|pass| report["Report: passed or unresolved"]
  inspect -->|repair_needed| repair1["Repair 1"]
  inspect -->|blocked| blockedreport
  repair1 -->|repaired| verify1["Verify 1"]
  repair1 -->|blocked| blockedreport
  verify1 -->|pass| report
  verify1 -->|repair_needed| repair2["Repair 2"]
  verify1 -->|blocked| blockedreport
  repair2 -->|repaired| verify2["Verify 2"]
  repair2 -->|blocked| blockedreport
  verify2 -->|pass| report
  verify2 -->|unresolved| report
  verify2 -->|blocked| blockedreport
```

1. **Brief, design, build:** fix the requested behavior, visual direction, stack, final state and relevant variants, then implement and start a trusted credential-free local preview
2. **Inspect:** capture the real interaction and relevant interruption, inspect a bounded finding window, and view actual recorded intermediate frames. Keep the original capture IDs
3. **Repair 1, verify 1:** apply a narrow, evidence-led source fix within the user's existing build/fix authorization. Retest the same recipe and contracts, compare with the original baseline, view after frames and check the final state
4. **Repair 2, verify 2:** if a justified defect remains, do one more explicit repair/retest pair. There is no third repair in this graph
5. **Report:** stop early when the requested behavior, relevant tests and meaningful unchanged contracts pass and the actual motion has been viewed. After verify 2, report any remaining defect as unresolved. Include the product/preview, changes, checks, all capture IDs and limits
6. **Blocked report:** from any work node, stop on an exact permission, environment, reproduction or evidence blocker. Say what action and target are blocked and what is needed next. Missing evidence or an unjustified repair hypothesis is not a pass

The repair nodes are autonomous within the user's authorized scope. They do not require another approval merely to continue an already requested build/fix. They also do not authorize unrelated installs, credentials, publication or production changes. The host applies its existing confirmation policy. A terminal report ends this plan; any subsequent continuation is a separate plan, not a hidden back edge.

## Constrained authoring in an existing design

Derive a versioned transition plan from the ordinary brief. Preserve stable logical actors and owned renderer bindings, source locations, protected attributes, acyclic beats, explicit CSS-pixel/scene-unit coordinates and radians, input policy and useful final state. Resolve relative DOM positions at transition start and invalidate bindings when layout/viewport/scene changes. The runtime app can still reverse and reopen; acyclicity applies to bounded phase dependencies and this host plan.

Freeze exact protected file hashes and permitted source/parameter edits before construction. Compare at most three candidates: current, minimal revision and optional alternative staging. Native rendering, reviews, tool calls, frame decoding and failed attempts all count against the same total budget. The validator checks these declared bounds and required policies; it does not execute them.

Reject failed or unverified function and changed protected design first. Keep motion meaning, response, trackability and visual preference separate, cite actual delivered native capture/event/frame evidence and allow abstention. Pose previews cannot establish native input latency or FPS. The `selectMotionCandidate` helper guards cost, eligibility and citation correspondence without computing an aesthetic score. A critic still needs calibration against blinded humans before becoming the main selector.

Retain a recoverable checkpoint of exact permitted source bytes only after native functional verification and unchanged protected hashes. Keep plan/actor bindings, capture IDs, regression recipe and measured costs with it. A later failing revision returns to the last verified checkpoint through normal host source-editing tools. The existing two-repair bound remains the default. See [transition authoring](../plugin/motion-debugger/skills/motion/references/transition-authoring.md) for bindings and the three original-object construction patterns.

The `$motion-debugger` entry avoids an invocation collision with other animation kits exposing `/motion`. Project installation previews six entries; a foreign `motion` folder is preserved and the namespaced entry receives its own recipes. This installer behavior does not establish native host discovery or a comparative agent benefit. Historical study prompts and packages stay frozen.

## Shipped files and references

- Machine-readable graph: [`plugin/motion-debugger/workflows/build-inspect-repair.json`](../plugin/motion-debugger/workflows/build-inspect-repair.json)
- Dependency-free structural validator: [`plugin/motion-debugger/workflows/validate.mjs`](../plugin/motion-debugger/workflows/validate.mjs)
- Separate host opt-in instructions: [`plugin/motion-debugger/workflows/README.md`](../plugin/motion-debugger/workflows/README.md)
- Execution references: [`plugin/motion-debugger/skills/motion-build-inspect-repair/SKILL.md`](../plugin/motion-debugger/skills/motion-build-inspect-repair/SKILL.md), [`plugin/motion-debugger/skills/motion-design/SKILL.md`](../plugin/motion-debugger/skills/motion-design/SKILL.md), [`plugin/motion-debugger/skills/motion-3d-ui/SKILL.md`](../plugin/motion-debugger/skills/motion-3d-ui/SKILL.md), [`plugin/motion-debugger/skills/motion-evidence/SKILL.md`](../plugin/motion-debugger/skills/motion-evidence/SKILL.md)
- Graph and regression tests: [`tests/workflow.test.mjs`](../tests/workflow.test.mjs), run with `npm run test:workflow`

The root package includes `plugin/` and `docs/`; the graph, validator and opt-in instructions travel with the plugin. No graph-registration field or automatic host enforcement is claimed. The graph's skill paths are plugin-root relative and work in a standalone plugin directory.

The experimental skill inputs and A/B prompts remain frozen in the study record; the released workflow skill now explicitly routes through this bounded plan. This separate graph does not retroactively change those runs or establish improved agent quality. The validator proves node/edge consistency, reachability, acyclicity and a maximum of two repairs per path; it does not prove a host followed the plan or that a generated interface is correct.
