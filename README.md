# Motion Debugger

**Build, inspect and repair animated interfaces with your coding agent.**

Motion Debugger captures a local page, inspects an interaction over time, and compares the result after a source repair. Four skills guide interface design, procedural 3D, evidence collection and a bounded repair workflow. The agent edits your source using its normal tools.

[Quickstart](#quickstart) · [Client setup](docs/CLIENTS.md) · [Skills](docs/SKILLS.md) · [Tool examples](docs/AGENT-WORKFLOW.md)

## Real demos

The [MONO workflow comparison](studies/workflow-mono-20261003/README.md) gives two independent agents the same demanding audio-product brief, GPT-6-Luna Max model and twenty-minute budget. One builds and refines with ordinary tools; the other uses Motion's installed skills and actual MCP tools. The recordings show matched visitor journeys through their independently built sites.

- [Ordinary workflow: full recording](docs/assets/workflow-mono-20261003/control.mp4)
- [Motion workflow: full recording](docs/assets/workflow-mono-20261003/treatment.mp4)
- [Prompt, source, tool traces and findings](studies/workflow-mono-20261003/README.md)

**Result:** Motion made an evidence-led easing repair, but this trial did not demonstrate a better overall site. Its Undo control failed and both final recordings had weak temporal sampling. GPT-6.1 was not run.

![Actual frozen ordinary and Motion interfaces](docs/assets/workflow-mono-20261003/comparison.png)

This compares complete workflows, including Motion's bundled guidance. It does not isolate a tool's causal effect or establish a general coding-agent advantage. Function checks, contract results and visual observations are reported separately.

## Quickstart

Private preview. Requires Node.js 22+ and a Chromium browser. No model API key is required by this tool. Version `0.4.0` is **not published on npm**.

From the reviewed preview branch:

```sh
git clone --branch work/local-motion-demo-20261003 \
  https://github.com/ShadowKingYT444/motion-debugger.git
cd motion-debugger
npm ci
npm run build
node build/cli/index.js doctor
node build/cli/index.js init --client codex --local --skills \
  --project /absolute/path/to/your-app
```

`init` previews the exact project configuration and four skill folders. Review the output, then rerun with `--apply` and approve the preview. In a noninteractive terminal, use its exact `--confirm <confirmationToken>`. Existing unrelated settings and skills are preserved. If `doctor` reports no browser, run `node build/cli/index.js setup --browser`, then run `doctor` again.

For a portable installation, run `npm pack`, install the resulting local tarball into a stable tools directory, and use its `motion-debugger` binary. [Full installation options](docs/CLIENTS.md).

Then ask your agent:

> Use motion-build-inspect-repair on my local app at http://127.0.0.1:3000. Check the details drawer under rapid open, close and keyboard reopening. Inspect the recorded frames, repair observed defects, and verify the same interaction again.

Use a trusted, credential-free production preview. Motion blocks WebSockets, including development-server HMR.

## Capture → inspect → repair → verify

| Tool | What the agent receives |
| --- | --- |
| `motion_capture` | WebM recording, screenshots, events, measurements and explicit contract results |
| `motion_inspect` | A bounded time window with relevant events and samples |
| `motion_frames` | Native PNG frames from the actual recording |
| `motion_compare` | Before/after changes, comparability checks and final-state equivalence |
| `motion_list` | Saved captures in the configured evidence directory |

Choose a unique target, repeatable actions and meaningful final-state expectations before the repair. Keep the same viewport, actions and contracts afterward. The [agent walkthrough](docs/AGENT-WORKFLOW.md) shows complete calls; the [workflow](docs/WORKFLOW.md) permits at most two repair attempts.

Each capture produces:

```text
.motion-evidence/<capture-id>/
├── video.webm     actual browser recording
├── poster.png    starting page
├── final.png     final page
└── report.json   recipe, trace, findings and limitations
```

## Agent integrations

Project setup supports **Codex, Claude Code, Cursor and VS Code/Copilot** through the same local stdio MCP server. Replace `codex` in the setup command with `claude-code`, `cursor` or `vscode`.

Fresh tarball installation, the official MCP SDK connection, real tool calls, browser captures and all four configuration formats are tested. This does not claim an interactive session in every editor. [Compatibility and setup details](docs/CLIENTS.md).

## Scope and limits

- Capture only trusted local pages. Recordings are not automatically redacted; no personal browser profile is imported.
- Measurements evaluate your stated contracts. They are not an aesthetic score or proof of perceptual smoothness.
- Weak sampling is inconclusive. The unchanged 80 ms integrity gate must pass before temporal comparisons can establish an improvement.
- A canvas rectangle cannot reveal motion inside a 3D scene. Inspect video frames as well as measurements.
- Source references and app marks are supplied annotations, not causes inferred from pixels.

[Development and tests](CONTRIBUTING.md) · [Security](SECURITY.md) · [Evidence architecture](docs/EVIDENCE-ARCHITECTURE.md) · [Historical studies](studies/aer/README.md) · [Design attribution](plugin/motion-debugger/skills/motion-design/references/taste-provenance.md)
