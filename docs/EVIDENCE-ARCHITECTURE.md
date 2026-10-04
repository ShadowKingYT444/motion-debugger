# Temporal evidence and lifecycle coverage

The core, CLI and MCP use one recorder and analyzer. The saved AER studies and
their old tool runtime remain frozen; the new drawer source-repair case is not
a controlled comparison of agents. The disconnected completed pair is still
unavailable and is not reconstructed from its pre-repair checkpoint.

## What the recorder observes

A post-rAF MessageChannel task reads target geometry after application rAF
callbacks. Superseded tasks are counted and discarded. `t` is the associated
rAF timestamp; `observedAtMs` and the new `geometryTimeMs` are actual read times.
Displacement normalization uses the associated rAF interval. Read-time gaps
and lag are independently gated: delayed post-rAF tasks can bunch together,
so normalization by read-time alone would falsely magnify apparent velocity. Neither clock is
proof that a particular pixel was presented to a screen.

Each sample distinguishes `absent`, `hidden`, and `visible`. Visible means
nonzero geometry, computed visibility and opacity, not unobscured or unclipped
pixels. Invalid geometry is a separate analysis state. Continuity calculations
use adjacent visible samples from the same DOM identity; they never bridge
absence, hidden geometry or a replacement node. Opacity/height changes across
those boundaries therefore require their own explicit lifecycle expectations.

WAAPI operation-boundary reads remain supplemental observations, separate
from rAF samples and video. Browser events, application annotations and runner
events retain distinct origins. App marks cannot create observed cancellations,
DOM evidence, long tasks or probe-cost metrics. Source refs are supplied
annotations, not inferred causality. CSS-only transitions do not receive WAAPI
operation-boundary coverage.

## Evidence sufficiency and caller contracts

Recorder integrity always requires ordered nonnegative timestamps, at least
20 observed frames, the first frame within 80ms, coverage through the requested
duration minus 100ms, and no rAF gap, actual-read gap or observation lag above
80ms. A larger caller gap budget never changes this gate.

`coverage` reports recorder integrity separately from target coverage, including
observed state intervals and reasons. Target coverage requires at least 20
visible samples and no invalid geometry. Default `targetPresence: continuous`
also retains the original finite-target start/end and gap requirements. Use
`may-disappear` explicitly for mounting/unmounting or hiding: the observed
absence remains in the report and never fills a missing recorder interval.

Position/height/opacity contracts require at least 19 adjacent visible pairs.
A within-budget metric with insufficient coverage is `inconclusive` and
`passed: false`. An observed violation remains `failed` even if another span
is insufficient. Final-state and browser-error assertions remain independent
observations. Comparisons refuse failed capture integrity, differing lifecycle
analysis or differing probe/analyzer hashes. A functional browser-test pass
cannot turn an inconclusive temporal comparison into a quality claim.

## Runner diagnostics and validation

Reports expose the actual Chromium version, device pixel ratio, page visibility,
CDP renderer string, exact serialized probe/analyzer hashes, maximum read cost,
superseded task count and browser long tasks. This diagnoses software rendering
and recorder/geometry work without attributing every gap to the probe. The
bounded `npm run audit:runner` records one serial observation on the actual 3D
page with plain rAF logging, probe, and probe plus video. These observations
are diagnostic associations, not causal estimates; unrecorded runs cannot
replace the final recorded evidence.

Capture reports also retain `browserMode`. Headless remains the default;
`MOTION_BROWSER_MODE=headed` explicitly selects a fresh local display browser.
Comparisons reject mixed modes. The renderer identifies the actual graphics
backend, while the unchanged integrity gate still determines whether the
recorded timing can support a temporal conclusion. Bounded vertical wheel
actions and their browser-observed events support scroll-linked interfaces.

`doctor` now finalizes an actual tiny browser recording, so a launch-only pass
cannot hide a missing Playwright video encoder. The demo launcher preserves
credential-free proxy URLs and public CA trust paths, with TLS verification
enabled, while excluding the caller's application tokens and npm config.

Run `npm run check`, `npm run test:coverage:browser`,
`npm run test:repair:browser`, `npm run test:demo:browser`,
`npm run test:v2:e2e`, and `npm run test:install`. Browser tests write real
videos, trace JSON, screenshots and SDK transport responses. The working
repair viewer exposes source-matched, SHA-256-verified recordings and the raw
report. Missing or stale videos are visibly unavailable.
