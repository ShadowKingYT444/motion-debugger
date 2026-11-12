# Contributing to Motion Debugger

Thanks for helping. Motion Debugger has two halves: a design skill that agents read (Markdown plus a small motion kit) and a critic that opens pages in a real browser (TypeScript plus Playwright). You can contribute to either without touching the other.

**New here?** Browse the [open issues](https://github.com/ShadowKingYT444/motion-debugger/issues); a false positive from the critic, with the page that triggered it, is one of the most useful reports. Ask questions in [Discussions](https://github.com/ShadowKingYT444/motion-debugger/discussions) before you start anything large.

## Set up (about five minutes)

You need Node.js 22 or later and git.

```sh
git clone https://github.com/ShadowKingYT444/motion-debugger.git
cd motion-debugger
npm ci
npx playwright install chromium     # Linux may also need: npx playwright install-deps chromium
npm run build
npm test                            # fast unit tests, no browser
```

Try the critic on one of the committed demo sites:

```sh
node build/cli/index.js critique demos/ledgerline/control
```

## Where things live

| Path | What it is | Good for |
| --- | --- | --- |
| `plugin/motion-debugger/skills/premium-motion/` | The skill agents read: `SKILL.md` (the router), one playbook per command in `commands/`, `TASTE.md`, the GSAP stack and code patterns in `references/`, the motion kit in `assets/` | Commands, design guidance, motion code, framework notes |
| `packages/core/critique*.ts` | The page critic: recording, findings, contact sheets, finish checks | New checks, fewer false positives |
| `packages/cli/` | The `motion-debugger` command: install, configuration, diagnostics | Install experience, new flags |
| `packages/mcp/` | The MCP server (stdout carries JSON-RPC only) | MCP tools |
| `tests/` | Unit, install, browser and transport tests | Coverage for anything above |
| `demos/` | Agent-built control/treatment sites and their films | Do not hand-edit these; they are evidence |
| `studies/premium-ab/` | The blinded A/B harness and its results | Do not edit past results |

## Making a change

1. Branch from `main` and keep the change focused on one thing.
2. Add or update a test. New critic checks need a seeded fixture that triggers them and a clean page that does not.
3. Run the checks that cover what you touched:

   | You changed | Run |
   | --- | --- |
   | Anything | `npm run check` (build, typecheck and all fast suites) |
   | The critic | `npm run test:critique` and `npm run test:critique:browser` |
   | Installation or the CLI | `npm run test:cli` and `npm run test:install` (packs a tarball and installs it outside the source tree) |
   | The skill or motion kit | `npm run test:packages`, `npm run test:stack:browser` and `npm run test:kit:browser`, then critique a page built with it |
   | Motion recording | The matching `test:*:browser` suite in `package.json` |

4. Open a pull request. Say what you changed, how you tested it and on which commit. CI runs every browser suite; it takes about 20 minutes.

## Ground rules

These keep the tool honest. Reviews will hold you to them.

- **Never fake a measurement.** Findings come from a real browser. Do not hardcode passing results, generate traces, or loosen a threshold just to make CI pass.
- **Show visual changes.** Attach desktop and mobile screenshots, and a recording for anything that moves. For motion, test interruption, reversal, replay, the final state and reduced motion.
- **Installation must be previewable and recoverable.** Preserve users' other files and MCP entries, handle paths with spaces, and test in an isolated home and project directory.
- **Local pages only.** The critic captures trusted, credential-free local development pages. Never import a personal browser profile.
- **Label seeded defects.** Test fixtures with deliberate bugs must say so.
- **No secrets or private recordings in commits.** Use synthetic or public fixture content.

## Reporting bugs and ideas

- **Bug:** open an issue with the command you ran, what you expected, what happened, your OS and Node version, and the output of `motion-debugger doctor`. If the critic got a page wrong, attach `craft.png` or the relevant contact sheet.
- **False positive or missed defect:** these are the most useful reports we get. Include a minimal HTML page that reproduces it.
- **Idea or question:** start a [Discussion](https://github.com/ShadowKingYT444/motion-debugger/discussions).
- **Security issue:** follow [SECURITY.md](SECURITY.md); do not open a public issue.

## Releases

Maintainers cut releases. Do not claim an npm version exists until the registry serves that exact version, and verify a packed tarball outside the source tree before release.

By contributing you agree that your contributions are licensed under the [MIT License](LICENSE).
