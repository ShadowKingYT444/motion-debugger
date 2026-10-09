# Premium-motion A/B: does the plugin make agents build better motion sites?

**Result:** with the plugin installed, Sonnet 5.5 builder agents produced sites that blinded judges rated more premium in 12 of 16 matched pairs. Control was rated higher in 2 pairs. The overall-premium score rose by 1.0 on a 10-point scale (exact sign-flip p = 0.005).

The gain shows up mainly in:

- motion quality: +1.34, p = 0.0004
- mobile robustness: +1.0, p = 0.02

Visual design (+0.34) and hover polish (+0.34) did not reach significance. The plugin mostly turns ambitious-but-unseen builds into ones that were actually looked at and fixed, rather than changing the agents' taste.

## Design

| | |
| --- | --- |
| Builders | Claude Code subagents on **Sonnet 5.5**, general-purpose agent type, one fresh agent per site |
| Briefs | 4 premium marketing sites (`tasks.json`): Halo, a speaker launch; Ledgerline, a dev-first payments API; Atelier Norr, an architecture portfolio; Drift, an AI sleep app |
| Arms | **control**: an empty project. **treatment**: the same prompt plus what an installation provides, namely the `premium-motion` skill folder, a one-paragraph `CLAUDE.md` pointer (the text `motion-debugger agents-md` prints) and the `motion-debugger` CLI |
| Prompt | Identical in both arms ([`tasks.json`](tasks.json)). It asks for a top-tier site with high-quality motion, as a static `index.html` with CSS/JS. CDN fonts and libraries are allowed; external images are not |
| Replication | 2 seeds × 4 briefs × 2 arms per batch, 2 batches, so **32 sites and 16 matched pairs** |
| Plugin versions | Batch 1 used snapshot v1 (commit `fee3e29`). Batch 2 used snapshot v2 (commit `fea0080`), after fixing a kit bug and critic false positives that batch-1 agents surfaced. Snapshot hashes are in `results/batch*/plugin-snapshot-hashes.txt` |
| Judges | **Opus 5.5** subagents, a different model from the builders, one per packet. They saw only neutral contact sheets rendered by the same recorder for both arms: entrance timeline, scroll journey, hover crops and mobile. No source code, critic findings or arm labels |
| Blinding | Each pair was judged **twice with A/B swapped**, under unrelated packet ids in shuffled order. The key was sealed outside the judges' readable paths. Prompt: [`JUDGE_PROMPT.md`](JUDGE_PROMPT.md) |
| Statistics | The pair is the unit of analysis, averaging its two judgments. The test is an exact two-sided sign-flip permutation over 16 pairs ([`combine.mjs`](combine.mjs)) |

The control arm was a strong baseline. Every control agent read the brief and built ambitious pages: GSAP/Lenis, canvas, pinned stories and Web Audio. **Eight of the 16 controls screenshotted their own pages with headless Chrome** on their own initiative. The treatment's advantage is therefore not just "having a browser".

## Results (16 pairs, 32 blinded judgments)

| Dimension (judge score 1–10) | Treatment − control (mean per pair) | Pairs favoring treatment / control | p (two-sided) |
| --- | --- | --- | --- |
| Overall premium | **+1.00** | 12 / 2 | **0.005** |
| Motion quality | **+1.34** | 14 / 1 | **0.0004** |
| Mobile robustness | **+1.00** | 9 / 3 | **0.02** |
| Visual design | +0.34 | 8 / 2 | 0.07 |
| Interaction polish | +0.34 | 6 / 5 | 0.36 |

- **Head-to-head winner:** treatment 23, control 8, tie 1 across 32 judgments. Pair preference favored treatment in 10 pairs and control in 2, with 4 even (p = 0.039).
- **By batch:** batch 1 had a mean overall Δ of +1.19 (8 pairs). Batch 2 had +0.81 (8 pairs) against controls that self-checked more often.
- **By brief:**
  - Norr: +2.38. Controls used long preloaders, cursor blobs over labels, and a hero still masked at 3 s.
  - Halo: +0.63.
  - Ledgerline: +0.63.
  - Drift: +0.38.
- **Position bias:** judges picked B 20 times and A 11. The swapped duplicates cancel this by construction.

Full per-pair data is in [`results/combined.json`](results/combined.json). Every verdict and rationale is in `results/batch*/judgments/`, and the sealed keys are in `results/batch*/packet-key.json`.

### What the judges saw differently

Rationales repeatedly cite the failure modes the critic is built to surface:

- **Blank or held entrances.** Controls showed 2–4 s preloaders, heroes still masked at 3 s, or a "flash of content, blank, rebuild" sequence.
- **Mobile defects.** Overlapping quotes, cards covering headings, sticky controls covering copy, and long empty bands.
- **Custom-cursor hover states** that hide button labels.

Treatment sites more often had:

- a staggered hero settled by about 1.3–1.9 s
- a pinned scroll-linked "signature" sequence
- clean phone layouts

Controls sometimes won on boldness: richer colour, more expressive hovers, and bigger wordmarks.

### Treatment agents fixed real defects they could not otherwise see

From their own reports, critique passes made treatment agents fix:

- content that never appeared: project panels and footers behind clip reveals, mobile story steps, hero visuals
- mobile horizontal overflow
- hero overlap with CTAs
- low-contrast text
- animated `max-height`/`width`
- slow hover transitions
- 4.6 s entrances
- missing hover states and tap targets

Three batch-1 agents independently hit the same kit bug: `data-reveal="clip"` never fired, because a fully clipped element reports intersectionRatio 0. That bug was fixed for batch 2 and is covered by a regression fixture.

## Objective lint (secondary, not independent)

The critic measured every site after the fact. The treatment iterated against this lint, so these numbers show that agents used it, not that it is an unbiased quality metric. The blinded judgments above are the primary outcome.

All 32 sites were recorded with the final critic (`results/batch1/metrics-final-instrument.json`, `results/batch2/metrics.json`).

| Metric | Control (16 sites) | Treatment (16 sites) |
| --- | --- | --- |
| Critic score, mean (0–100) | 53.4 | 96.1 |
| Sites with any blocker | 7 | 0 |
| Sites with any blocker or major finding | 16 | 0 |
| Distinct controls with hover feedback | 71% | 86% |
| Cumulative layout shift, mean | 0.44 | 0.01 |
| Top-level sections with motion | 94% | 98% |

The most common control findings were:

| Finding | Control sites (of 16) |
| --- | --- |
| Layout properties animated | 16 |
| Ambient-loop overload | 11 |
| Small tap targets | 11 |
| Entrance over 2.6 s | 10 |
| Small mobile text | 10 |
| Silent controls | 9 |
| Low contrast | 9 |
| Layout shift | 4 |
| Content that never appears (desktop or mobile) | 4 |
| Mobile overflow | 2 |

## Threats to validity

- **Judges are models.** Opus 5.5 judges are a different model from the Sonnet 5.5 builders, and both arms share a builder, so self-preference cannot favor an arm. No human panel was run.
- **Judges saw stills, not video.** The entrance is sampled for 3 s, so one site's slow preloader read as a blank hero.
- **Same designer.** The briefs, skill, critic and judge rubric come from one designer, so the rubric may echo the skill's values. The critic's findings were never shown to judges, and the rubric is generic award-jury language.
- **Instrument changes.** Recorder and critic changed during the study, removing false positives that unfairly hurt controls. Every site in a batch was re-recorded with one instrument before packets were built. Judging used images, which those changes do not affect.
- **Scale.** 16 pairs, one builder model and one host (Claude Code). The plugin is host-neutral by construction, but a live A/B on Codex, Cursor, OpenCode or Gemini CLI was not run. Those CLIs were not authenticated in this environment.

## Reproduce

```bash
# workspaces + agents (any host: --agent claude|codex|opencode|gemini)
node studies/premium-ab/run.mjs --root /tmp/ab --agent claude --model claude-sonnet-5-5 --seeds 1,2 --cli $(pwd)/build/cli/index.js --parallel 8
# neutral recordings, blinded packets, verdicts, summary
node --import tsx studies/premium-ab/evaluate.mjs record   --root /tmp/ab --out /tmp/eval
node --import tsx studies/premium-ab/evaluate.mjs packets  --root /tmp/ab --out /tmp/eval --seed 7
#   ... one judge per packet using JUDGE_PROMPT.md, writing <judgments>/<packet>.json ...
node --import tsx studies/premium-ab/evaluate.mjs summarize --out /tmp/eval --key /tmp/eval/packet-key.json --judgments /tmp/eval/judgments
node studies/premium-ab/combine.mjs /tmp/eval/results.json [more batches...]
```

In this study the builders and judges were launched as Claude Code subagents rather than through `run.mjs`. The session's permission policy blocked nested `claude -p` sessions with permission bypass. The prompts were identical, and the agents were told to stay inside their workspace and not to use browser-pane tools.
