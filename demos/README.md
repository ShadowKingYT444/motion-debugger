# Premium-motion demos

There are two sets of demos here. Keep them apart: they answer different questions.

## Agent upgrades: vibe-coded to premium

Each brief's `control` site below is a vibe-coded page: Sonnet 5.5 built it from a one-paragraph brief with no plugin. A fresh Claude Code agent (Opus 5.5) then ran the premium-motion `upgrade` command on a copy of it, with the prompt recorded in [`upgrades.json`](upgrades.json). The result is in `upgraded/`, next to the `PREMIUM.md` direction file the agent wrote. These are single runs chosen to show the workflow, not a blinded comparison. Nobody edited the upgraded sites by hand. The Ledgerline run was the pilot: it found that GSAP's `pin: true` measures as a large layout shift, the skill was changed to sticky stages, and the other three ran on the changed skill (`upgrades.json` records each version).

| Brief | Film | Before | After |
| --- | --- | --- | --- |
| Ledgerline: payments API | [upgrade.mp4](ledgerline/upgrade.mp4) | [ledgerline/control](ledgerline/control/index.html) | [ledgerline/upgraded](ledgerline/upgraded/index.html) |
| Drift: AI sleep coach | [upgrade.mp4](drift/upgrade.mp4) | [drift/control](drift/control/index.html) | [drift/upgraded](drift/upgraded/index.html) |
| Halo: wireless speaker launch | [upgrade.mp4](halo/upgrade.mp4) | [halo/control](halo/control/index.html) | [halo/upgraded](halo/upgraded/index.html) |
| Atelier Norr: architecture studio | [upgrade.mp4](norr/upgrade.mp4) | [norr/control](norr/control/index.html) | [norr/upgraded](norr/upgraded/index.html) |

Re-record them with `node demos/record.mjs --manifest demos/upgrades.json`. Only `norr/upgrade.gif`, which the main README shows, is committed; the other GIFs are left out to keep the repository small.

## The A/B study: building with and without the plugin

Four briefs. Each was given to two fresh **Sonnet 5.5** agents with the identical prompt. One worked in an empty project. The other had the `premium-motion` skill (v4), the motion kit and the critique loop, with a one-paragraph pointer to them. These are the seed-1 pairs of study batch 4, chosen before judging. Nothing here was edited by hand after the agents finished, apart from removing the skill copy and `CLAUDE.md` from the treatment folders.

Each brief also has `compare.jpg`: the hero after the entrance and three points down the page for both sites, taken from the study's recordings.

| Brief | Film | Without the plugin | With premium-motion |
| --- | --- | --- | --- |
| Atelier Norr: architecture studio | [comparison.mp4](norr/comparison.mp4) | [norr/control](norr/control/index.html) | [norr/treatment](norr/treatment/index.html) |
| Halo: wireless speaker launch | [comparison.mp4](halo/comparison.mp4) | [halo/control](halo/control/index.html) | [halo/treatment](halo/treatment/index.html) |
| Ledgerline: payments API | [comparison.mp4](ledgerline/comparison.mp4) | [ledgerline/control](ledgerline/control/index.html) | [ledgerline/treatment](ledgerline/treatment/index.html) |
| Drift: AI sleep coach | [comparison.mp4](drift/comparison.mp4) | [drift/control](drift/control/index.html) | [drift/treatment](drift/treatment/index.html) |

## Watch them

```sh
motion-debugger demo        # then open http://127.0.0.1:4173/ab/
```

The viewer plays each film and opens either site live. From a checkout you can also serve this folder with any static server, for example `npx serve demos`. The sites load Google Fonts, and some controls load GSAP or Lenis from a CDN, so they need a network connection.

## How the films are made

`node demos/record.mjs` drives each site in Chromium at 1440×900 with an identical script:

1. Load the page and watch the entrance for 3.5 s.
2. Sweep the pointer across the hero.
3. Scroll to the end with real wheel input, 44 px every 40 ms.
4. Hold the last frame for 1.5 s.

Frames are Chromium's own compositor frames (CDP screencast), resampled to 30 fps and placed side by side. The site that finishes first holds its last frame. Pages that install smooth-scroll libraries (Lenis) turn the same wheel input into slower travel, which is why some control films run longer. CI re-records the films from these committed sites on every push and uploads them as build evidence.

The blinded judging of these four pairs, and the earlier 16-pair study, are in [`studies/premium-ab`](../studies/premium-ab/README.md).
