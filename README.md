<p align="center"><img src="docs/assets/banner.svg" alt="Motion Debugger — see the frames your agent misses" width="100%"></p>

**Give your coding agent eyes for motion.** Record an interaction, find the frame where it breaks, and verify the repair.

[MCP setup](docs/CLIENTS.md) · [Agent workflow](docs/AGENT-WORKFLOW.md) · [Evidence](docs/V2-VERIFICATION.md) · [Security](SECURITY.md)

## Why it exists

The final screenshot looks right. The drawer still snaps halfway open, a loading card jumps, or a character's eyes escape during a fast reversal.

Motion Debugger gives your agent the missing evidence:

- **Frames the agent can see**, replayable video and timestamped motion events
- **Specific failures**: discontinuities, layout jumps, overshoot and replaced elements
- **Before/after proof** using the same interaction and explicit motion expectations

It runs locally. No model API key, account or cloud upload.

## Install the private preview

Requires Node.js 22+. Download the built `motion-debugger-0.3.0.tgz` package, then run:

```sh
npm exec --yes --package ./motion-debugger-0.3.0.tgz -- motion-debugger init --local
```

The wizard previews the chosen agent configuration before writing it. Chromium is an explicit download. [Full setup and source install →](docs/CLIENTS.md)

**Registry publication is deferred.** The preview is installable from its tarball; `npx motion-debugger@0.3.0` is not advertised as a live npm release.

## See it move

```sh
motion-debugger demo
```

Open the printed local URL. Two articulated couriers follow the same route: one snaps on interruption, the other carries its momentum through the turn. Pause, replay and redirect them. Drawer, live-data and cursor examples are included too.

## Use it with an agent

“On my local preview, record the drawer opening, closing and reopening. Find the transient jump, fix it, then compare the same sequence.”

`motion_capture` → `motion_frames` + `motion_inspect` → repair → `motion_compare`

Works over stdio MCP with configuration adapters for **Codex, Claude Code, Cursor and VS Code/Copilot**. A CLI and typed TypeScript core are included. [Client setup →](docs/CLIENTS.md)

## Honest scope

Use trusted, credential-free local previews. Captures can click controls and record page content. Recordings are not automatically redacted.

The examples contain seeded defects and handwritten repairs. They demonstrate temporal evidence, not an autonomous-agent benchmark or a universal animation-quality score.

[Development](CONTRIBUTING.md) · [Integration details](docs/INTEGRATION.md) · [Prior art](docs/PRIOR-ART.md)
