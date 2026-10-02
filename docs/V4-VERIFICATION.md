# v0.4 private-preview verification

Runtime and complete-package validation: [run37042107049](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/37042107049), source `f9ee5b2afb2f3749808571f65c45e68f5f55f1ab`. Later documentation/media changes receive a fresh CI run on their exact commit.

- Typecheck/build, core tests and21 v2/SDK transport tests
-16 CLI tests, including complete four-client skill installation, preview/token checks, idempotence, collision/symlink refusal and protective rollback
-15 DAG tests, with10nodes,19edges,12 terminating routes and maximum2repairs
-8 launcher tests; real HTTP, isolated origins, hashes/tampering, scoped files and visible failed/unavailable states
-Actual Chromium fixture, interaction and native recorded-frame tests
-Fresh tarball installed as a real dependency outside the source tree, separate standalone-plugin install, SDK handshakes, browser launch and real capture/inspect/compare
-Actual four-snapshot viewer browser checks at1600/960/390/320px, repeated switches, keyboard reload and reduced-motion navigation
-Real initial/repaired app recordings, preserved source and actual agent-written repair logs

The AER case has unresolved normal-motion sampling gates on the software-rendered runner. [Full results and limitations](../studies/aer/RESULTS.md) distinguish those from functional and package-test passes. Do not call the A/B pair a general quality win or all its temporal assertions a pass.

Skills are installed into supported workspace directories, but complete interactive-host discovery was not tested in every editor. The wizard previews settings and skills together and requires explicit confirmation; testing changed temporary workspaces only. No user credentials or settings were imported. The repository and package remain private/UNLICENSED, with a scoped MIT notice for the adapted Taste guidance. Nothing was published to npm.

## Detection gap found and repaired during verification

A real drawer recording exposed a limitation of average-velocity normalization:151.4px across66.6ms became38.579px per nominal60Hz interval, below the unchanged40px budget. The original false-negative trace remains in tests/v2/fixtures/drawer-allowed-gap-false-negative.json; its missing observations were not invented or retroactively repaired.

The new probe separately measures target geometry across WAAPI cancellation/replacement batches, coalescing synchronous operations and queued microtasks. These are browser-observed boundary reads, not fabricated RAF samples or proof of a painted frame. RAF cadence and all original recipe budgets are unchanged. Legacy/new-probe captures cannot be silently compared as equivalent observation support.

Actual browser verification in the linked run measured a150px reset and a0px continuity-preserving microtask replacement. The unchanged seeded drawer also failed its intended contracts while its handwritten repair passed. Tests retain the real failure trace, ignore app-annotated boundary claims, and cover smooth motion, sub-millisecond noise and old-report handling. The fresh installed tarball, standalone plugin, viewer and recordings all passed in that run.

The keyboard replay check also now waits for the new run's in-flight state, rather than accepting a stale delivered timestamp. This changes a test precondition, not the app or a motion threshold.
