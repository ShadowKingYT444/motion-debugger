# Local API contract

The source of truth is `src/types.ts`. Server uses same origin, default port 4173.

- `GET /api/health` returns `{ok:true, version:'0.1.0'}`
- `GET /api/runs` returns `{runs: RunSummary[]}` newest first
- `POST /api/runs` accepts `{fixture:'key-remount',delayMs:350}` and returns status 202 `{id,status:'queued'}`. Allowlisted fixture only; delay integer 150–800 ms. Busy returns 409. No URL or source-code input is accepted
- `GET /api/runs/:id` returns RunReport. Poll at 1s while queued/running; runs take about 7–12 seconds
- `GET /artifacts/runs/:id/{baseline|fixed}/{video.webm|poster.png|final.png}` serves browser capture artifacts
- `GET /api/source?file=src/fixture/Fixture.tsx` returns `{file,content}` for the allowlisted fixture only
- `GET /fixture?mode=baseline|fixed&delay=350` is the runnable controlled fixture

Timeline time zero is the instrumented click. Video starts before the click; seek using `sample.t + media.videoOffsetMs`. Negative trace times cover setup. `samples` contains real rAF geometry, not extrapolated animation curves. Node identity is assigned by WeakMap. `origin` distinguishes browser observation from application marks. Final state is captured from the app and independently checked in DOM. Source annotations are explicit fixture mappings, not inferred source attribution.
