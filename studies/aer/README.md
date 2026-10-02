# AER: an agent builds, observes and repairs

A matched product brief, two independent coding agents and preserved source before and after inspection. AER is a fictional desk-fan concept with real procedural 3D.

- [Exact prompt](PROMPT.md)
- [Method and limitations](METHOD.md)
- `baseline/initial`: ordinary coding agent, without these experimental skills/tools
- `treatment/initial`: design/3D/workflow skills plus actual Motion MCP evidence

Both agents receive ordinary browser observations. The treatment also requests actual temporal captures, bounded trace inspection and recorded native image frames. The coordinator executes those requests in CI and returns raw evidence; each agent decides its own source changes.

The complete final comparison is still being verified. Initial source snapshots are immutable; SHA256 manifests identify the bytes. No initial/fixed toggle or repair implementation was given to the builders.

## Reproduce an individual snapshot

From a snapshot directory:

```sh
npm ci
npm run dev -- --port 4174
```

Use a fresh credential-free browser profile. All geometry is procedural; there are no external image or model APIs. Dependency installation requires registry access. Each app's package and lockfile retain the independently selected dependency versions.

## Evidence

The `Paired agent study` workflow executes the committed requests and uploads screenshots, screen recordings, DOM observations, command logs and real MCP responses as a GitHub Actions artifact. A workflow's success means the evidence collection completed, not that every observed interaction passed.

`ordinary-browser.json` distinguishes assertions from observations. `execution.json` records actions and app-supplied state; those annotations are not independent measurements. For 3D, an unmoving canvas rectangle cannot establish mesh smoothness. Inspect the video-derived images.

This single paired case is not a statistical benchmark or a guarantee of improvement. Neither output was intentionally degraded.
