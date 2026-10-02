# Verified motion-regression proof

## Provenance

- Repository: [ShadowKingYT444/motion-debugger](https://github.com/ShadowKingYT444/motion-debugger)
- Reviewed work: [draft pull request #1](https://github.com/ShadowKingYT444/motion-debugger/pull/1)
- Source head: `d31feddb81f5f2de3b76c9fe79da2c70baf85621`
- Successful hosted browser run: [GitHub Actions #36972013110](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/36972013110)
- Job: `110727753165`; the pull-request workflow tests GitHub's merge revision for that source head
- Verified on 2026-10-02; this record describes the original passing head and its captured evidence
- A later responsive chart-label refinement is separately checked by the current pull-request CI run; use the passing check tied to the PR head for the latest UI screenshots

The restricted build computer could compile and test the API, but could not launch Chromium because its sandbox denied normal local browser sockets. Actual browser verification therefore ran in GitHub Actions. No synthetic capture report or video was substituted.

## Checks that passed

- TypeScript typecheck and Vite production build
- Ten deterministic analysis and real local-API tests, including rejection of empty/null/nonfinite/unfinished trajectories, missing or failed capture assertions, arbitrary targets, malformed/oversized JSON, foreign origins and unapproved source paths
- Four end-to-end suites: API safety; three actual capture pairs; repeated activation and reduced-motion parity; dashboard browser verification
- Fourteen measured capture/comparison assertions for each pair
- Twenty-four dashboard checks using real captured data, including synchronized video seeking, keyboard scrubbing, source inspection, exact-event selection, background capture while inspecting an earlier run, and successful error recovery
- Dashboard screenshots at 1440, 1024, 390 and 320px widths; no horizontal page overflow at those widths
- No uncaught fixture or dashboard page errors in the tested flows

Empty/error UI-state screenshots are deliberately simulated test states and are labeled `test-only-*`. The motion reports, clips and populated dashboard screenshots come from actual browser execution.

## Measured results

All three controlled baseline runs showed two mounts, one DOM replacement, two animation starts and one cancellation while the entrance was active. Each fixed run showed one mount, zero replacements, one animation start and zero active cancellations.

| API delay | Baseline maximum backward jump | Fixed maximum backward jump | Baseline opacity drop | Fixed opacity drop | Samples per variant |
| --- | ---: | ---: | ---: | ---: | ---: |
| 150ms | 22.86px | 0px | 0.0857 | 0 | 134 |
| 350ms | 57.13px | 0px | 0.2142 | 0 | 134 |
| 800ms | 134.28px | 0px | 0.5035 | 0 | 155 |

The UI-triggered additional 350ms run also passed, with 57.14px baseline backtrack and 0px fixed backtrack. These are observed measurements, not promised values for other machines.

Every pair preserved the same final API-driven state: logical card `card-42`, revision `1`, title `Motion lab workspace`, status `ready`. Final horizontal position and opacity also matched. Both real WebM clips and screenshots were verified present.

### Report IDs

- 150ms: `7469f4a6-3470-4d5d-a2ce-9bd38f77e91e`
- 350ms: `11f8f0b1-e713-46be-acc0-d6eafd3ebc19`
- 800ms: `975a2de1-14bb-4260-848c-05c2142354c1`
- Additional UI-triggered 350ms: `16d8f9fc-fc13-4aa1-b173-3f8362d361cd`

## What the result establishes

Within this instrumented React fixture, a delayed revision update changes the baseline key, replacing the logical card's DOM node. Unmount cleanup cancels an active entrance and the replacement restarts it. Keeping the key tied to `card.id` preserves node/animation identity, restores continuity and retains the final response-driven state.

The fixed capture executes a stable-key **code branch of the same fixture**. The application does not automatically edit arbitrary repositories. Source relationships are explicitly mapped fixture annotations; this is a deterministic regression proof, not a generic root-cause or AI-repair claim.

## Remaining limits

- One allowlisted, explicitly instrumented fixture; no arbitrary application import or source inference
- rAF sampling can miss sub-frame glitches
- Video seeks use measured host offsets and are approximate; page-clock samples are authoritative for metrics
- MutationObserver timestamps are observer-delivery times, so closely related DOM/animation entries may appear slightly out of synchronous execution order
- Reduced-motion final-state parity and keyboard controls were tested; this is not a comprehensive accessibility audit
- Automated screenshot generation and overflow checks do not alone establish visual polish or performance across all devices
- No public deployment, paid inference, credentials or external app integration
