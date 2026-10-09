# Current candidate delivery

The 34,402,243-byte historical checkpoint evidence archive remains preserved in
the original verified Library checkpoint (joined bundle SHA-256
`348502e4f44405df69bbffc822d3b090f3c287fe6313802edc8843447528bf7e`).
Its archive SHA-256 is `d1e6bc2868da8c3730c089b083109205701627693806d010aaaa4f1335ef60eb`.
It is deliberately excluded from the current source tree and compact source
delivery. `CHECKPOINT.md` is an unchanged historical record, not current status.

The new working case is `cases/aer-drawer-continuity`; the frozen studies remain
unchanged. Current evidence lives in `artifacts/repair-case`, lifecycle tests in
`artifacts/v2/coverage`, and diagnostic associations in `artifacts/runner-audit`.
The core/build checks, 31 core unit tests, 16 CLI tests, four actual SDK scenario
comparisons, eight desktop/mobile reopen checks, saved viewer browser checks,
and independent fresh package installation with recordings all passed locally.
The new working 3D pair's temporal comparison remains inconclusive on this
SwiftShader runner: both final captures exceed the unchanged 80ms gate.

To run a clean checkout:

```sh
npm ci --cache /tmp/motion-npm-cache
npx playwright install chromium
npm run build
npm run test:coverage:browser
npm run test:repair:browser -- --cache /tmp/motion-npm-cache
npm run demo:repair -- --cache /tmp/motion-npm-cache
```

On this selected environment, use `CHROMIUM_PATH=/usr/bin/chromium` and
`PLAYWRIGHT_BROWSERS_PATH=/workspace/.cache/ms-playwright`; cached dependencies
are in `/workspace/motion-recovery/npm-cache`. The demo binds to loopback only.
Its source-matched recorded videos support playback/seek and remain separate
from live iframe sessions. The historical viewer is `npm run demo:study`.

The final built MCP SHA-256 is
`f0bcc1cdd9bcddfd6554a759bd2bc9fcaa3cde7000bfb56c03deee4455dece17`.
Do not turn functional checks or this supplemental repair into an agent winner
claim. The disconnected final shared-start pair is still unavailable.
