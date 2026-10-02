# v0.4 private-preview verification

Runtime and complete-package validation: [run37035187318](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/37035187318), source `b66a7f84575394b99e7ec64d015200d021642cc5`. Later documentation/media changes receive a fresh CI run on their exact commit.

- Typecheck/build, core/CLI/SDK transport tests
-16 CLI tests, including complete four-client skill installation, preview/token checks, idempotence, collision/symlink refusal and protective rollback
-15 DAG tests, with10nodes,19edges,12 terminating routes and maximum2repairs
-8 launcher tests; real HTTP, isolated origins, hashes/tampering, scoped files and visible failed/unavailable states
-Actual Chromium fixture, interaction and native recorded-frame tests
-Fresh tarball installed as a real dependency outside the source tree, separate standalone-plugin install, SDK handshakes, browser launch and real capture/inspect/compare
-Actual four-snapshot viewer browser checks at1600/960/390/320px, repeated switches, keyboard reload and reduced-motion navigation
-Real initial/repaired app recordings, preserved source and actual agent-written repair logs

The AER case has unresolved normal-motion sampling gates on the software-rendered runner. [Full results and limitations](../studies/aer/RESULTS.md) distinguish those from functional and package-test passes. Do not call the A/B pair a general quality win or all its temporal assertions a pass.

Skills are installed into supported workspace directories, but complete interactive-host discovery was not tested in every editor. The wizard previews settings and skills together and requires explicit confirmation; testing changed temporary workspaces only. No user credentials or settings were imported. The repository and package remain private/UNLICENSED, with a scoped MIT notice for the adapted Taste guidance. Nothing was published to npm.
