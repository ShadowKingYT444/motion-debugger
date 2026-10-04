import {createSpring} from './spring.mjs';

const modes = ['pulse', 'weave', 'orbit'];
const channels = ['x', 'y', 'z', 'rotation', 'scale', 'opacity'];
const tau = Math.PI * 2;
const finite = (value, name) => {if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`); return value;};
const checkedMode = mode => {if (!modes.includes(mode)) throw new TypeError('Choose pulse, weave or orbit'); return mode;};
const checkedCount = count => {if (!Number.isInteger(count) || count < 1) throw new TypeError('count must be a positive integer'); return Math.min(64, count);};
const checkedIntensity = value => Math.min(1, Math.max(0, finite(value, 'intensity')));

/** Original renderer-neutral formations. phase is cycles; x/y/z are normalized
 * scene-local coordinates. Stable IDs identify the SAME objects in every mode.
 * SVG/Three consumers own geometry, perspective, color, depth sorting and sizing.
 * phase=0 is a meaningful composed pose, not a collapsed/empty loading state.
 */
export function kineticFormation(mode, count = 36, {phase = 0, intensity = .65} = {}) {
  checkedMode(mode); count = checkedCount(count); finite(phase, 'phase'); intensity = checkedIntensity(intensity);
  const angle = (phase % 1) * tau, columns = Math.ceil(Math.sqrt(count)), rows = Math.ceil(count / columns);
  return Array.from({length: count}, (_, i) => {
    const u = count === 1 ? .5 : i / (count - 1), lane = i % 2;
    let x, y, z, rotation, scale;
    if (mode === 'pulse') {
      const col = i % columns, row = Math.floor(i / columns);
      x = columns === 1 ? 0 : (col / (columns - 1) - .5) * 1.5;
      y = rows === 1 ? 0 : (row / (rows - 1) - .5) * 1.25;
      const wave = Math.sin(angle - Math.hypot(x, y) * 5);
      z = wave * .18 * intensity;
      const bloom = 1 + wave * .12 * intensity; x *= bloom; y *= bloom;
      rotation = .15 * intensity * wave; scale = .75 + (wave + 1) * .3 * intensity;
    } else if (mode === 'weave') {
      const t = u * tau * 1.15 + lane * Math.PI + angle;
      x = (u - .5) * 1.65;
      y = Math.sin(t) * (.3 + .13 * intensity);
      z = Math.cos(t) * .35;
      rotation = Math.atan2(Math.cos(t) * (.3 + .13 * intensity) * tau * 1.15, 1.65);
      scale = .85 + .22 * (z + .35);
    } else {
      const ring = i % 3, slot = Math.floor(i / 3), slots = Math.ceil((count - ring) / 3);
      const t = slot / Math.max(1, slots) * tau + ring * .42 + angle * (ring === 1 ? -1 : 1);
      const radius = .4 + ring * .2;
      x = Math.cos(t) * radius; y = Math.sin(t) * radius * .62;
      z = Math.sin(t + ring * .7) * (.25 + intensity * .18);
      rotation = t + Math.PI / 2; scale = .8 + (z + .43) * .35;
    }
    // Rotation is a periodic pose channel. Keep its target around [-pi, pi].
    rotation = Math.atan2(Math.sin(rotation), Math.cos(rotation));
    return {id: `kinetic-${i}`, x, y, z, rotation, scale, opacity: .7 + (z + .43) * .25};
  });
}

/** One owned frame scheduler; no consumer RAF is needed for onChange rendering.
 * play starts continuous playback; resume restores the prior paused activity
 * (including a finite pose transition). pause freezes all channels; replay preserves
 * the current pose and velocity while restarting phase. pose(mode?) settles to
 * phase-zero and stops.
 * setMode/setIntensity preserve every position/velocity. Explicit paused input
 * settles the selected formation while timeline phase stays paused, then freezes.
 * Idle/posed changes also settle; setMode alone never starts looping playback.
 * seek(progress, {immediate:false}) holds a selected cycle position in [0,1].
 * Paused seek settles toward that pose without restarting timeline playback.
 * immediate:true is explicit direct scrubbing: snap channels and zero velocity.
 * Running seek reanchors its clock; reduced motion shows the selected pose with
 * no RAF. state.progress preserves selected endpoint 1 while cyclic phase is 0.
 * replay/pose reset progress to 0. Pause still freezes all motion until new input.
 * state.points expose position + per-channel velocity + target for debugging;
 * they are app annotations, not independent pixel/smoothness evidence.
 * Renderer callback errors cancel scheduling, retain pose and expose paused
 * state.error {name,message}; the original exception is rethrown. Fix the renderer
 * then play/resume to recover. Constructor failures dispose owned resources.
 * Reduced motion snaps to composed poses and schedules no decorative frames.
 * Hidden tabs suspend phase time. dispose owns only controllers/listeners, not
 * consumer SVG/Three resources. All injected scheduler calls keep their receiver.
 */
export function createKineticField({count = 36, mode = 'pulse', intensity = .65, periodMs = 6000,
  frequency = 3, onChange = () => {}, clock = {now: () => globalThis.performance.now()},
  schedule = {requestFrame: callback => globalThis.requestAnimationFrame(callback), cancelFrame: handle => globalThis.cancelAnimationFrame(handle)},
  document = globalThis.document,
  media = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
} = {}) {
  count = checkedCount(count); checkedMode(mode); intensity = checkedIntensity(intensity);
  if (!Number.isFinite(periodMs) || periodMs <= 0 || !Number.isFinite(frequency) || frequency <= 0) throw new TypeError('periodMs and frequency must be positive finite numbers');
  if (typeof onChange !== 'function' || typeof clock?.now !== 'function' || typeof schedule?.requestFrame !== 'function' || typeof schedule?.cancelFrame !== 'function') throw new TypeError('Provide callbacks and clock/schedule adapters');
  let reducedMotion = Boolean(media?.matches), status = 'idle', resumeStatus = 'running', callbackFailure = null;
  let elapsedMs = 0, progress = 0, seeking = false, last = 0, pending = null, revision = 0;
  const points = kineticFormation(mode, count, {intensity}).map(pose => ({id: pose.id, springs: Object.fromEntries(channels.map(key => [key, createSpring({value: pose[key], frequency, reducedMotion})]))}));
  const now = () => finite(clock.now(), 'clock');
  const alive = () => {if (status === 'disposed') throw new Error('Kinetic field disposed');};
  const phase = () => elapsedMs / periodMs % 1;
  const snapshot = () => ({mode, intensity, count, status, reducedMotion, elapsedMs, progress, seeking, phase: phase(),
    error: callbackFailure === null ? null : {name: callbackFailure instanceof Error ? callbackFailure.name : 'Error', message: callbackFailure instanceof Error ? callbackFailure.message : String(callbackFailure)},
    settled: points.every(point => channels.every(key => point.springs[key].state.settled)),
    points: points.map(point => ({id: point.id,
      ...Object.fromEntries(channels.map(key => [key, point.springs[key].state.value])),
      velocity: Object.fromEntries(channels.map(key => [key, point.springs[key].state.velocity])),
      target: Object.fromEntries(channels.map(key => [key, point.springs[key].state.target]))}))});
  function emit() {
    try {onChange(snapshot());}
    catch (error) {
      if (status !== 'disposed') {
        if (status === 'running' || status === 'posing') resumeStatus = status;
        stop(); seeking = false; status = 'paused'; callbackFailure = error;
      }
      throw error; // Exact consumer exception: no generic suppression or retry loop.
    }
  }
  function targets(immediate = false) {
    const poses = kineticFormation(mode, count, {phase: phase(), intensity});
    points.forEach((point, i) => channels.forEach(key => {
      let target = poses[i][key];
      // Unwrap angles around current rotation: crossings at +/-pi must not spin
      // the long way round. This changes targets only, never current velocity.
      if (key === 'rotation') {const x = point.springs[key].state.value; target = x + Math.atan2(Math.sin(target - x), Math.cos(target - x));}
      if (immediate) point.springs[key].setReducedMotion(true);
      point.springs[key].retarget(target);
      if (immediate) point.springs[key].setReducedMotion(reducedMotion);
    }));
  }
  function stop() {revision++; if (pending !== null) {schedule.cancelFrame(pending); pending = null;}}
  function step(notify = true) {
    if (status !== 'running' && status !== 'posing' && !(status === 'paused' && seeking)) return;
    const time = now(), deltaMs = Math.max(0, time - last); last = Math.max(last, time);
    if (status === 'running' && !reducedMotion && deltaMs > 0) {elapsedMs += deltaMs; progress = phase();}
    // Full elapsed time determines phase and spring integration. Rendering cadence
    // cannot slow the lifecycle by repeatedly clamping its timestep.
    if (status === 'running') targets();
    points.forEach(point => channels.forEach(key => point.springs[key].advance(deltaMs / 1000)));
    if (snapshot().settled) {if (status === 'posing') status = 'posed'; if (status === 'paused') seeking = false;}
    if (notify) emit();
  }
  function queue() {
    if (pending !== null || reducedMotion || document?.hidden || !(['running', 'posing'].includes(status) || status === 'paused' && seeking)) return;
    const token = revision;
    pending = schedule.requestFrame(() => {if (token !== revision || status === 'disposed') return; pending = null; step(); queue();});
  }
  function activate(next) {
    callbackFailure = null; seeking = false; last = now(); resumeStatus = next; status = document?.hidden ? 'suspended' : next;
    targets(); if (reducedMotion && status === 'posing') status = 'posed'; emit(); queue(); return snapshot();
  }
  function resume() {alive(); return status === 'paused' || status === 'suspended' && !document?.hidden ? activate(resumeStatus) : snapshot();}
  function play() {alive(); if (status === 'running' || status === 'suspended' && resumeStatus === 'running') return snapshot(); stop(); return activate('running');}
  function pause() {
    alive(); if (status === 'running' || status === 'posing') {step(false); if (status === 'disposed') return snapshot(); resumeStatus = status === 'posing' ? 'posing' : 'running';}
    if (['running', 'posing', 'suspended'].includes(status) || seeking) {stop(); seeking = false; status = 'paused'; emit();} return snapshot();
  }
  function replay() {alive(); stop(); elapsedMs = 0; progress = 0; return activate('running');}
  function pose(next = mode) {alive(); checkedMode(next); stop(); mode = next; elapsedMs = 0; progress = 0; return activate('posing');}
  function seek(next, {immediate = false} = {}) {
    alive(); finite(next, 'progress');
    if (next < 0 || next > 1) throw new RangeError('progress must be in [0,1]');
    if (typeof immediate !== 'boolean') throw new TypeError('immediate must be boolean');
    stop(); elapsedMs = next * periodMs; progress = next; last = now(); targets(immediate);
    seeking = status === 'paused' && !reducedMotion && !snapshot().settled;
    if (status === 'idle' || status === 'posed') status = snapshot().settled ? 'posed' : 'posing';
    emit(); queue(); return snapshot();
  }
  function retarget(nextMode, nextIntensity) {
    alive(); mode = checkedMode(nextMode); intensity = checkedIntensity(nextIntensity); targets();
    if (status === 'idle' || status === 'posed') {last = now(); status = reducedMotion ? 'posed' : 'posing';}
    else if (status === 'paused') {last = now(); seeking = !reducedMotion && !snapshot().settled;}
    emit(); queue(); return snapshot();
  }
  function preference() {
    if (status === 'disposed') return; stop(); reducedMotion = Boolean(media.matches); last = now();
    points.forEach(point => channels.forEach(key => point.springs[key].setReducedMotion(reducedMotion)));
    targets(); if (reducedMotion) {seeking = false; if (status === 'posing') status = 'posed';} emit(); queue();
  }
  function visibility() {
    if (document.hidden && ['running', 'posing'].includes(status)) {
      step(); if (status === 'disposed' || !['running', 'posing'].includes(status)) return;
      resumeStatus = status; stop(); status = 'suspended'; emit();
    } else if (document.hidden && status === 'paused' && seeking) stop();
    else if (!document.hidden && status === 'suspended') activate(resumeStatus);
    else if (!document.hidden && status === 'paused' && seeking) {last = now(); queue();}
  }
  document?.addEventListener('visibilitychange', visibility); media?.addEventListener('change', preference);
  function dispose() {if (status === 'disposed') return; stop(); seeking = false; status = 'disposed'; points.forEach(point => channels.forEach(key => point.springs[key].dispose())); document?.removeEventListener('visibilitychange', visibility); media?.removeEventListener('change', preference);}
  try {emit();} catch (error) {dispose(); throw error;}
  return {play, pause, resume, replay, pose, seek,
    setMode: next => retarget(next, intensity), setIntensity: next => retarget(mode, next),
    get state() {return snapshot();},
    dispose
  };
}
