# AER paired study: observed results

**Both agents produced functioning, original 3D pages and repaired real issues after inspecting browser evidence. This one pair does not establish a general plugin advantage. Normal-motion sampling remains inconclusive on the software-rendered CI runner.**

## What ran

The [same brief](PROMPT.md) was given to separate gpt-6.1-sol/high agents with the same 25-minute initial-build and 20-minute active-repair allowances; browser waiting was excluded. The baseline received ordinary browser evidence. The treatment also loaded the four frozen skills and requested actual MCP captures, trace inspection and native recorded frames. Neither received a repaired implementation or the other arm's source.

The coordinator copied source snapshots and executed requested browser operations in GitHub Actions. It did not diagnose or edit the app source. Two repairs were made to the baseline. After the first treatment repair, the original session could not resume because of the agent-thread limit. An independent Motion QA worker used the remaining allowance for its second repair. That continuation is disclosed, not represented as a fully model-controlled same-session A/B comparison. Its final visual review incidentally included the combined viewer after source had already been frozen.

See [the method](METHOD.md), frozen inputs, each app's EXECUTION.md and SOURCE-HASHES.json. Treatment repair 1 is separately preserved under `treatment/repair-1`.

## Agent-written changes

- Baseline: mobile copy/stage spacing, control/footer overlap, a canvas/speed-button selector collision, rear stem placement and lighting. Its second repair merged guard geometry, reduced repeated shadow work and corrected elapsed-time integration after an observed click timeout
- Treatment repair 1: a joined mobile heading, mismatched scene background, excessive render work and slow wall-clock motor progression. It retained real procedural geometry, controls and reduced motion
- Treatment repair 2: cached the static fan's real rendered color and depth at a settled camera, then drew the rotating 3D rotor against that depth. Orbit/resize refreshes or directly renders the full scene. No prewritten fix, static screenshot substitution or hidden repaired-mode toggle was used

Actual final screenshots and recorded frames were inspected. The observed desktop/touch orbit poses preserved fan geometry and blade/guard depth registration. This is a visual check, not a mathematical proof of all camera states.

## Functional observations

Both final pages completed the collected ordinary actions without an application exception: desktop/narrow layouts, repeated drawer open/close, focus restoration, power/speed changes, keyboard orbit/reset, pointer and emulated touch orbit, and reduced motion. No horizontal overflow was observed at 1440, 390 or 320px. Physical devices, every GPU and every assistive technology were not tested.

The baseline settled OFF at velocity0 and an unchanged observed angle; selecting High while OFF did not turn it on. The treatment's final controls and all four requested final-state contracts passed. Both retained actual 3D and visible rotor movement in normal mode.

## Temporal result: preserve the failures

Final treatment captures in [run37035187508](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/37035187508), source `b66a7f84575394b99e7ec64d015200d021642cc5`:

| Recipe | Maximum observed gap | Integrity result | Final state |
| --- | ---: | --- | --- |
| Bounded rapid motor | 149.9ms | Fails unchanged80ms gate | Pass |
| Drawer interruption | 166.6ms | Fails unchanged80ms gate | Pass |
| Live reveal | 83.5ms | Fails unchanged80ms gate | Pass |
| Reduced motion | 33.4ms | Pass | Pass |

The initial motor/drawer recordings timed out; initial reveal/reduced recordings lacked sufficient cadence. The comparison tool therefore cannot establish a valid before/after temporal-quality improvement for this case. Weak recordings are not counted as passing captures. The experiment stopped at the explicit two-repair bound; no threshold was raised.

The actual final browser console had no shader/application errors, but did have GPU ReadPixels performance warnings. App-supplied diagnostics changed from29 draw calls/22,454 triangles initially to8/13,804 after repair1, then2 draw calls/1,502 per animated redraw with12,304 static triangles cached after repair2. Those are app annotations, not independent GPU timing or evidence that geometry was removed. Initial and later frame counts differ, but this single software-rendered run is not a hardware FPS guarantee.

## Tool and procedure corrections

The initial rapid-motor request had17 actions and was rejected by the existing16-action schema. It remains preserved. A separately labelled corrected recipe removed only its initial250ms wait and ran against both initial and repaired source.

The initial tool omitted accessibility/boolean final attributes even though its schema accepted them. The observer was corrected to safely capture aria-* plus open/disabled/hidden/role, with regression tests. Both sides of the final recapture used the same corrected observer. The app's existing aria-busy state was not mislabelled as an app defect.

The bounded DAG was added after experimental skill inputs were frozen. It is now shipped with the plugin and the release workflow skill; this is not retroactively claimed as an experimental input.

## Watch and reproduce

The repository README contains actual animated previews and downloadable MP4 recordings. They retain playback speed; resizing, labels, GIF palette/frame-rate conversion and the documented five-second excerpt are presentation changes only. Full recordings and their source-run provenance remain available.

`npm run demo:study` builds and serves the four saved outputs on credential-free loopback origins. The viewer does not itself run agents. [Demo instructions](../../docs/DEMO.md) explain the locked installs and source-hash checks.

The package, SDK transport, fresh consumer installation, all four skill copies and actual browser viewer passed [CI37035187318](https://github.com/ShadowKingYT444/motion-debugger/actions/runs/37035187318). A green evidence-collection workflow is not a claim that all temporal contracts passed.
