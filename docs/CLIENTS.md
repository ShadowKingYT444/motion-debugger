# Connect your coding agent

All clients use the same local stdio server. No account, model API key, hosted service or remote upload is required by Motion Debugger.

Motion Debugger is not on the npm registry yet. Install the packed CLI from the latest GitHub Release:

```sh
npm install -g https://github.com/ShadowKingYT444/motion-debugger/releases/latest/download/motion-debugger.tgz
```

Or build the same tarball from a reviewed checkout with `npm ci && npm pack`, which creates `motion-debugger-0.5.0.tgz`, and install that file. Keep the installed runtime in a durable location: agent configuration points at its absolute path.

## Recommended: configuration wizard

```sh
motion-debugger init
```

Run the wizard from the application project. It suggests the client it detects from the project's files; confirm or choose another, keep the offered seven-skill installation, review the exact MCP destination and skill folders, then type `yes` to confirm. In a noninteractive terminal, `init` only previews. For scripted complete setup, use `init --client codex --local --skills --project /absolute/path/to/app`; add `--apply --confirm <confirmationToken>` after reviewing that exact preview. The wizard uses the installed copy's absolute path by default; keep `--local` in scripted setups for the same reason, since no registry package exists yet.

Prefer a project-local install? Run `npm install /absolute/path/motion-debugger-0.5.0.tgz` in a stable tools directory, then run `npm exec --offline -- motion-debugger init --client codex --local --skills --project /absolute/path/to/app --apply` there to review and approve setup for the actual application project. Use the same `npm exec --offline -- motion-debugger` prefix for demo/doctor commands. Do not register an absolute path into a disposable npm-exec cache.

The browser dependency is explicit:

```sh
motion-debugger setup --browser --client codex --local --skills --project /absolute/path/to/app
motion-debugger doctor
```

The setup command can combine Chromium installation, configuration review and all six project skill entries. In an interactive terminal it asks for approval of the displayed file changes; in a noninteractive terminal it only previews them until you supply `--apply` and the exact confirmation token. The explicit browser download can run before that file-change review. It does not import browser credentials or silently trust an MCP server in your editor. Keep your host's normal approval prompts.

## Skills-only setup and safe updates

If MCP is already connected, run `motion-debugger skills install --client codex --project /absolute/path/to/app --apply` to review and approve the six project skill entries. Use `claude-code`, `cursor`, `vscode` or `opencode` for the other supported clients. A preview lists every copied file and its SHA-256 digest. Identical folders and unrelated skill folders are retained. A differing `motion` folder is preserved and disclosed in `preservedSkills`; use the namespaced `$motion-debugger` entry, which includes its own recipes and references in project installations. Other differing named folders or extra files are refused before writing. The installer never overwrites existing skill instructions; preserve or move those colliding folders and review again. See [skill destinations and installer verification](SKILLS.md).

`--project` scopes both generated MCP defaults and relative evidence/source-root paths to that project. Combined `--skills` setup defaults its project to the current directory. Explicit `--config PATH` still chooses the exact MCP file, so review it carefully. MCP-only `init` without either flag retains its existing default destinations, including the Codex user configuration.

## Client formats

| Client | Project configuration | Shape |
| --- | --- | --- |
| Codex | `.codex/config.toml` | `[mcp_servers.motion-debugger]` with `command`, `args`, environment table |
| Claude Code | `.mcp.json` | `mcpServers` |
| Cursor | `.cursor/mcp.json` | `mcpServers`, `type: "stdio"` |
| VS Code / Copilot | `.vscode/mcp.json` | `servers`, `type: "stdio"` |
| OpenCode 1.x | `opencode.json` | `mcp`, `type: "local"`, command array, `environment` |

Generate a complete snippet with `motion-debugger config --client codex --local` (replace `codex` with `claude-code`, `cursor`, `vscode` or `opencode`). Merge it rather than replace unrelated servers. Explicit `--config PATH` selects a destination; the preview shows which file will change.

### Official client commands

For a stable local installation, the underlying server command is `motion-debugger mcp`:

```sh
codex mcp add motion-debugger -- motion-debugger mcp
claude mcp add --transport stdio --scope project motion-debugger -- motion-debugger mcp
```

For Cursor and VS Code, use the generated configuration in the appropriate file. Start/reload the server through the client's MCP controls. If the editor cannot find your shell's PATH, generate `--local` configuration with an absolute Node/entrypoint path.

After setup, ask the agent to list Motion Debugger's tools, then capture a permitted local interaction. An added configuration entry is not evidence of a successful connection.

## Visible local recording for 3D pages

The default browser is headless. On a local desktop, opt into a fresh visible browser when software rendering makes a 3D recording weak:

```sh
MOTION_BROWSER_MODE=headed motion-debugger doctor
MOTION_BROWSER_MODE=headed motion-debugger capture recipe.json
```

For MCP, add `MOTION_BROWSER_MODE = "headed"` to the server's environment table (JSON clients use `"MOTION_BROWSER_MODE": "headed"`). This opens a separate temporary browser context on the local display. It does not import your browser profile or attach to an unrelated tab. Launch flags are unchanged. `doctor` reports the selected mode and renderer; reports retain the mode, and comparisons reject mixed modes. A visible browser still needs adequate sampling, so inspect the report rather than assume that hardware rendering proves smoothness. Remove the variable to restore the default. Headless servers without a display should keep the default.

## Narrow the target

Set `MOTION_ALLOWED_ORIGINS` to your exact local preview origin. Set `MOTION_ARTIFACT_DIR` to a writable evidence directory. Source excerpts are optional and require explicit `MOTION_SOURCE_ROOTS`. Do not supply secrets or personal browser profiles.

## Install from source

For this private preview, clone a reviewed branch you have access to, then:

```sh
npm ci
npm run build
node build/cli/index.js setup --browser --client codex --local --skills --project /absolute/path/to/app
node build/cli/index.js doctor
node build/cli/index.js demo
```

On Linux, missing system libraries may require Playwright's official dependency-installation instructions. `doctor` reports missing browsers and launch failures rather than calling a configuration-only check a successful browser test.

## Compatibility evidence

The [premium-motion A/B](../studies/premium-ab/README.md) ran its builders as Claude Code subagents with the skill folder, a `CLAUDE.md` pointer and the CLI, which is the same shape every host gets from `skills install` plus `agents-md`. Codex, Cursor, OpenCode and Gemini CLI sessions were not run in that study.

The stdio endpoint is also exercised with the official MCP SDK. Generated config shapes are based on the client documentation linked below and covered by parser/installer tests. Extracted Codex, Claude Code and Cursor plugin packages pass fresh dependency, SDK and native browser tool checks. Interactive Claude Code, Cursor and VS Code sessions, and native ZIP host discovery, remain unverified. Host-specific trust and sandbox settings still apply.

## Sources checked 2026-10-02

- [Codex MCP configuration and scope](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Claude Code MCP commands and project approvals](https://code.claude.com/docs/en/mcp)
- [Cursor MCP configuration](https://cursor.com/docs/mcp)
- [VS Code MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)

For captured evidence, contracts and tool-call examples, see [the agent workflow](AGENT-WORKFLOW.md). For runtime limitations, see [integration details](INTEGRATION.md).

A successful `doctor` confirms launch and video finalization, not full viewport coverage or adequate sampling on a complex 3D page. In this laptop trial, headed recording cropped/padded the emulated viewport; maximizing did not repair the video stream. The published workflow recordings therefore use the default headless mode on both arms. Inspect actual frames and renderer diagnostics before treating a recording as usable evidence.

## OpenCode

For OpenCode 1.x, use `init --client opencode --local --skills --project /absolute/path/to/app`. The installer previews and merges `opencode.json` and installs six entries under `.opencode/skills/`. Reload OpenCode, then run `opencode mcp list` from the app directory. Ask the agent to load the `motion-debugger` skill and use `motion_recipe`.

The [OpenCode 1.x MCP documentation](https://opencode.ai/docs/mcp-servers/) uses server names directly under `mcp`, `enabled`, a command array and `environment`. [OpenCode v2](https://opencode.ai/v2/docs/mcp-servers) instead nests names under `mcp.servers` and uses `disabled`. The installer refuses a detected v2 structure; merge a v2 configuration manually, retaining the same absolute command and environment. Skills remain at the [documented project location](https://opencode.ai/docs/skills/).

Local check on 2026-10-04: OpenCode 1.18.31 parsed this format, connected to the source-built Motion stdio server, and discovered both supported skill locations. An actual agent invocation was attempted without a model override; its configured NVIDIA provider returned HTTP 403 “Authorization failed” before any Motion tool call. MCP discovery passes; model-driven tool use remains unverified. [Exact scope and result](OPENCODE-VALIDATION.json).
