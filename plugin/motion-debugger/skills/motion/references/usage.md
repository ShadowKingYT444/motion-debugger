# Original recipes and ownership

These modules are original Motion Debugger construction examples. They borrow no HyperFrames code or video-runtime contract. The useful concept is a compact catalog of concrete scenes and reusable primitives; interactive websites additionally need arbitrary interruption, semantic controls, responsive composition and resource teardown.

Copy required `.mjs` files together into the consumer project and import them with relative paths. The catalog returns all local dependencies for each recipe. Consumer CSS owns typography, color, layout and composition. Keep controls native (`button`, `dialog`, anchors); attach a dispose function to component unmount or navigation. All recurring loops and listeners require teardown. Do not create a second requestAnimationFrame loop around `animateSpring`.

## Kinetic identity fields

Copy `kinetic-field.mjs` and `spring.mjs` together. `createKineticField` owns its animation loop and calls `onChange` with stable `state.points` for Pulse, Weave and Orbit. Map normalized `x/y/z` into your SVG viewport or Three.js scene; author typography, glyphs, lighting, materials and camera framing for the brief. The primitive supplies motion and formations, so visual composition still belongs to the consumer.

```js
import {createKineticField} from './kinetic-field.mjs';
const field = createKineticField({mode: 'orbit', onChange: state => {
  renderPoints(state.points); // Renderer and DOM must already exist: initial callback is synchronous.
  scrubber.value = state.progress;
}});
field.play();
// Native input handler: direct timeline scrubbing, preserving paused/running state.
scrubber.addEventListener('input', () => field.seek(Number(scrubber.value), {immediate: true}));
// field.setMode('weave') preserves positions and velocities during retargeting.
// field.pause(), resume(), replay(), setIntensity(value), and pose(mode) are explicit controls.
```

Default `seek(progress)` springs toward the selected pose; `{immediate:true}` applies the pose directly and clears velocity. Paused seeking remains paused. Progress 1 retains the endpoint while its cyclic phase is 0. Reduced motion retains the selected meaningful pose without a decorative loop. Render in the callback; do not wrap it in another requestAnimationFrame loop. Remove consumer listeners and call `field.dispose()` at teardown; separately dispose consumer geometry, materials and renderer. Verify held forward/backward scrubbing, rapid style changes, pause/replay and export state against the actual rendered output.

While paused, explicit style or intensity changes settle to the new pose without advancing the timeline. `pause()` is safe inside `onChange`. A throwing renderer stops scheduling, retains the pose and exposes `state.error` with paused status; the original exception still surfaces. Fix the renderer and call `resume()` or `play()` to retry. A constructor callback failure cleans up owned resources before rethrowing.

`play()` starts continuous playback; `resume()` restores the previous activity, including a finite pose transition that finishes and stops. Both preserve position and velocity. Use `replay()` when playback should restart at phase zero.

## Colony plus scroll narrative

Use an existing project Three.js module (install through the project's ordinary dependency workflow if authorized). The canvas, render loop and responsive sizing belong to the consumer:

```js
import * as THREE from 'three';
import {createColonyScene} from './colony-scene.mjs';
import {createScrollChapters} from './scroll-chapters.mjs';
const media = matchMedia('(prefers-reduced-motion: reduce)');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
const colony = createColonyScene({THREE, renderer, count: 18, reducedMotion: media.matches});
const chapters = createScrollChapters({root: story, chapters: [...story.querySelectorAll('[data-chapter]')], render: ({progress}) => colony.setProgress(progress)});
// CSS: story has a deliberate scroll range; its canvas container is sticky.
let frame, last;
function draw(time) {
  colony.update(last === undefined ? 0 : Math.min(.05, (time - last) / 1000));
  last = time; frame = requestAnimationFrame(draw);
}
const resize = () => {const {width,height} = canvas.getBoundingClientRect(); if(width && height) colony.resize(width,height,devicePixelRatio);};
const change = () => {colony.setReducedMotion(media.matches);};
const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
media.addEventListener('change', change); frame = requestAnimationFrame(draw);
pauseButton.addEventListener('click', () => colony.setPaused(!colony.state.paused));
// In framework teardown: remove the pause listener too.
function dispose() {cancelAnimationFrame(frame); observer.disconnect(); media.removeEventListener('change',change); chapters.dispose(); colony.dispose(); renderer.dispose();}
```

Compose three semantic chapters around discovery, delegation and arrival. The factory supplies orbital scouts and branching queues; task tokens and UI carry the explicit work/result story. Customize the geometry and camera to the brief. Do not pass an unbounded agent count: the factory caps it at 48, caps pixel ratio at 2 and reuses geometry/materials. Stop rendering while offscreen or hidden using the host app's lifecycle. Pause freezes simulation while the consumer may render a frame after resize. Replay should reset the consumer's story inputs to the documented start.

## Handoff and modal controls

```js
import {createTaskHandoff} from './task-handoff.mjs';
import {createDrawer} from './drawer.mjs';
const handoff = createTaskHandoff({stage, token, workers: [...stage.querySelectorAll('button[data-worker]')], onArrive: ({index}) => {status.textContent = `Worker ${index + 1} received the task`;}});
const drawer = createDrawer({dialog, openButton, closeButton});
// CSS: stage position:relative; token position:absolute; left:0; top:0;
// token pointer-events:none; worker buttons remain keyboard and pointer accessible.
// Reserve room above the worker cards: the token arrives above each readable label,
// separated by a 12px gap (customize with createTaskHandoff({..., gap: 16})).
// dialog fixed on the inline-end, no competing CSS transform/transition.
// Use a status live region; animate only transform/opacity, not layout each frame.
// Dispose both controllers on teardown. Use handoff.send(0) for replay.
```

Rapidly switch workers mid-flight and reverse the drawer while closing. Their targets change without replacing the animated element or resetting its velocity. Successful arrival is separate from animation start. Layout reads happen on target selection/resize, not on every frame; stage layout changes should call `send(currentIndex)` after layout settles. Reduced motion snaps to the same destination and still reports arrival. Native `dialog` supplies modal focus semantics; browser verification remains required.

## Elapsed scripted task phases

```js
import {createElapsedSequence} from './elapsed-sequence.mjs';
const sequence = createElapsedSequence({
  phases: [{id: 'assign', durationMs: 1500}, {id: 'work', durationMs: 4000}, {id: 'deliver', durationMs: 1500}],
  onChange: state => {
    progress.value = state.progress;
    stage.dataset.phase = state.phase.id;
    renderPose(state.phase.id, state.poseProgress);
  },
  onComplete: () => {result.hidden = false;}
});
launch.addEventListener('click', () => sequence.play());
pause.addEventListener('click', () => sequence.pause());
resume.addEventListener('click', () => sequence.resume());
cancel.addEventListener('click', () => sequence.cancel());
replay.addEventListener('click', () => sequence.replay());
// Remove these consumer listeners and call sequence.dispose() on teardown.
```

This is scripted interface choreography, not a simulation of real backend completion. Real jobs must expose their actual status separately. Phase time advances by monotonic elapsed milliseconds, so clamped rendering deltas cannot strand the task. Hidden tabs suspend time; explicit pause stays paused after visibility returns. Reduced motion retains duration and phase meaning using boundary timers rather than a decorative frame loop. Feed a separate spring with the meaningful targets when smooth visual catch-up is desired. Use native buttons, live status and an explicit useful final result; verify interruption, replay, hidden-tab restoration and reduced-motion delivery in the browser.
