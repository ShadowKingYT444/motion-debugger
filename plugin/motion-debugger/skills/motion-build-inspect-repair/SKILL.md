---
name: motion-build-inspect-repair
description: Build a requested animated webpage or interface, inspect its actual running motion, diagnose observed defects, apply authorized source repairs and verify the same interaction again. Use for end-to-end prompt-to-page delivery with Motion Debugger's recorded frames and temporal evidence, including 3D UI.
---

# Prompt → build → inspect → repair

Own the requested interface through an evidenced result. The host coding agent builds and edits source; this plugin supplies design guidance and local observation tools. An MCP configuration entry alone does not prove the tools are connected.

## Build the requested product

Read the brief, repository instructions and existing package setup. Write down the primary interaction, the intended visual result and important final state. Use `motion-design` for the page and `motion-3d-ui` when real spatial motion is needed. Preserve the user's requested stack and task; do not replace a difficult requirement with a different demo.

Implement the first usable version, including the actual controls and pending/error states it needs. Start its credential-free local preview and check compilation, console errors and the main behavior. If motion tools cannot connect or Chromium cannot launch, report that blocker; ordinary screenshots or static tests may still help, but do not label them recorded motion proof.

## Observe before diagnosing

Choose the real loopback URL, a unique target and an authorized, repeatable interaction. Capture ordinary use plus a revealing interruption or reversal when applicable. Fix the recipe, viewport, reduced-motion setting, duration and meaningful expectations before comparing a repair.

Call the actual MCP tools in this sequence:

1. `motion_capture({recipe})`: record the running interaction and keep its capture ID
2. `motion_inspect({captureId, fromMs, toMs, includeSamples:true})`: inspect a bounded window near the reported finding; use events and sample cadence to distinguish an app jump from weak sampling
3. `motion_frames({captureId, timestampsMs})`: consume the returned native PNG images around that window, or let the tool choose a finding window. Inspect more than endpoints. Seeking is approximate; the trace is the timing authority

If a wrapper exposes images only as base64 or local PNG paths, decode/view the actual images with available image tools. Receiving frame metadata is not the same as looking at the frame. Raw evidence is available at `motion-evidence://capture/<captureId>`.

Choose only contracts that express the intended design. Frame/height/containment budgets are caller expectations, not universal quality scores. Use final-state expectations so a visually stable “repair” cannot simply disable the interaction. For canvas/3D, video-derived frames show internal scene motion; DOM rectangle metrics alone do not. Marked scene state and source references are annotations, not independently inferred causes.

## Diagnose and repair from evidence

Connect a visible or measured failure to a specific code path. State the observation, a candidate cause and a test that could distinguish it from alternatives. Inspect the relevant source through the normal coding tools. Do not infer a defect from an animation cancellation alone, and do not copy a reference branch or a prewritten “fixed” implementation as the answer.

When source repair is within the user's requested build/fix scope, apply the smallest justified change and continue without an unnecessary approval roundtrip. This skill does not authorize unrelated installs, production changes, credentials or external publication. If the evidence is inconclusive, narrow the reproduction and observe again instead of rewriting the whole animation.

Repeat the original `motion_capture` recipe after the change, then call `motion_compare({beforeId, afterId})`. Inspect the after frames as well as metrics. A comparable result, intended final state and a visibly correct transition are all useful; one passing assertion is not a complete review. Do not raise a failing budget merely to manufacture a pass or remove the feature being tested.

If the after version still has a defect, keep working on the authorized source and repeat. Preserve capture IDs across attempts so a later improvement cannot erase the original evidence. Stop when the requested interaction is visibly correct and its meaningful contracts/tests pass, or when a concrete permission/environment blocker prevents further work. Report unresolved limits plainly.

## Deliver the product and proof

Give the running preview/artifact, the principal behavior, changes made from the observed evidence, before/after IDs or links and remaining limits. Include desktop/narrow viewport and reduced-motion checks when relevant. Distinguish an agent-written repair from a handwritten reference branch, and a single run from evidence of general agent improvement.
