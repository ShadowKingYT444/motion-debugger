# Evidence for creation and refinement

Before capture, write the actual product journey and its positive result, deadlines, error states and interruption cases. Example for a colony launch page: open the task panel, select a worker, switch worker while its token is traveling, run the task, and verify that the visible result corresponds to the selected worker. Verify the ordinary CTA and links independently. A looping ant scene is not task completion.

Capture a trusted credential-free local development page at desktop and narrow widths. Use a unique target and the same viewport, interactions, duration, reduced-motion preference and explicit contracts across before/after runs. Include the delayed end, not only the initial reveal. Keep enough frames around reversals and final state. The tool returns a capture ID and stores real browser footage; do not synthesize traces or substitute scene counters for measurements.

1. `motion_capture({recipe})` records the specified interaction.
2. `motion_inspect({captureId,fromMs,toMs,includeSamples:true})` reveals the event/sample context around a finding.
3. `motion_frames({captureId,timestampsMs})` returns recorded native images; look at them, including intermediate states.
4. After a source repair, rerun the unchanged recipe and use `motion_compare({beforeId,afterId})`; inspect the after frames as well.

Obtain tool schema and current limits from the connected server; do not invent arguments or shorten a journey to fit the default capture duration. Each wait is at most 4000ms, all waits total at most 10000ms, and the entire interaction is at most 12000ms. Leave room for actual clicks and settling. `contract.outcomes.timeoutMs` is a deadline measured from capture START, including actions; it is not an extra timeout after the final wait. Omit it to use the capture duration. Positive checks run after the actions before that deadline; forbidden visible errors are observed throughout. For example, use a 12000ms capture with three waits of 3000ms for a nine-second task, with no shorter outcome timeout.

The ordinary browser remains available for outcome assertions, keyboard journeys, screenshots and long interactions. Capture tools are observation tools; the host coding agent writes source and tests. Do not loosen budgets after seeing a failure.

The interaction deadline also applies to exploratory captures without outcomes. Overlong waits or blocked inputs retain incomplete evidence rather than a completed report. `recipeWarnings` identifies known wait/drag schedules that exhaust the budget; leave additional room for real input. For held scrubbing, use `action:"drag"`, a unique selector, 2–12 normalized `{x,y}` waypoints and 100–2000ms duration. Every reversal is visited while the native pointer stays down, then it is released even on failure. Match the recorded range to its actual thumb geometry; observe release state separately from any playback that resumes afterward.

Canvas movement needs footage of the canvas contents. A static DOM box can contain rich motion or a stalled renderer. Frame cadence, motion continuity, meaningful final state and visual composition are separate observations. Static screenshots cannot establish smoothness; sparse frames and dropped/insufficient footage are inconclusive. Report the exact source revision, runtime, viewport, captures and checks. Distinguish protocol/tool connectivity from an actual fresh agent-host invocation.

For a matched A/B, preserve the same brief, model, assets and comparable effort; both agents retain ordinary browser tools. Log the extra plugin guidance and tool use in the assisted condition. Preserve failures and incomplete recordings. A recipe demonstration or handwritten repair proves the artifact behaves as inspected; it does not establish general coding-agent improvement.
