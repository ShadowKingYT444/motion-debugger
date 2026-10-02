# Design, build, inspect, repair

Motion Debugger combines portable agent skills with local motion evidence tools. The host agent writes and repairs code; the MCP server records and inspects the running result.

## Four focused skills

- `motion-design`: choose a brief-led visual direction, coherent typography/surfaces and complete interaction states
- `motion-3d-ui`: build original spatial scenes with the right renderer, deliberate camera/lighting, responsive controls and resource cleanup
- `motion-evidence`: capture, inspect recorded images and compare temporal contracts for an existing interaction
- `motion-build-inspect-repair`: own a prompt-to-page build, diagnose actual observed defects, repair source in scope and verify the same interaction again

For a new animated page, start with `motion-build-inspect-repair`. It routes to design and 3D guidance only when relevant. For an existing temporal bug, start with `motion-evidence`.

## Load skills as well as MCP

`motion-debugger init` configures the evidence server. It does **not** copy skills into your editor. A working MCP handshake alone therefore does not activate design/build instructions.

The Codex plugin manifest exposes `./skills/`; installing the built `plugin/motion-debugger` folder through your approved plugin workflow includes all four skills. Actual host installation still needs confirmation in that host.

For a workspace-level skill installation, copy the complete named skill folders from `plugin/motion-debugger/skills/` into your client's supported project skill directory. Keep `references/` and `agents/` inside each folder. Preserve existing skills; review a collision rather than replacing unrelated instructions.

- Codex: `.agents/skills/`
- Cursor: `.agents/skills/` or `.cursor/skills/`
- Claude Code: `.claude/skills/`
- VS Code/Copilot: `.github/skills/`, `.agents/skills/` or `.claude/skills/`

These directories are relative to the project you want the skills to affect. After loading, ask the agent to identify the selected skill and list `motion_capture`, `motion_frames`, `motion_inspect` and `motion_compare` before claiming the complete workflow is available. Other compatible clients can load the SKILL.md files explicitly even when their automatic skill discovery differs.

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

This checks this package's simple frontmatter, unique names, manifest directory and attribution files. It is not a behavioral benchmark. The distribution must also include those files in its packed artifact.

Sources checked 2026-10-02: [Codex skills](https://learn.chatgpt.com/docs/build-skills), [Claude Code skills](https://code.claude.com/docs/en/skills), [Cursor skills](https://cursor.com/docs/skills), [VS Code skills](https://code.visualstudio.com/docs/agent-customization/agent-skills). Keep normal workspace trust and approval controls enabled.
