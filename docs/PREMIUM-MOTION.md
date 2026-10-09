# Premium motion: skill + critic

Motion Debugger's main path for building pages is two pieces that work with any coding agent:

1. **`premium-motion` skill**: concrete craft guidance in the open Agent Skills format.
   - **`TASTE.md`** sets the ambition and keeps it coherent. The agent picks one motion personality (Silk, Kinetic, Cinematic or Soft), writes a motion score per chapter before coding, and meets an ambition floor: a layered hero that exits on scroll, at least two different scrubbed scroll scenes, chapter transitions, a kinetic type moment, a living visual, and tactile micro-interactions.
   - **`SKILL.md`** covers art direction, the type, space and surface system, motion tokens, choreography and robustness rules, and the critique loop.
   - **The motion kit** (`assets/motion-kit.js` and `assets/motion-kit.css`, no dependencies) turns those scenes into data attributes: reveals, split and scrambled type, counters, `data-progress` storytelling, horizontal tracks (`data-hscroll`), stacking cards (`data-stack`), expanding media (`data-expand`), hero exits (`data-exit`), reading highlights (`data-read`), path drawing (`data-draw`), chapter colour themes (`data-bg`/`data-ink`), a scroll `--velocity`, parallax, magnetic, spotlight, tilt and marquee. Each has a reduced-motion fallback, and the horizontal track becomes a swipe row on phones.
   - **`references/patterns.md`** has complete code for bespoke moments.
2. **`motion-debugger critique`**: gives the agent eyes. It opens a local page in Chromium at desktop (1440×900) and mobile (390×844), then:
   - records the entrance timeline
   - smooth-scrolls the whole page
   - hovers each distinct control
   - tabs through focus
   - repeats the journey with `prefers-reduced-motion: reduce`

   It returns lint findings with concrete fixes and writes contact sheets the agent is told to open:

   | Contact sheet | Shows |
   | --- | --- |
   | `desktop-entrance.png` | The first viewport from about 80 ms to 3 s |
   | `desktop-scroll.png` | Each viewport about 700 ms after a scroll step |
   | `hover.png` | Each control at rest and on hover |
   | `mobile.png` | The phone layout |

   It also writes `report.json`.

The critic records what actually moved: Web Animations, CSS transitions and keyframes, inline-style and custom-property motion driven from JavaScript, and class-toggled reveals. It checks:

- **Choreography:** entrance presence, stagger and length; whether motion reaches every top-level section on scroll; easing mix (linear movement, default `ease`, ease-in entrances); durations; animated layout properties; ambient-loop overload
- **Interaction:** hover response and whether it transitions; visible keyboard focus
- **Robustness:** content still invisible after a full scroll (the most common agent bug), reduced-motion handling, mobile overflow and clipped text, tap targets, contrast, typeface fallback, headline hierarchy, line length, layout shift, scroll frame drops and runtime errors

The score is a lint, not a taste judgment. The skill tells the agent to look at the images and judge craft itself.

## Use it from any agent

| Host | How |
| --- | --- |
| Anything with a shell (Claude Code, Codex, Cursor agent, OpenCode, Gemini CLI, Aider, Copilot agent, CI) | Run `motion-debugger critique ./site`, or `critique http://127.0.0.1:5173` for a running dev server |
| MCP hosts | `motion_critique` returns the markdown findings plus the contact sheets as image content |
| Skills-aware hosts | `motion-debugger skills install --client codex\|claude-code\|cursor\|vscode\|opencode --project <app>` installs `premium-motion` with the existing skills |
| Any host with standing instructions | `motion-debugger agents-md --skills-dir <dir>` prints a short block for `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` or `.cursorrules` |

Nothing in the skill or the CLI depends on a model provider. The critic is a local Playwright/Chromium program that prints Markdown or JSON (`--json`). The skill is Markdown plus two static assets.

### Options

```text
motion-debugger critique <url|index.html|folder> [--out dir] [--json] [--offline] [--desktop-only]
```

- **Targets:** a loopback URL, or a local path. A path is served on an ephemeral `127.0.0.1` port.
- **Network:** pages may load passive GET resources (fonts, stylesheets, scripts, images) from CDNs, as ordinary local development pages do. Every other external request is blocked. `--offline` blocks all external requests.
- **Output:** reports go to `.motion-critique/<timestamp>/` unless you pass `--out`.

### Limits

- Headless frame timing is indicative only.
- Contrast is skipped over background images and gradients.
- Section coverage uses top-level blocks, so a page with one giant wrapper can over- or under-count.
- Hover testing covers up to 12 distinct controls.
- Contact sheets are sampled stills, not video. They show sequencing and end states, not curve smoothness.
