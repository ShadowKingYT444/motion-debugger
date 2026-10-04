# A practical coding-agent workflow

For a new page, tag `$motion` in the ordinary product brief. The [motion skill](SKILLS.md) routes creation through runnable spring, scroll, colony, handoff, elapsed sequence and drawer recipes. Call `motion_recipe` without an ID for the catalog, then with a returned ID for its exact source. The agent builds real source, watches the result, checks product outcomes, and repairs what it observes. The [Ants study](../studies/ants-launch/README.md) records the current comparison status; the [AER study](../studies/aer/README.md) preserves earlier independent builds.

The primary user is a coding agent attached to the stdio server. The browser showcase supplies original test material; it is not the integration surface.

## 1. State the job and permissions

“On my trusted local preview, inspect the product drawer's open → Escape → reopen interruption. Do not type credentials or perform destructive actions. Preserve its final open state.”

Configure the local MCP endpoint as described in [INTEGRATION.md](INTEGRATION.md). `motion_capture` can run browser interactions and trigger app actions, so an agent must stay inside the user's requested scope.

Recipes can also include `{ "action": "scroll", "deltaY": 700 }` for scroll-linked interfaces. Each vertical wheel delta must be an integer between −1200 and 1200 pixels. The browser records trusted wheel events; normal scrolling still depends on the page's scroll container and pointer position. Recipes remain limited to 16 actions and 12 seconds. Use explicit `move` actions when the pointer must be over a particular scroll container.

## 2. Call the real tool with an explicit contract

For the included example, a tool call has this structure:

```json
{
  "name":"motion_capture",
  "arguments":{
    "recipe":{
      "url":"http://127.0.0.1:4173/examples?scenario=drawer&mode=baseline",
      "selector":"#product-drawer",
      "durationMs":2400,
      "viewport":{"width":1280,"height":1000},
      "reducedMotion":"no-preference",
      "actions":[
        {"action":"click","selector":"#open-details"},
        {"action":"wait","ms":180},
        {"action":"key","key":"Escape"},
        {"action":"wait","ms":110},
        {"action":"click","selector":"#open-details"},
        {"action":"wait","ms":1100}
      ],
      "contract":{
        "maxStepAt60HzPx":40,
        "maxReplacements":0,
        "final":{"attributes":{"data-state":"open"},"visible":true,"textIncludes":"Warm porcelain"}
      }
    }
  }
}
```

The response provides the capture UUID, measured budgets/findings and actual video/poster/final screenshot paths. It does not return a fabricated explanation or edit source.

For a product journey, add positive outcomes to the contract, for example `"outcomes":{"timeoutMs":2200,"required":[{"id":"completed-plan","selector":"#result","visible":true,"textIncludes":"Plan complete"}],"forbiddenVisible":["#error"]}`. The deadline runs from capture start; positive checks are evaluated after the actions within that deadline. Transient visible errors are retained. `delivery` reports passed, failed or unverified separately from temporal quality. Without an outcome contract, functional delivery remains unverified. Selectors must identify one element; use explicit bounded attributes when checking application state.

A failed interaction remains an MCP error. For a page that passed the privacy scans and network policy, the error can include `status: "incomplete"`, the failed action and retained video/events. Use `motion_list` or `motion_inspect` to find this evidence. Its assertions cannot pass and `motion_compare` rejects it as improvement evidence. Privacy/security rejections purge pixels. A visible rectangle does not establish pointer clickability: test removal, timely Undo and restored quantity through actual unforced input, then check keyboard use separately.

On headed displays, first decode a full-viewport calibration and a real scene. See [native recording setup](NATIVE-RECORDING.md) if the compositor scales the recorded page. GPU identity, pixel coverage and temporal cadence need separate verification.

## 3. Inspect a bounded time window

Use the returned ID, not an invented one:

```json
{
  "name":"motion_inspect",
  "arguments":{"captureId":"<returned-before-id>","fromMs":150,"toMs":450,"includeSamples":true}
}
```

Read the clip or frames using your host's existing image/browser tools. Match measured geometry with explicit application/source annotations where available. An active cancellation is not automatically a bug: the intended drawer reversal legitimately cancels a tween.

Call `motion_frames` with `selection:"journey"` to see six frames across the entire recording, then use `selection:"finding"` or explicit `timestampsMs` for detail. Optional `maxWidth` and `maxHeight` return larger images, bounded at 1280×960. The server decodes the saved WebM; it does not rerender the app or invent a frame. Each image reports requested capture time, video seek time, original dimensions and scale. Video alignment is approximate, so use the sampled trace for exact timing claims.

```json
{"name":"motion_frames","arguments":{"captureId":"<returned-before-id>"}}
```

The CLI equivalent, `motion-debugger frames <capture-id>`, saves the PNGs and prints their paths and provenance.

## 4. Make the authorized source change

Use normal coding tools to continue from the current computed transform instead of resetting from an assumed endpoint. This source-edit step belongs to the coding agent and its existing permissions. Motion Debugger does not perform it.

For reproducible demonstration, the included showcase already contains seeded and handwritten repair branches. Switching its URL to `mode=fixed` tests that branch; it is not evidence that a blind agent autonomously discovered and applied the repair.

## 5. Repeat and compare

Capture the after version with the exact same selector, recipe, viewport, motion preference, duration and budgets. The example URL variant is allowed to differ.

```json
{
  "name":"motion_compare",
  "arguments":{"beforeId":"<returned-before-id>","afterId":"<returned-after-id>"}
}
```

The comparison refuses mismatched recipes, inadequate sampling, missing/failed browser/network integrity checks, or insufficient temporal evidence before claiming improvement. Preserve final interaction state separately from temporal behavior.

## Evidence already obtained during development

Actual hosted CI drawer recordings `52592e24-8488-4455-a344-e973b7e69aea` and `2afb815b-5e38-4c87-9b86-4871b9db31f2` exposed a cadence confound: the seeded reset moved 151.49px over 26.2ms, while legitimate repaired motion moved 49.584px over 27.5ms. Raw “per-frame” displacement alone was misleading. The recorded traces are preserved in [the cadence regression fixture](../tests/v2/fixtures/drawer-cadence.json).

The explicit normalized quantity is displacement ÷ sample elapsed time × 16.667ms. On those traces, the maximum is 96.367px for the reset versus 37.579px for the repair, against an unchanged 40px caller budget. This is a measurement correction supported by actual data, not a claim of universal perceptual smoothness. New captures use rAF timestamps and an 80ms maximum-gap integrity gate.

## What the older fixture ablation measures

The automated ablation compares:

- Without temporal evidence: final-state-only assertions, which pass despite the seeded transient defects
- With temporal evidence: intended continuity, height-change or containment contracts, which expose the intermediate defects and check the repair branch

The harness uses the official SDK client over actual MCP stdio: initialization, tool discovery, capture calls, resource reads, inspection and comparison. Those fixture tests do not benchmark an LLM. Their result establishes integration and detector behavior. The separate AER study documents actual independent coding-agent runs, with its own limitations.
