# Research-first scope and prior art

Checked against primary project documentation on 2026-10-02. This is a scoped prototype, not a claim that animation recording, agentic debugging, or motion auditing is new.

## Relevant existing work

- **web-motion-skill** already gives a coding agent a recording, frame extraction/contact sheets, and a review/optimization loop for web animations. That makes a generic “let the agent watch motion and fix it” pitch insufficiently distinctive. [Project README](https://github.com/Schmandarine/web-motion-skill)
- **Replay MCP** exposes recorded runtime inspection to coding agents: source, variables, network activity, React analysis and performance tools. Its recording model replays program execution, which is substantially broader than this prototype's video plus instrumented traces. [Official overview](https://docs.replay.io/basics/replay-mcp/overview), [recording model](https://docs.replay.io/basics/debugging/overview)
- **MotionScore** audits animation properties, scroll animation, layout/style thrashing and GPU pressure. The CLI can run a headless browser audit and report graded performance findings. [Official documentation](https://score.motion.dev/docs), [CLI](https://motion.dev/docs/motionscore-cli)
- **Motion Studio** provides a visual animation timeline/editor, runtime preview and an agent-assisted apply-to-code workflow. Timeline scrubbing and editing therefore are existing product capabilities. [Official product page](https://motion.dev/studio)

## Chosen slice

The narrow experiment is **reproducible evidence of one interrupted motion regression**:

1. Cause a real delayed response to replace a React component during its entrance
2. Correlate application-marked state/lifecycle information with browser-observed node identity, animation cancellation/restart, and measured geometry/opacity
3. Require the complete evidence chain rather than conclude causality from an API timestamp or pixels alone
4. Execute a stable-key code branch under the same conditions
5. Show restored continuity while independently checking final response-driven state

The distinctive emphasis of this build is a compact, inspectable before/after proof packet for the controlled regression. The research does not establish unique market positioning, novelty, or superiority over the listed tools. It also does not establish general root-cause inference or automatic repair of an arbitrary app.

## Deliberate exclusions

No generic animation-quality score, broad editor integration, paid model inference, uploaded third-party code, external target crawling, or automatic repository edits. Those would expand a small reproducible experiment into a different product and weaken the ability to verify it in the allotted build window.
