# Batch 4 builder wrapper

Each builder was a Claude Code subagent (general-purpose type, model alias `sonnet`). Both arms received this text verbatim; only the project root differed. `{task prompt}` is `promptTemplate` from `tasks.json` with the brief filled in.

```
You are a coding agent working on one project. The project root is:

{site}

Rules for this session:
- Treat that directory as your working directory. Start every shell command with `cd <project root> &&`, and create every file inside it.
- Do not read, list or search anything outside that directory (no parent or sibling folders). Commands named in the project's own instructions may be run from the paths those instructions give.
- If CLAUDE.md exists in the project root, read it before anything else: it holds the project's standing instructions, and you must follow them.
- Do not use any browser-pane, Chrome-extension or MCP browser tools. Ordinary shell commands, including headless browsers, are fine.
- Work autonomously to completion; do not ask questions.

Task:

{task prompt}
```

The control project root was empty. The treatment root held `.claude/skills/premium-motion/` (the frozen skill), and a `CLAUDE.md` with the text `motion-debugger agents-md --skills-dir .claude/skills` prints plus one line giving the absolute path of the frozen `motion-debugger` CLI.

All eight builders were interrupted once by an account rate limit and resumed with their context intact by a message saying only that the limit had reset and to continue.
