# Bounded host-agent workflow

Read `build-inspect-repair.json` as a declarative plan for the host coding agent. The JSON's `references` resolve from the plugin root, so `skills/motion-evidence/SKILL.md` means the shipped skill in this plugin. `validate.mjs` checks graph structure only; it does not execute nodes, schedule agents, edit source or supply a new autonomous runner.

Follow the selected edges once: brief → design → build → inspect → repair 1 → verify 1 → repair 2 → verify 2 → report. Skip repairs when inspection or verification passes. Stop at blocked report when a concrete blocker prevents the next justified action. A remaining defect after verify 2 reaches report as `unresolved`.

Repairs already authorized by the user's build/fix request proceed autonomously through the host's normal coding tools. No extra approval is needed merely because a repair node follows inspection. The plan grants no additional permissions; apply the host's existing confirmation policy.

Preserve the original capture and all after captures. Compare the same interaction, meaningful contracts, viewport and reduced-motion settings; view actual after frames and verify the final state. Missing evidence never qualifies as a pass.

To opt into this plan, instruct the host: “Use the plugin's workflows/build-inspect-repair.json as the bounded control plan, using the referenced skills for each node. Report a pass, unresolved defect after two repair attempts, or exact blocker.” Hosts do not automatically discover or enforce this graph. Existing study arms retain their frozen skill text and prompts; do not inject this plan into an active A/B run.

Validate without dependencies:

```sh
node plugin/motion-debugger/workflows/validate.mjs
```

When working from a standalone plugin directory, use `node workflows/validate.mjs` instead. The repository's human-readable diagram is `docs/WORKFLOW.md`; that document is also included in the root npm package.
