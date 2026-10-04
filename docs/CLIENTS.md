# Connect your coding agent

All clients use the same local stdio server. No account, model API key, hosted service or remote upload is required by Motion Debugger.

Version 0.5.0 is an unpublished preview. From a reviewed repository checkout, create the local package:

```sh
npm ci
npm pack
```

`npm pack` builds the runtime and creates `motion-debugger-0.5.0.tgz` in that checkout. Use that exact file in the commands below, or follow the [source quickstart](../README.md#quickstart) to run the built CLI directly. Keep the installed runtime in a durable location.

## Recommended: configuration wizard

```sh
npm install -g ./motion-debugger-0.5.0.tgz
motion-debugger init --local
```

Run the wizard from the application project. Choose a supported client, keep the offered six-skill installation, review the exact MCP destination and skill folders, then type `yes` to confirm. In a noninteractive terminal, `init` only previews. For scripted complete setup, use `init --client codex --local --skills --project /absolute/path/to/app`; add `--apply --confirm <confirmationToken>` after reviewing that exact preview. Keep `--local` for the unpublished preview so the configuration points to the durable installation instead of an unavailable registry package.

Prefer a project-local install? Run `npm install /absolute/path/motion-debugger-0.5.0.tgz` in a stable tools directory, then run `npm exec --offline -- motion-debugger init --client codex --local --skills --project /absolute/path/to/app --apply` there to review and approve setup for the actual application project. Use the same `npm exec --offline -- motion-debugger` prefix for demo/doctor commands. Do not register an absolute path into a disposable npm-exec cache.

The browser dependency is explicit:

```sh
motion-debugger setup --browser --client codex --local --skills --project /absolute/path/to/app
motion-debugger doctor
```

The setup command can combine Chromium installation, configuration review and all six project skill entries. In an interactive terminal it asks for approval of the displayed file changes; in a noninteractive terminal it only previews them until you supply `--apply` and the exact confirmation token. The explicit browser download can run before that file-change review. It does not import browser credentials or silently trust an MCP server in your editor. Keep your host's normal approval prompts.

## Skills-only setup and safe updates

If MCP is already connected, run `motion-debugger skills install --client codex --project /absolute/path/to/app --apply` to review and approve the six project skill entries. Use `claude-code`, `cursor` or `vscode` for the other supported clients. A preview lists every copied file and its SHA-256 digest. Identical folders and unrelated skill folders are retained. A differing `motion` folder is preserved and disclosed in `preservedSkills`; use the namespaced `$motion-debugger` entry, which includes its own recipes and references in project installations. Other differing named folders or extra files are refused before writing. The installer never overwrites existing skill instructions; preserve or move those colliding folders and review again. See [skill destinations and installer verification](SKILLS.md).

`--project` scopes both generated MCP defaults and relative evidence/source-root paths to that project. Combined `--skills` setup defaults its project to the current directory. Explicit `--config PATH` still chooses the exact MCP file, so review it carefully. MCP-only `init` without either flag retains its existing default destinations, including the Codex user configuration.

## Client formats

| Client | Project configuration | Shape |
| --- | --- | --- |
| Codex | `.codex/config.toml` | `[mcp_servers.motion-debugger]` with `command`, `args`, environment table |
| Claude Code | `.mcp.json` | `mcpServers` |
| Cursor | `.cursor/mcp.json` | `mcpServers`, `type: "stdio"` |
| VS Code / Copilot | `.vscode/mcp.json` | `servers`, `type: "stdio"` |

Generate a complete snippet with `motion-debugger config --client codex --local` (replace `codex` with `claude-code`, `cursor` or `vscode`). Merge it rather than replace unrelated servers. Explicit `--config PATH` selects a destination; the preview shows which file will change.

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

Actual fresh Codex sessions loaded the project-local skills and MCP server in the [LOOP](../studies/loop-studio/METHOD.md) and [Ants](../studies/ants-launch/METHOD.md) comparisons. Their recorded tool calls establish use of their frozen baseline packages in those sessions. They do not establish discovery of this upgraded package or native Codex ZIP plugins. Current upgrade checks and remaining host limits are recorded in [implementation status](MOTION-QUALITY-IMPLEMENTATION.md).

The stdio endpoint is also exercised with the official MCP SDK. Generated config shapes are based on the client documentation linked below and covered by parser/installer tests. Extracted Codex, Claude Code and Cursor plugin packages pass fresh dependency, SDK and native browser tool checks. Interactive Claude Code, Cursor and VS Code sessions, and native ZIP host discovery, remain unverified. Host-specific trust and sandbox settings still apply.

## Sources checked 2026-10-02

- [Codex MCP configuration and scope](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Claude Code MCP commands and project approvals](https://code.claude.com/docs/en/mcp)
- [Cursor MCP configuration](https://cursor.com/docs/mcp)
- [VS Code MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)

For captured evidence, contracts and tool-call examples, see [the agent workflow](AGENT-WORKFLOW.md). For runtime limitations, see [integration details](INTEGRATION.md).

A successful `doctor` confirms launch and video finalization, not full viewport coverage or adequate sampling on a complex 3D page. In this laptop trial, headed recording cropped/padded the emulated viewport; maximizing did not repair the video stream. The published workflow recordings therefore use the default headless mode on both arms. Inspect actual frames and renderer diagnostics before treating a recording as usable evidence.
