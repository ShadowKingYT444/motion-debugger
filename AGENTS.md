# Working on Motion Debugger

Motion Debugger supplies temporal browser evidence to coding agents. Keep the reusable core, CLI, MCP transport, and shipped examples consistent.

## Boundaries

- Do not claim an npm version exists until the registry serves that exact version
- Do not change registry ownership, repository visibility, licensing, credentials, or host configuration without the owner's approval
- Preserve user files and unrelated MCP entries. Installation must be previewable, explicit, atomic, and recoverable
- Capture only trusted credential-free local development pages. Never import a personal browser profile
- Never replace actual browser measurements with generated traces or hardcoded passing results
- Label seeded defects and handwritten repairs. A detector comparison is not a blind coding-agent benchmark

## Architecture

- `packages/core`: recording, evidence contracts, safety, comparisons and the page critic (`critique.ts`, `critique-probe.ts`)
- `packages/mcp`: stdio transport; stdout is JSON-RPC only
- `packages/cli`: package installation, configuration, diagnostics, demo and evidence commands
- `plugin/motion-debugger/skills/premium-motion`: the craft skill and motion kit agents use for pages and sites
- `studies/premium-ab`: the blinded agent A/B harness, evidence and results; keep judges blind and report pair-level statistics
- `demos`: agent-built control/treatment sites with side-by-side films recorded by `demos/record.mjs`; never hand-edit the sites, re-record films after any change
- `src/examples`: original animated fixtures; honor reduced motion and provide pause/replay
- `tests`: regression, transport, installation and browser verification

## Verification

Run `npm run check`, the browser suites, and the packed-distribution tests before release. Test a tarball outside the source tree with its own dependency installation. A source-checkout pass does not prove the published package works.

For visual changes, inspect actual desktop and mobile screenshots AND timed recordings. For motion changes, test interruption, reversal, replay, final state and reduced motion. Keep the same explicit contracts before/after; do not loosen thresholds simply to make CI pass.

Document what was tested: protocol client, configuration parser, packaged binary, or actual agent host. Do not conflate them. Preserve exact commit and CI provenance with delivered evidence.
