# V2 integration and temporal evidence verification

## Provenance

- Verified source head: `e33463928433ac52ede12ecaaa9844d3bf82a0a4`
- Passing [GitHub Actions run #36978586078](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/36978586078)
- Repository work remains in [pull request #1](https://github.com/ShadowKingYT444/motion-debugger/pull/1)
- This record describes that actual passing snapshot. Later comparison-integrity and documentation refinements are checked separately at the current PR head

The restricted build computer could run typecheck, tests and real stdio MCP transport, but could not launch Chromium. Hosted CI performed the actual browser work. No capture was substituted with synthetic data.

## Actual integration exercised

The official SDK client initialized the real stdio endpoint, discovered all four tools, called `motion_capture` six times across three original example families, read full capture resources, called bounded `motion_inspect`, then compared each before/after pair. No tool call was replaced by a mocked report.

Compiled main MCP and bundled plugin endpoints also passed SDK initialization/discovery/resource/safety tests. The plugin manifest passed the official scaffold validator; typed library exports and the npm distributable built successfully. A user's actual Codex plugin installation was not performed or claimed as tested.

## Measured contracts

| Example | Supplied measurement | Seeded branch | Repair branch |
| --- | --- | ---: | ---: |
| Product drawer | Maximum displacement normalized to a 16.667ms interval | 67.258px | 31.112px |
| Live reveal | Maximum observed height step | 180px | 0px |
| Cursor buddy | Maximum visible circle-containment overflow | 12.358px | 0px |
| Cursor buddy | Samples violating containment | 26 | 0 |

All three seeded branches failed their intended temporal contract. All three handwritten repair branches passed all capture assertions and preserved equivalent final interaction state. Maximum observed sample gaps remained below the 80ms integrity gate.

The drawer budget stayed at 40px per normalized interval. Raw frame displacement was retained separately: different callback spacing made the repaired raw maximum exceed 40px even though its cadence-aware value was 31.112px. Normalization is displacement ÷ sample elapsed time ×16.667ms; it is not a universal perceptual-smoothness score.

### Capture IDs

- Drawer before: `a8d6d8de-992f-4f5f-a12f-3b8a9d568d31`
- Drawer after: `4af978ad-0c0c-4585-9114-9cb48b878bb7`
- Reveal before: `8dfb1d1b-eede-4952-9fcc-5e8f6ffcca46`
- Reveal after: `b40be080-04e8-4cc3-8687-a1aac68e9dad`
- Cursor before: `4e49fe76-b9f4-40ae-901f-e40b27adbe94`
- Cursor after: `31507de4-5eff-4aff-9956-0d38bf04f60e`

## Safety and UI checks

- A separate caller-chosen local page attempted an external WebSocket: the connection was blocked and its network-policy assertion failed as expected
- A private-marked page was rejected without a successful capture report
- The example UI passed 24 automated checks, including real interrupted input, API response, reduced motion, keyboard navigation, reflow, contrast/font measurements and focus behavior
- Preserved v1 browser proof and its 32 dashboard checks also passed
- Desktop, intermediate and mobile screenshots were generated from actual browser rendering for visual review

Automated screenshot generation is not itself proof of aesthetic quality. Actual pixel review belongs alongside these checks.

## Without versus with integration

The automated ablation compared final-state-only assertions against temporal evidence/contracts. Final-state-only checks passed while missing the seeded intermediate defects; temporal contracts exposed those defects and validated the repair branches.

This is **detector/evidence ablation**, exercised through real MCP transport. The example branches are seeded and handwritten. No blinded LLM repair trial, coding-agent success rate, or autonomous repository repair was demonstrated.
