# Coding-agent integration

## Runtime surfaces

The MCP, CLI and library call the same core. `motion_capture` accepts a recipe, saves actual local browser evidence, and returns a compact summary. `motion_inspect` bounds returned event/sample data. `motion_compare` validates equivalent selectors, actions, viewport, reduced-motion setting, duration and contracts before offering an improvement interpretation. URL variants and labels may differ intentionally.

The server uses the official `@modelcontextprotocol/sdk` v1 transport API. The maintained v1 API documents local stdio server/client transport. [Official SDK server guide](https://ts.sdk.modelcontextprotocol.io/server), [client guide](https://ts.sdk.modelcontextprotocol.io/client)

## Local Codex

The most explicit connection is an absolute-path stdio server command. `node build/cli/index.js config` prints that JSON; it does not install anything. Optionally add the command yourself through Codex's MCP settings or `codex mcp add`. [Official Codex MCP documentation](https://developers.openai.com/codex/mcp)

Set read-only source roots only when you want explicit annotation excerpts:

```sh
MOTION_SOURCE_ROOTS=/absolute/path/to/your/app \
MOTION_ALLOWED_ORIGINS=http://127.0.0.1:4173 \
MOTION_ARTIFACT_DIR=/absolute/path/to/evidence \
node /absolute/path/to/motion-debugger/build/mcp/index.js
```

The capture recipe can provide source refs keyed by the app's `motion:mark` sourceKey. This is explicit annotation mapping, not source inference.

## Compatibility plugin

The repo-local package includes `.codex-plugin/plugin.json`, `.mcp.json`, skills and a built local entrypoint. The current official packaging guide continues to support this compatibility layout. [Official plugin packaging guide](https://developers.openai.com/plugins/build/plugins)

The bundled MCP configuration uses plugin-root/data placeholders supplied by the host. The manifest is validated, and the bundled endpoint is exercised over stdio by the SDK tests. A user's actual Codex installation and plugin-variable expansion are not asserted as tested. If host packaging varies, use the generated absolute command as the unambiguous connection path.

Do not run a marketplace installation or persistent host config change without the user's approval. This repository creates no personal marketplace entry and writes no host configuration.

## Evidence versus an agent benchmark

The automated workflow uses an actual MCP client to initialize, discover tools, call captures, inspect resources and compare reports. It establishes that the tool integration operates over the real protocol.

The included ablation compares final-state-only checks with temporal contracts on seeded examples. Both final states can be correct while the temporal baseline is defective. That establishes the value of temporal evidence under these recipes; no LLM/model was benchmarked, and no autonomous coding-agent repair is claimed.

## Cadence-aware continuity budgets

Raw frame displacement changes when browser callbacks are delayed. `maxStepAt60HzPx` explicitly scales the observed displacement by16.667ms/elapsed sample time; raw `maxFrameStepPx` remains available separately. Samples use rAF callback timestamps, while events use performance.now in the same page time origin. An80ms maximum-gap gate prevents sparse data from claiming continuity. The caller budget remains design-specific, and this normalization does not establish perceptual smoothness. The test fixture `tests/v2/fixtures/drawer-cadence.json` preserves actual hosted CI traces where a repaired49.584px/27.5ms interval is legitimate fast motion, while a seeded151.49px/26.2ms reset remains distinguishable.
