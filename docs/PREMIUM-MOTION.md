# Premium motion: skill + critic

Motion Debugger's main path for building pages has two pieces, and both work with any coding agent:

1. **The `premium-motion` skill**: one skill, in the open Agent Skills format, with a command vocabulary for upgrading a page. Agents run a named command on a target (`upgrade the landing page`, `signature the how-it-works section`, `polish pricing`).
   - **`SKILL.md`** routes the commands. It names the two defaults agents fall into: the AI template, and the "anti-template template" of pale grey, giant plain type, hairline tables and no imagery. It also describes what premium actually is, picks the motion stack, and runs the critique loop.
   - **`commands/`** holds one playbook per command. `upgrade` is the full pipeline: baseline critique, inventory, direction, the first viewport alone, a section-by-section rebuild, the signature scene, finish, then verifying against the baseline. The others are `audit`, `direction`, `motion`, `signature`, `typeset`, `palette`, `imagery`, `compose`, `polish` and `harden`.
   - **`PREMIUM.md`** is the per-project context file `direction` writes and every command reads: audience, facts, world artefacts, type, colour, imagery, motion personality and the motion score.
   - **`TASTE.md`** covers motion: one personality chosen from the brief's tension (Silk, Kinetic, Cinematic or Soft), one signature scroll scene finished to the last frame, at most two supporting scenes, short pins that always change, and a written motion score.
   - **`references/motion-stack.md`** is a complete GSAP + ScrollTrigger + SplitText + Lenis setup for plain HTML. `references/frameworks.md` maps every primitive to Motion (framer-motion), GSAP and Next.js. Both are browser-tested in CI.
   - **The motion kit** (`assets/motion-kit.js` and `assets/motion-kit.css`, no dependencies) gives the same moves as data attributes for small pages: reveals, split type, counters that never show 0, `data-progress` storytelling, horizontal tracks, stacking cards, expanding media, chapter colours and more, each with a reduced-motion fallback. It wires elements that mount later in React or Next.js apps.
2. **`motion-debugger critique`**: gives the agent eyes. It opens a local page in Chromium at desktop (1440×900) and mobile (390×844), records the entrance timeline, smooth-scrolls the whole page, hovers each distinct control, tabs through focus, and repeats with `prefers-reduced-motion: reduce`. It returns findings with concrete fixes and writes images the agent is told to open:

   | Image | Shows |
   | --- | --- |
   | `craft.png` | Finish defects measured in the real frames, each outlined on a crop |
   | `desktop-entrance.png` | The first viewport from about 80 ms to 3 s |
   | `desktop-scroll.png` | The whole scroll journey at a glance |
   | `desktop-detail-1..3.png` | The same frames four at a time, large enough to judge type, spacing and alignment |
   | `hover.png` | Each control at rest and on hover |
   | `mobile.png` | The phone layout |

   It also writes `report.json`.

## What the critic checks

**Motion and interaction.** The critic records what actually moved: Web Animations, CSS transitions and keyframes, inline-style and custom-property motion driven from JavaScript, and class-toggled reveals. It checks entrance presence, stagger and length; whether motion reaches every top-level section; the easing mix (linear movement, default `ease`, ease-in entrances); durations; animated layout properties; ambient-loop overload; hover response and whether it transitions; and visible keyboard focus.

**Robustness.** Content still invisible after a full scroll (the most common agent bug), reduced-motion handling, mobile overflow and clipped text, tap targets, contrast against what is actually painted, typeface fallback, headline hierarchy, line length, layout shift, scroll frame drops and runtime errors.

**Finish (craft).** At every settled scroll stop, desktop and a denser phone sweep, a DOM sampler measures the elements fully in view, and the captured frame itself is analysed for what was drawn. Each defect keeps the frame and rectangle it was seen in, so `craft.png` shows it outlined.

| Finding | What is measured |
| --- | --- |
| `text-collision` | Two pieces of copy painted over each other (ink cores overlap; covered or clipped text does not count) |
| `copy-under-sticky` | Copy that scrolls underneath an opaque `position: sticky` panel while in view |
| `shrunken-text` | Glyphs drawn at under half their font size, from a scale transform that never finished |
| `hollow-containers` | A bordered or filled box with a full-width empty band covering 38% or more of its height |
| `dead-space` | A captured screen where over half the height has no edges drawn (soft gradients count as empty) |
| `near-miss-alignment` | A vertical stack whose items almost share a left edge (1.5–16 px apart) |
| `edge-crowding` | Copy closer than 14–16 px to the screen edge outside moving tracks and scrollers |
| `double-spaced-code`, `clipped-code` | A blank line between every code line; code cut off at its panel edge |
| `mismatched-buttons`, `orphan-headings`, `placeholder-content` | Buttons in one row 2–16 px apart in height; a heading whose last line is one short word; lorem ipsum, `.example` addresses, zeroed phone numbers |

**Template likeness.** On the settled first viewport the critic counts nine traits of the landing page coding agents build by default: an Instrument Serif or Fraunces display face; an Inter, Inter Tight, Manrope or Geist text face; an italic accent word in the headline; a near-black or warm-paper ground; a small uppercase eyebrow above the headline; headline left with an object right; pill buttons; a grain overlay; and a marquee. Five or more traits produce a `default-template` advisory. A page can earn every trait; the point is that it should not get them by default.

**Progress.** Each run is compared with the newest earlier report for the same target in the same parent folder: the score before and after, which findings were fixed, which are new, and how many remain.

The score is a lint, not a taste judgment. The skill tells the agent to look at the images and to answer five design-director questions about every frame.

## Use it from any agent

| Host | How |
| --- | --- |
| Anything with a shell (Claude Code, Codex, Cursor agent, OpenCode, Gemini CLI, Aider, Copilot agent, CI) | Run `motion-debugger critique ./site`, or `critique http://127.0.0.1:5173` for a running dev server |
| MCP hosts | `motion_critique` returns the Markdown findings plus `craft.png`, the contact sheets and detail sheets as image content, with `craft`, `template` and `progress` in its structured result |
| Skills-aware hosts | `motion-debugger skills install --client codex\|claude-code\|cursor\|vscode\|opencode --project <app>` installs `premium-motion` with the existing skills |
| Any host with standing instructions | `motion-debugger agents-md --skills-dir <dir>` prints a short block for `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` or `.cursorrules` |

Nothing in the skill or the CLI depends on a model provider. The critic is a local Playwright/Chromium program that prints Markdown or JSON (`--json`). The skill is Markdown plus two static assets.

### Options

```text
motion-debugger critique <url|index.html|folder> [--out dir] [--json] [--offline] [--desktop-only]
                         [--fail-on blocker|major|minor|polish] [--github] [--open]
```

- **Targets:** a loopback URL, or a local path. A path is served on an ephemeral `127.0.0.1` port.
- **Network:** pages may load passive GET resources (fonts, stylesheets, scripts, images) from CDNs, as ordinary local development pages do. Every other external request is blocked. `--offline` blocks all external requests.
- **Output:** reports go to `.motion-critique/<timestamp>/` unless you pass `--out`. Runs in the same parent folder are compared with each other.
- **CI gate:** `--fail-on <severity>` exits with code 2 when any finding is at or above that severity (`--fail-on major` fails on blocker and major findings). Code 1 still means the page could not be scanned, and without the flag a completed scan exits 0. Headless is the default, so nothing else is needed in CI. Start with `--fail-on blocker`: blockers are outcome checks (content that never appears, a phone page that scrolls sideways), while `scroll-jank` is a major finding that depends on frame timing and can vary on shared runners.
- **GitHub Actions:** `--github` prints one annotation per finding (`::error` for blocker and major, `::warning` for minor, `::notice` for polish) followed by a summary line, in place of the Markdown report. It cannot be combined with `--json`.
- **Open the result:** `--open` opens `craft.png`, or the desktop scroll sheet when there are no finish defects, in your image viewer. It does nothing when the output is not an interactive terminal.

```yaml
# .github/workflows/motion.yml (after starting your dev server)
- run: npx -y -p https://github.com/ShadowKingYT444/motion-debugger/releases/latest/download/motion-debugger.tgz motion-debugger setup --browser
- run: npx -y -p https://github.com/ShadowKingYT444/motion-debugger/releases/latest/download/motion-debugger.tgz motion-debugger critique http://localhost:3000 --github --fail-on blocker
```

### Limits

- Headless frame timing is indicative only.
- Contrast is skipped over background images and gradients.
- Section coverage uses top-level blocks, so a page with one giant wrapper can over- or under-count.
- Hover testing covers up to 12 distinct controls.
- Finish checks see only elements fully inside a captured screen. The desktop journey captures about a dozen screens and the phone sweep up to sixteen, so a long page is sampled, not exhaustively covered.
- Pixel checks read edges, not meaning: a deliberately minimal frame (one line of type on a plain ground) can count as dead space, and a busy texture can hide it.
- Template likeness counts traits; it says nothing about how well they are executed.
- Contact sheets are sampled stills, not video. They show sequencing and end states, not curve smoothness.
