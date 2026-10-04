# Design, build, inspect, repair

Motion Debugger combines portable agent skills with local motion evidence tools. The host agent writes and repairs code; the MCP server records and inspects the running result.

## Six focused skills

- `motion-debugger`: namespaced entry for protected transition authoring and native review; coexists with another `/motion` skill
- `motion`: normal design prompt entry point; routes to original runnable recipes, design guidance and browser verification
- `motion-design`: choose a brief-led visual direction, coherent typography/surfaces and complete interaction states
- `motion-3d-ui`: build original spatial scenes with the right renderer, deliberate camera/lighting, responsive controls and resource cleanup
- `motion-evidence`: capture, inspect recorded images and compare temporal contracts for an existing interaction
- `motion-build-inspect-repair`: own a prompt-to-page build, diagnose actual observed defects, repair source in scope and verify the same interaction again

For a new animated page, tag `motion` and give your ordinary website or app brief. It routes to design and 3D guidance only when relevant. For an existing temporal bug, start with `motion-evidence`.

For an existing design, prefer `$motion-debugger` and the [constrained transition authoring reference](../plugin/motion-debugger/skills/motion/references/transition-authoring.md). It retains actor bindings, explicit coordinates and clocks, phase dependencies, input policy, useful completion and protected design bytes. Native evidence and pose previews remain separately labeled.

The `motion` recipe catalog contains seven recipe IDs: springs, scroll chapters, articulated colonies, task handoffs, elapsed sequences, kinetic fields and reversible drawers. `motion_recipe` returns the exact packaged source and usage. The kinetic field owns interruptible pose channels and playback; your app supplies its geometry, materials, lighting and composition. Its returned sources also include original-object transition bindings/patterns and the browser-only scene observer built from the core adapter. Seven catalog IDs do not mean only seven source files.

## Install skills and MCP together

Build a local tarball from a reviewed checkout with `npm ci` followed by `npm pack`, then install the generated `motion-debugger-0.5.0.tgz` in a durable tools directory. The [client setup guide](CLIENTS.md#recommended-configuration-wizard) gives the installation commands; the [source quickstart](../README.md#quickstart) runs the built CLI directly. Then run this command **from the project you want the agent to work on**:

```sh
motion-debugger init --local
```

In an interactive terminal, choose Codex, Claude Code, Cursor or VS Code, keep the offered six-skill installation, review the exact project MCP destination and skill files, then type `yes` to apply. The browser download is a separate explicit choice. This is one guided setup for the evidence server **and** the design/build instructions. Keep the installed package in place because `--local` records its absolute runtime path.

For a known client or a different workspace, use an exact project-scoped preview:

```sh
motion-debugger init --client codex --local --skills --project /absolute/path/to/app
```

To apply interactively, add `--apply`. In a noninteractive terminal, review the JSON preview and rerun the same command with `--apply --confirm <confirmationToken>`. The token covers the exact MCP change and every planned skill snapshot; changed destinations require a fresh preview. Without `--skills`, `init` keeps its existing MCP-only behavior. Without project flags, the original Codex MCP default remains its user configuration; combined skill setup uses the project's `.codex/config.toml` instead.

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

Existing identical folders are retained. A differing `motion` folder is preserved and reported in `preservedSkills`; install and invoke the namespaced `motion-debugger` entry, whose project folder includes its own shipped recipes and references. Other named folders with different contents or extra files are collisions: the entire operation stops before writing. Preserve or move those folders yourself and preview again. Unrelated skills and MCP entries stay in place. Existing config files receive unique backups, file updates use atomic rename, and new complete skill folders are staged before installation. If the final MCP write fails, newly installed unchanged skills are rolled back. Symbolic-link destinations, ancestors and entries within skills are rejected; choose a real workspace path.

These commands change project files only after explicit approval. They do not bypass workspace trust, register a model endpoint or grant the agent extra permissions. Restart/reload your agent if its host needs that to discover new skills. Ask the agent to identify the selected skill and list `motion_review` together with `motion_capture`, `motion_frames`, `motion_inspect` and `motion_compare` before claiming the complete workflow is available. A successful install is not evidence that a host has loaded the skills or approved its MCP server.

The Codex plugin manifest also exposes `./skills/`; installing the built `plugin/motion-debugger` folder through your approved plugin workflow includes all six skills. Other compatible clients can load `SKILL.md` explicitly when automatic discovery differs. The native plugin namespaced entry reads its shared resources from the plugin's own `motion` folder. For manual project copying, keep both owned folders together; if a foreign `motion` folder already exists, use the CLI to create a self-contained namespaced copy. Codex/Cursor can also use `.agents/skills/`, and VS Code supports `.agents/skills/` or `.claude/skills/`; keep the complete folders and review collisions.

A direct starting prompt:

> $motion Build a distinctive launch page for a team of helpful agents, with an interactive spatial hero and polished transitions.

The environment must provide normal code-edit/build tools, access to the app preview and the Motion Debugger MCP server. Skills do not supply credentials, a model endpoint or permission to publish.

## What the evidence establishes

Recorded native PNG frames let the agent inspect internal scene motion. A canvas's unchanged DOM rectangle cannot prove its mesh animation is smooth. Optional projected landmarks and app marks are useful annotations; compare them with actual recorded images.

For one transition, keep at most three candidates (current, minimal revision, optional alternative staging) within one measured budget. Reject functional failures and changed protected bytes first. Compare meaning, response, trackability and visual preference separately with native capture/event/frame citations, or abstain. Save the last verified permitted source bytes, bindings and regression journey. The selection helper checks evidence correspondence and bounds; it does not judge taste or prove model perception.

Repairs must follow observation and source diagnosis. There is no bundled oracle implementation to copy. A same-prompt with/without-plugin run must preserve independent agent outputs and actual tool traces; one example is not a general improvement guarantee.

## Attribution and validation

The design guidance selectively adapts concepts from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/ce26fc25c0e5e8cab638f883de62d9a86ee5e45b), with [exact provenance and the retained MIT notice](../plugin/motion-debugger/skills/motion-design/references/taste-provenance.md). This does not license the entire Motion Debugger project as MIT. Its private/UNLICENSED status is unchanged.

Check the packaged skill catalog without installing or changing editor settings:

```sh
node plugin/motion-debugger/scripts/check-skills.mjs
```

This checks this package's simple frontmatter, unique names, manifest directory and attribution files. It is not a behavioral benchmark. The distribution must also include those files in its packed artifact. `npm run test:cli` exercises all four workspace destinations, exact-token approval, collisions, symlink refusal, idempotence and late-write rollback in temporary projects. `npm run test:install` separately installs a fresh tarball and verifies its packaged skills and complete MCP-plus-skills setup. These are installer/protocol checks, not proof of discovery in every interactive agent host.

Sources checked 2026-10-02: [Codex skills](https://learn.chatgpt.com/docs/build-skills), [Claude Code skills](https://code.claude.com/docs/en/skills), [Cursor skills](https://cursor.com/docs/skills), [VS Code skills](https://code.visualstudio.com/docs/agent-customization/agent-skills). Keep normal workspace trust and approval controls enabled.

OpenCode 1.x uses `--client opencode` and installs the six entries under `.opencode/skills/`. Load `motion-debugger` through OpenCode’s skill tool. See [client setup](CLIENTS.md#opencode).
