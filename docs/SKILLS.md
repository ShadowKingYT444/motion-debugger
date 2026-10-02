# Design, build, inspect, repair

Motion Debugger combines portable agent skills with local motion evidence tools. The host agent writes and repairs code; the MCP server records and inspects the running result.

## Four focused skills

- `motion-design`: choose a brief-led visual direction, coherent typography/surfaces and complete interaction states
- `motion-3d-ui`: build original spatial scenes with the right renderer, deliberate camera/lighting, responsive controls and resource cleanup
- `motion-evidence`: capture, inspect recorded images and compare temporal contracts for an existing interaction
- `motion-build-inspect-repair`: own a prompt-to-page build, diagnose actual observed defects, repair source in scope and verify the same interaction again

For a new animated page, start with `motion-build-inspect-repair`. It routes to design and 3D guidance only when relevant. For an existing temporal bug, start with `motion-evidence`.

## Install skills and MCP together

Install the provided private tarball in a durable location, then run this command **from the project you want the agent to work on**:

```sh
motion-debugger init --local
```

In an interactive terminal, choose Codex, Claude Code, Cursor or VS Code, keep the offered four-skill installation, review the exact project MCP destination and skill files, then type `yes` to apply. The browser download is a separate explicit choice. This is one guided setup for the evidence server **and** the design/build instructions. Keep the installed package in place because `--local` records its absolute runtime path.

For a known client or a different workspace, use an exact project-scoped preview:

```sh
motion-debugger init --client codex --local --skills --project /absolute/path/to/app
```

To apply interactively, add `--apply`. In a noninteractive terminal, review the JSON preview and rerun the same command with `--apply --confirm <confirmationToken>`. The token covers the exact MCP change and all four skill snapshots; changed destinations require a fresh preview. Without `--skills`, `init` keeps its existing MCP-only behavior. Without project flags, the original Codex MCP default remains its user configuration; combined skill setup uses the project's `.codex/config.toml` instead.

Already configured MCP? Install just the bundled skills, with no server-config changes:

```sh
motion-debugger skills install --client codex --project /absolute/path/to/app --apply
```

This previews before asking for `yes`. Omit `--apply` for a read-only preview, or use the exact preview token for a noninteractive apply. Replace `codex` with `claude-code`, `cursor` or `vscode` as needed.

The installer copies the complete named folders, including `references/` and `agents/`, to these project directories:

- Codex: `.agents/skills/`
- Cursor: `.cursor/skills/`
- Claude Code: `.claude/skills/`
- VS Code/Copilot: `.github/skills/`

Existing identical folders are retained. A folder with different contents or extra files is a collision: the entire operation stops before writing, rather than replacing your instructions. Preserve or move that folder yourself and preview again. Unrelated skills and MCP entries stay in place. Existing config files receive unique backups, file updates use atomic rename, and new complete skill folders are staged before installation. If the final MCP write fails, newly installed unchanged skills are rolled back. Symbolic-link destinations, ancestors and entries within skills are rejected; choose a real workspace path.

These commands change project files only after explicit approval. They do not bypass workspace trust, register a model endpoint or grant the agent extra permissions. Restart/reload your agent if its host needs that to discover new skills. Ask the agent to identify the selected skill and list `motion_capture`, `motion_frames`, `motion_inspect` and `motion_compare` before claiming the complete workflow is available. A successful install is not evidence that a host has loaded the skills or approved its MCP server.

The Codex plugin manifest also exposes `./skills/`; installing the built `plugin/motion-debugger` folder through your approved plugin workflow includes all four skills. Other compatible clients can load `SKILL.md` explicitly when automatic discovery differs. For manual copying, Codex/Cursor can also use `.agents/skills/`, and VS Code supports `.agents/skills/` or `.claude/skills/`; keep the complete folders and review collisions.

A direct starting prompt:

> Use motion-build-inspect-repair from the installed Motion Debugger skills. Build the requested page, inspect its actual running motion, repair observed defects in the requested source, and show the before/after evidence. Use motion-3d-ui when real 3D is required.

The environment must provide normal code-edit/build tools, access to the app preview and the Motion Debugger MCP server. Skills do not supply credentials, a model endpoint or permission to publish.

## What the evidence establishes

Recorded native PNG frames let the agent inspect internal scene motion. A canvas's unchanged DOM rectangle cannot prove its mesh animation is smooth. Optional projected landmarks and app marks are useful annotations; compare them with actual recorded images.

Repairs must follow observation and source diagnosis. There is no bundled oracle implementation to copy. A same-prompt with/without-plugin run must preserve independent agent outputs and actual tool traces; one example is not a general improvement guarantee.

## Attribution and validation

The design guidance selectively adapts concepts from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/ce26fc25c0e5e8cab638f883de62d9a86ee5e45b), with [exact provenance and the retained MIT notice](../plugin/motion-debugger/skills/motion-design/references/taste-provenance.md). This does not license the entire Motion Debugger project as MIT. Its private/UNLICENSED status is unchanged.

Check the packaged skill catalog without installing or changing editor settings:

```sh
node plugin/motion-debugger/scripts/check-skills.mjs
```

This checks this package's simple frontmatter, unique names, manifest directory and attribution files. It is not a behavioral benchmark. The distribution must also include those files in its packed artifact. `npm run test:cli` exercises all four workspace destinations, exact-token approval, collisions, symlink refusal, idempotence and late-write rollback in temporary projects. `npm run test:install` separately installs a fresh tarball and verifies its packaged skills and complete MCP-plus-skills setup. These are installer/protocol checks, not proof of discovery in every interactive agent host.

Sources checked 2026-10-02: [Codex skills](https://learn.chatgpt.com/docs/build-skills), [Claude Code skills](https://code.claude.com/docs/en/skills), [Cursor skills](https://cursor.com/docs/skills), [VS Code skills](https://code.visualstudio.com/docs/agent-customization/agent-skills). Keep normal workspace trust and approval controls enabled.
