# Connect your coding agent

All clients use the same local stdio server. No account, model API key, hosted service or remote upload is required by Motion Debugger.

Version 0.3.0 is a private preview, not an npm-registry release. Install the provided tarball before using the local binary. Registry examples below describe the intended pinned launch after publication; do not run an unverified package of the same name.

## Recommended: configuration wizard

```sh
npm install -g ./motion-debugger-0.3.0.tgz
motion-debugger init --local
```

Choose a client, review the exact destination/change, then confirm. In a noninteractive terminal, `init` only previews. Keep `--local` for the unpublished preview so the configuration points to the durable installation instead of an unavailable registry package.

Prefer a project-local install? Run `npm install /absolute/path/motion-debugger-0.3.0.tgz` in a stable tools directory, then `npm exec --offline -- motion-debugger init --local` there. Use the same `npm exec --offline -- motion-debugger` prefix for demo/doctor commands. Do not register an absolute path into a disposable npm-exec cache.

The browser dependency is explicit:

```sh
motion-debugger setup --browser --client codex --local
motion-debugger doctor
```

The setup command can combine Chromium installation and configuration review. It does not import browser credentials or silently trust an MCP server in your editor. Keep your host's normal approval prompts.

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

## Narrow the target

Set `MOTION_ALLOWED_ORIGINS` to your exact local preview origin. Set `MOTION_ARTIFACT_DIR` to a writable evidence directory. Source excerpts are optional and require explicit `MOTION_SOURCE_ROOTS`. Do not supply secrets or personal browser profiles.

## Install from source

For this private preview, clone a reviewed branch you have access to, then:

```sh
npm ci
npm run build
node build/cli/index.js setup --browser --client codex --local
node build/cli/index.js doctor
node build/cli/index.js demo
```

On Linux, missing system libraries may require Playwright's official dependency-installation instructions. `doctor` reports missing browsers and launch failures rather than calling a configuration-only check a successful browser test.

## Compatibility evidence

The stdio endpoint is exercised with the official MCP SDK. Generated config shapes are based on the client documentation linked below and covered by parser/installer tests. Actual Claude, Cursor and VS Code interactive sessions are not claimed as tested. Host-specific trust and sandbox settings still apply.

## Sources checked 2026-10-02

- [Codex MCP configuration and scope](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Claude Code MCP commands and project approvals](https://code.claude.com/docs/en/mcp)
- [Cursor MCP configuration](https://cursor.com/docs/mcp)
- [VS Code MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)

For captured evidence, contracts and tool-call examples, see [the agent workflow](AGENT-WORKFLOW.md). For runtime limitations, see [integration details](INTEGRATION.md).
