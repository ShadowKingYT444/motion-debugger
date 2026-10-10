# Premium-motion demos

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
