# Motion Debugger

**Temporal browser evidence for coding agents.** A local TypeScript library, CLI, and real stdio MCP server that records caller-chosen app interactions, evaluates explicit motion contracts, and compares before/after evidence.

The coding agent is the primary interface. The browser examples are original test material, and the old dashboard is an optional v1 evidence viewer. No paid inference API, deployment, credentials, or autonomous source editing.

## What it does

- Capture a loopback URL, unique CSS target, and a bounded click/hover/key/pointer recipe
- Record real WebM, screenshots, request/app events, DOM identity, Web Animations lifecycle, and rAF geometry/opacity/transform
- Evaluate caller-specified continuity, height-change, containment, identity/cancellation, and final-state contracts
- Return compact findings, relevant time windows, source annotations and local evidence paths to an agent
- Compare only equivalent recipes/contracts, allowing explicit before/after URL variants

A screenshot of the final state can miss a transient defect. The included detector/evidence ablation demonstrates that distinction; it is **not** a claim that an LLM performs better.

## Quick start

Requires Node.js 22+.

```sh
git clone --branch mvp https://github.com/ShadowKingYT444/motion-debugger.git
cd motion-debugger
npm ci
npx playwright install chromium
npm run build
```

On Linux, Playwright may need its official system dependencies: `npx playwright install --with-deps chromium`.

### Connect a coding agent

Print an absolute-path stdio configuration without changing your host:

```sh
node build/cli/index.js config
```

Codex supports local stdio MCP servers. You can add the built server yourself with:

```sh
codex mcp add motion-debugger -- node /absolute/path/to/motion-debugger/build/mcp/index.js
```

This command is an optional user-operated setup step; the repository does not run it or modify your Codex configuration. Codex MCP setup, host scope and approval options are documented in the [official MCP guide](https://developers.openai.com/codex/mcp).

The repo also contains a [Codex compatibility plugin package](plugin/motion-debugger/) with a skill, manifest and bundled MCP entrypoint. Its structure is validated with the official plugin scaffold validator. Actual installation into your Codex host remains a user step; the protocol endpoint is tested with an actual SDK client. See [integration details](docs/INTEGRATION.md).

### Tools

| Tool | Result |
| --- | --- |
| `motion_capture` | Actual capture, compact contracts/findings and artifact paths |
| `motion_inspect` | Compact evidence plus bounded event/sample window |
| `motion_compare` | Comparable before/after deltas and final-state equivalence |
| `motion_list` | Captures in the configured evidence directory |

Full evidence is available through `motion-evidence://capture/<capture-id>`. The server also exposes `motion-evidence://guide`. It writes JSON-RPC only to stdout; diagnostics go to stderr.

### CLI and library

```sh
npm start                                      # local example app, loopback only
node build/cli/index.js capture recipe.json
node build/cli/index.js inspect <capture-id>
node build/cli/index.js compare <before-id> <after-id>
```

```ts
import { capture, compare } from 'motion-debugger';
const before = await capture(recipe, { artifactRoot: './.motion-evidence' });
```

The package exports the same core used by MCP and CLI. `npm pack --dry-run` verifies the distributable; no package is published automatically.

## A useful agent workflow

1. Give your agent the local development URL, selector and permitted interactions
2. Define intended motion contracts, rather than ask for an unexplained “quality score”
3. Capture the before version and inspect the failing time window and recorded frames
4. Make a narrow source change through the coding tools/permissions you already use
5. Capture the after version with the same interactions, viewport and contracts
6. Compare temporal behavior and independently preserve the intended final state

The plugin itself never writes a source patch. Source refs are caller-supplied mappings under explicit read-only roots, not code inferred from pixels. App marks remain labeled annotations.

## Original example families

Open http://127.0.0.1:4173/examples after `npm start`.

- **Interrupted product drawer:** a hand-illustrated porcelain object, with open/close/reopen interruption. Seeded endpoint resets versus continuation from the actual current transform
- **Live material reveal:** real delayed API response changes a card's height. Seeded reflow jump versus reserved space and a measured reveal
- **Curious cursor buddy:** an original procedural character with reversing gaze. Seeded pupil overshoot versus bounded, continuous retargeting

Recipes live in `src/examples/recipes.ts`. These are intentionally seeded defects and handwritten repair branches, not claims of an autonomous agent repair. The core accepts other trusted loopback pages; it is not hardcoded to these selectors or fixtures.

## Safety and scope

Use **trusted, credential-free development apps**. Do not point the tool at authenticated, private, medical, financial, payment, destructive-action or credential-bearing pages. Fresh contexts do not import your browser profile, cookies or credentials, but an app could render sensitive content without authentication. Recordings are not automatically redacted.

- Only loopback HTTP(S) URLs; no userinfo or credential-like URL parameters
- Resources restricted to the capture origin and explicitly configured loopback origins
- WebSocket connections blocked; use a production preview if your dev server's HMR relies on them
- Password/private-marked pages and private/credential-field interaction targets rejected
- Bounded interactions; no arbitrary JavaScript, shell, typed secrets or source mutation
- Clicks/keys can change the local app and trigger HTTP mutations. The host must obtain appropriate authorization
- Source refs require explicit `MOTION_SOURCE_ROOTS`, realpath containment, safe web-source extensions and size limits
- Evidence stays in the configured local directory; no uploads or external analysis are performed by the tool

Environment settings: `MOTION_ARTIFACT_DIR`, comma-separated `MOTION_ALLOWED_ORIGINS`, platform-delimited `MOTION_SOURCE_ROOTS`, optional `CHROMIUM_PATH`.

## Verification

```sh
npm run check          # production build, v1 regression tests, v2 core/security/stdio tests
npm run test:e2e       # preserved v1 browser proof
npm run test:v2:e2e    # actual SDK client captures three before/after pairs and detector ablation
npm pack --dry-run
```

The restricted build computer cannot launch Chromium. Actual browser verification runs in GitHub Actions using the official browser installer. See the workflow and its artifacts for the measured results at the current PR head. The v1 proof and exact older provenance remain in [docs/VERIFICATION.md](docs/VERIFICATION.md); v1 source is preserved in commit `e9724dd6f1f0b8878216568541dea6db8f4d8d36`.

## Design choices and prior art

Animation recording, agentic runtime inspection, motion audits and visual editors already exist. [The source-grounded research rationale](docs/PRIOR-ART.md) covers web-motion-skill, Replay MCP, MotionScore and Motion Studio. This project makes no novelty or superiority claim. Its narrow emphasis is portable, inspectable temporal contracts and before/after proof for a coding workflow.

## Layout

```text
packages/core/          browser recorder, contracts, safety and comparison
packages/mcp/           actual SDK stdio server, tools and resources
packages/cli/           command-line client over the same core
plugin/motion-debugger/ compatibility plugin and agent skill
src/examples/           original motion test material and shared recipes
src/dashboard/          optional preserved v1 viewer
src/fixture/            preserved v1 regression fixture
server/                 local examples/API server and v1 capture
 tests/v2/              core/security, real transport and hosted browser workflow
```

## Limits

Sampling can miss sub-frame defects; frame-step budgets depend on cadence and intended motion. Cancellation may be legitimate retargeting. Containment uses axis-aligned boxes or an explicitly selected circular assumption. Source attribution is supplied, not inferred. A passing contract is not a universal motion-quality score, accessibility audit, performance certification or coding-agent benchmark.
