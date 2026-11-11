<p align="center">
  <img src="docs/assets/wordmark.svg" alt="Motion Debugger" width="340">
</p>

<h3 align="center">Real-browser eyes and design taste for your coding agent,<br>so vibe-coded sites stop looking vibe-coded.</h3>

<p align="center">
  <a href="https://github.com/ShadowKingYT444/motion-debugger/actions/workflows/ci.yml"><img src="https://github.com/ShadowKingYT444/motion-debugger/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-3b82f6" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/node-22%2B-43853d" alt="Node.js 22+">
  <img src="https://img.shields.io/badge/works%20with-Claude%20Code%20%C2%B7%20Cursor%20%C2%B7%20Codex%20%C2%B7%20any%20agent-ffb33d" alt="Works with Claude Code, Cursor, Codex and any agent">
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#use-it">Use it</a> ·
  <a href="#what-the-critic-catches">What it catches</a> ·
  <a href="#does-it-work">Results</a> ·
  <a href="#works-with-your-agent">Agents</a> ·
  <a href="CONTRIBUTING.md">Contribute</a>
</p>

<p align="center">
  <img src="demos/ledgerline/comparison.gif" alt="The same prompt built by the same model: without Motion Debugger (left) and with it (right)" width="880">
  <br><sub>Same prompt, same model (Sonnet 5.5), one fresh agent each. Left: no plugin. Right: with Motion Debugger. Nothing edited by hand.</sub>
</p>

Ask any coding agent for a "premium" landing page and you get the same page everyone gets: purple gradient or near-black with one accent, a serif headline with an italic word, pill buttons, a bento grid, and every section fading up the same way. Then it ships without ever looking at it, so you find the copy hidden under the sticky header, the half-empty cards and the broken phone layout yourself.

Motion Debugger fixes both halves:

- 👀 **A critic that actually looks.** `motion-debugger critique` opens your local page in Chromium at desktop and phone size, records the entrance, scrolls the whole page, hovers every control, tabs through focus and repeats with reduced motion. It hands your agent a list of fixes plus annotated screenshots of the real frames.
- 🎨 **A skill that knows the AI template.** `premium-motion` names the default AI page and makes the agent leave it: art direction from the brief's own world, a finish system, one signature scroll scene, and a motion kit. It speaks your stack: plain HTML, React, Next.js, Motion (framer-motion) or GSAP.

## Install

You need Node.js 22 or later.

```bash
npm install -g https://github.com/ShadowKingYT444/motion-debugger/releases/latest/download/motion-debugger.tgz
```

Then, in your project:

```bash
motion-debugger init
```

`init` detects your agent (Claude Code, Cursor, Codex, VS Code, OpenCode), offers to download a matching Chromium, and shows every file it would change before asking you to type `yes`. Nothing is written without that, and your existing settings are kept.

<details>
<summary><b>Only want the skill?</b> Or installing from source?</summary>

**Skill only**, into any agent the [skills CLI](https://github.com/vercel-labs/skills) supports:

```bash
npx skills add ShadowKingYT444/motion-debugger --skill premium-motion
```

The skill tells the agent how to run the critic through `npx` if the CLI isn't installed.

**From source:**

```bash
git clone https://github.com/ShadowKingYT444/motion-debugger.git
cd motion-debugger && npm ci && npm run build && npm install -g .
motion-debugger setup --browser    # version-matched Chromium
motion-debugger doctor
```

An existing Chrome or Chromium also works: set `CHROMIUM_PATH`, or let the CLI find `/usr/bin/google-chrome` or `/usr/bin/chromium`. More options in [client setup](docs/CLIENTS.md).
</details>

## Use it

Tell your agent what you want, and to use the skill:

> Build a launch page for our speaker with premium design and motion. Follow the premium-motion skill, and critique the page before you finish.

The agent builds, runs the critic, opens the screenshots, fixes what they show and critiques again. You can run the critic yourself on anything local:

```bash
motion-debugger critique ./site                  # a folder with index.html, or one .html file
motion-debugger critique http://localhost:3000   # your running dev server (Next.js, Vite, …)
```

It prints findings with fixes and writes contact sheets to `.motion-critique/`. Each run also says what changed since the last one: fixed, new and remaining.

## What the critic catches

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/critic-dark.png">
  <img src="docs/assets/critic-light.png" alt="Finish defects outlined on crops of a real page">
</picture>

| | Finding | What it means |
| --- | --- | --- |
| 🚫 | `stuck-invisible` | Content that never appears, even after a full scroll (the most common agent bug) |
| 🧱 | `text-collision`, `copy-under-sticky` | Copy painted over other copy, or scrolling under a sticky header |
| 🕳️ | `hollow-containers`, `dead-space` | Cards with an empty band inside; screens that are mostly blank |
| 📐 | `near-miss-alignment`, `edge-crowding` | Items a few pixels off their column; copy jammed against the screen edge |
| 📱 | `mobile-overflow`, tap targets, clipped text | A phone layout that is really a squeezed desktop |
| 🎞️ | Motion checks | No entrance, unstaggered entrance, linear easing, motion that stops after the hero, dead hover, invisible focus, no reduced-motion support |
| 🤖 | `default-template` | How many of nine default AI-landing-page traits the first screen shares |

Findings come from real Chromium frames, never from reading the source. [Every check and its limits](docs/PREMIUM-MOTION.md).

## Does it work?

Same brief, same builder model, one fresh agent per site. One agent worked in an empty project; the other had the skill, the kit and the critic.

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/results-dark.png">
  <img src="docs/assets/results-light.png" alt="Judge scores and measured metrics, without vs with the plugin">
</picture>

In the latest batch (four matched pairs), blinded Opus 5.5 judges preferred the plugin's site in all four pairs (8 of 8 judgments). Distinctiveness rose from 6.4 to 8.8 and overall premium from 6.9 to 8.0. The control sites shared 6.5 of 9 default-template traits on average; the plugin's sites shared none. Visual design moved least (7.8 to 8.1).

Four pairs are too few for statistical significance. The earlier 16-pair study reached it for overall premium (+1.0, p = 0.005) and motion quality (+1.34, p = 0.0004), but found no gain in visual design, which the current version was rebuilt to address. [Method, every verdict and threats to validity](studies/premium-ab/README.md).

<details>
<summary><b>See all four pairs</b></summary>

**Ledgerline: payments API**
![Ledgerline, without vs with premium-motion](demos/ledgerline/compare.jpg)

**Drift: AI sleep coach**
![Drift, without vs with premium-motion](demos/drift/compare.jpg)

**Halo: wireless speaker launch**
![Halo, without vs with premium-motion](demos/halo/compare.jpg)

**Atelier Norr: architecture studio**
![Atelier Norr, without vs with premium-motion](demos/norr/compare.jpg)

Side-by-side films: [Ledgerline](demos/ledgerline/comparison.mp4), [Drift](demos/drift/comparison.mp4), [Halo](demos/halo/comparison.mp4), [Norr](demos/norr/comparison.mp4). Run `motion-debugger demo` and open http://127.0.0.1:4173/ab/ to play them and open every site live.
</details>

## Works with your agent

`motion-debugger init` sets these up for you; this is what it writes.

| Agent | `--client` | MCP configuration | Skills |
| --- | --- | --- | --- |
| Claude Code | `claude-code` | `.mcp.json` | `.claude/skills/` |
| Cursor | `cursor` | `.cursor/mcp.json` | `.cursor/skills/` |
| Codex | `codex` | `.codex/config.toml` | `.agents/skills/` |
| VS Code / Copilot | `vscode` | `.vscode/mcp.json` | `.github/skills/` |
| OpenCode 1.x | `opencode` | `opencode.json` | `.opencode/skills/` |

**Any other agent** (Gemini CLI, Aider, Windsurf, a CI job): the critic is a plain CLI with Markdown or `--json` output, so nothing is provider-specific. Copy the skill folder into your project and add the block printed by `motion-debugger agents-md --skills-dir <folder>` to the agent's instructions file (`AGENTS.md`, `GEMINI.md`, `.cursorrules`, …).

MCP hosts also get `motion_critique`, which returns the findings and screenshots as image content. [Client setup details](docs/CLIENTS.md) · [Native plugin packages](docs/PLUGIN-PACKAGES.md).

## How it works

1. **Direct.** The skill names the default page, has the agent change at least four of its defaults, and takes type, colour and layout from three artefacts of the subject's world.
2. **Compose and finish.** One dominant element per frame, sections laid out from their content, shared edges, boxes sized to content, hover that shows in a still, a real phone layout.
3. **Move.** One motion personality, one signature scroll scene finished at every scroll position, at most two supporting scenes. Uniform fade-ups are treated as a tell, not a feature.
4. **Look.** `critique` records what actually moved and measures finish in the captured frames.
5. **Refine.** The agent fixes every outlined defect, answers five design-director questions about each frame, and critiques again.

<details>
<summary><b>Debugging one specific transition?</b> The evidence tools.</summary>

For a single interaction, the MCP evidence tools record bounded journeys and compare repairs:

| Tool | Purpose |
| --- | --- |
| `motion_critique` | Critique a whole page: findings, fixes and contact sheets |
| `motion_recipe` | Get runnable animation patterns and integration guidance |
| `motion_review` | Review transitions with actor observations and native images |
| `motion_probe` | Try interruption offsets and retain failure evidence |
| `motion_capture` | Record a local interaction with explicit expectations |
| `motion_inspect` | Inspect events and measurements around a moment |
| `motion_frames` | Extract images from the actual recording |
| `motion_compare` | Compare equivalent before/after journeys |
| `motion_list` | Find saved captures |

See [Agent workflow](docs/AGENT-WORKFLOW.md).
</details>

## Safety and privacy

Everything runs on your machine. The critic only opens credential-free local pages (`localhost`, `127.0.0.1`, files), never imports your browser profile, and keeps recordings in your project folder. Review them before sharing. [Security model](SECURITY.md).

## Contributing

Bug reports, false positives the critic flags, and new checks are all welcome. Start with a [good first issue](https://github.com/ShadowKingYT444/motion-debugger/labels/good%20first%20issue) or say hi in [Discussions](https://github.com/ShadowKingYT444/motion-debugger/discussions). [Contributing guide](CONTRIBUTING.md).

## License

[MIT](LICENSE)
