<p align="center">
  <img src="docs/assets/wordmark.svg" alt="Motion Debugger" width="360">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22%2B-43853d" alt="Node.js 22+">
  <img src="https://img.shields.io/badge/transport-MCP-6366f1" alt="MCP transport">
  <img src="https://img.shields.io/badge/status-local_preview-f59e0b" alt="Local preview">
</p>

<p align="center"><b>Build motion. Watch it. Make it better.</b></p>

<p align="center">
  <a href="#quickstart">Quickstart</a> · <a href="#coding-agents">Coding agents</a> · <a href="#how-it-works">How it works</a> · <a href="docs/AGENT-WORKFLOW.md">Documentation</a>
</p>

![Motion Debugger: expressive motion, real browser evidence](docs/assets/banner.svg)

Motion Debugger gives coding agents a way to build and refine animated interfaces with **actual browser recordings**. It combines motion design skills, runnable animation recipes, actor-aware review and local MCP tools. Use it for interactive product pages, SVG choreography, canvas scenes and 3D interfaces.

## Quickstart

Requires **Node.js 22+** and Chromium. This is an unpublished local preview; install from GitHub rather than npm.

```sh
git clone https://github.com/ShadowKingYT444/motion-debugger.git
cd motion-debugger
npm ci
npm run build
node build/cli/index.js setup --browser
node build/cli/index.js doctor
```

Connect it to your application project:

```sh
node build/cli/index.js init --client codex --local --skills \
  --project /absolute/path/to/your-app
```

The command previews the MCP configuration and skill files. Review it, then rerun with `--apply` to confirm in an interactive terminal. For scripts, add `--apply --confirm <confirmationToken>` from that exact preview. Keep this checkout in place: `--local` registers its absolute runtime path. Unrelated settings and skill files are preserved.

For a portable installation, run `npm pack`, then install the resulting tarball in a stable tools directory. [Installation details](docs/CLIENTS.md).

## Coding agents

Replace `codex` in the setup command with your client:

| Agent | `--client` | Project MCP configuration | Skills |
| --- | --- | --- | --- |
| Codex | `codex` | `.codex/config.toml` | `.agents/skills/` |
| Claude Code | `claude-code` | `.mcp.json` | `.claude/skills/` |
| Cursor | `cursor` | `.cursor/mcp.json` | `.cursor/skills/` |
| VS Code / Copilot | `vscode` | `.vscode/mcp.json` | `.github/skills/` |
| OpenCode 1.x | `opencode` | `opencode.json` | `.opencode/skills/` |

Reload your agent after installation and check that Motion's MCP tools are connected. OpenCode v2 uses a different configuration format; see [client setup](docs/CLIENTS.md#opencode). Native plugin package options are in the [plugin guide](docs/PLUGIN-PACKAGES.md).

In Codex, start with:

> $motion-debugger Build a railway dispatch console with moving trains, curved routes, timetable scrubbing and interruptible station transitions. Watch the result and refine the motion.

For other agents, ask it to **load the `motion-debugger` skill** and provide your brief. To improve an existing app, include its local preview URL and the interaction that needs work.

## How it works

1. **Create** — the agent uses motion design guidance and runnable recipes to build your interface.
2. **Watch** — Motion records a repeatable visitor journey in a fresh Chromium context.
3. **Inspect** — the agent receives native video frames, events, actor observations and explicit contract results.
4. **Refine** — it edits your source, then repeats the same journey to check the change.

| Tool | Purpose |
| --- | --- |
| `motion_recipe` | Get runnable animation patterns and integration guidance |
| `motion_review` | Review transitions with actor observations and native images |
| `motion_probe` | Try interruption offsets and retain failure evidence |
| `motion_capture` | Record a local interaction with explicit expectations |
| `motion_inspect` | Inspect events and measurements around a moment |
| `motion_frames` | Extract images from the actual recording |
| `motion_compare` | Compare equivalent before/after journeys |
| `motion_list` | Find saved captures |

Recordings and reports stay local in `.motion-evidence/`. Capture trusted, credential-free local pages. Measurements check your stated contracts; visual taste remains a human judgment.

## Try it locally

```sh
node build/cli/index.js demo
```

Open the printed URL to explore the bundled examples. For the new railway workflow A/B, run `npm run demo:rail` and open its comparison viewer.

[Agent workflow](docs/AGENT-WORKFLOW.md) · [Skills](docs/SKILLS.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)
