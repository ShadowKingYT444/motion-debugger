/** Scripted UI choreography, not backend work. Feed its poses to your renderer;
 * keep visual spring catch-up separate from this sequence's elapsed clock.
 * Reduced motion keeps task duration but paints only meaningful phase poses.
 */
export function createElapsedSequence({phases, onChange = () => {}, onComplete = () => {},
  clock = {now: () => globalThis.performance.now()},
  schedule = {
    requestFrame: callback => globalThis.requestAnimationFrame(callback),
    cancelFrame: handle => globalThis.cancelAnimationFrame(handle),
    setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimeout: handle => globalThis.clearTimeout(handle)
  }, document = globalThis.document,
  media = typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia('(prefers-reduced-motion: reduce)') : undefined
} = {}) {
  if (!Array.isArray(phases) || !phases.length) throw new TypeError('Provide one or more finite positive-duration phases');
  const ids = new Set();
  const plan = phases.map(phase => {
    if (!phase || typeof phase.id !== 'string' || !phase.id.trim() || ids.has(phase.id) || !Number.isFinite(phase.durationMs) || phase.durationMs <= 0) throw new TypeError('Phase IDs must be unique and durations positive and finite');
    ids.add(phase.id); return Object.freeze({...phase});
  });
  const durationMs = plan.reduce((sum, phase) => sum + phase.durationMs, 0);
  if (!Number.isFinite(durationMs) || durationMs > Number.MAX_SAFE_INTEGER) throw new RangeError('Total sequence duration must be finite and safely measurable');
  if (typeof onChange !== 'function' || typeof onComplete !== 'function' || typeof clock?.now !== 'function' || ['requestFrame','cancelFrame','setTimeout','clearTimeout'].some(name => typeof schedule?.[name] !== 'function')) throw new TypeError('Provide callbacks and a complete clock/schedule adapter');
  let status = 'idle', elapsedMs = 0, anchorElapsed = 0, anchorTime = 0;
  let reducedMotion = Boolean(media?.matches), pending = null, revision = 0, epoch = 0, completedEpoch = -1;
  const now = () => {const value = clock.now(); if (!Number.isFinite(value)) throw new TypeError('Clock must return finite monotonic milliseconds'); return value;};
  const hidden = () => Boolean(document?.hidden);
  const assertLive = () => {if (status === 'disposed') throw new Error('Sequence disposed');};
  function phasePosition() {
    let index = 0, start = 0;
    while (index < plan.length - 1 && elapsedMs >= start + plan[index].durationMs) start += plan[index++].durationMs;
    return {index, start, end: start + plan[index].durationMs};
  }
  function snapshot() {
    const {index, start} = phasePosition(), phase = plan[index];
    const localElapsed = Math.min(phase.durationMs, Math.max(0, elapsedMs - start));
    const phaseProgress = localElapsed / phase.durationMs;
    return Object.freeze({status, elapsedMs, durationMs, progress: elapsedMs / durationMs, reducedMotion,
      phase: Object.freeze({id: phase.id, index, durationMs: phase.durationMs, elapsedMs: localElapsed, progress: phaseProgress, pose: phase.pose}),
      poseProgress: reducedMotion && !['idle','cancelled'].includes(status) ? 1 : phaseProgress});
  }
  const emit = () => onChange(snapshot());
  function stopPending() {
    revision++;
    if (pending) {schedule[pending.kind === 'frame' ? 'cancelFrame' : 'clearTimeout'](pending.handle); pending = null;}
  }
  function sample() {
    if (status !== 'running') return;
    const currentEpoch = epoch;
    elapsedMs = Math.min(durationMs, Math.max(elapsedMs, anchorElapsed + Math.max(0, now() - anchorTime)));
    if (elapsedMs === durationMs) {status = 'completed'; stopPending(); completedEpoch = currentEpoch;}
    emit();
    if (status === 'completed' && epoch === currentEpoch && completedEpoch === currentEpoch) {
      completedEpoch = -1; onComplete(snapshot());
    }
  }
  function queue() {
    if (status !== 'running' || pending) return;
    const token = revision;
    const callback = () => {
      if (token !== revision || status !== 'running') return;
      pending = null; sample(); queue();
    };
    if (reducedMotion) {
      const delay = Math.min(2147483647, Math.max(1, Math.ceil(phasePosition().end - elapsedMs)));
      pending = {kind:'timer', handle:schedule.setTimeout(callback, delay)};
    } else pending = {kind:'frame', handle:schedule.requestFrame(callback)};
  }
  function activate() {
    anchorElapsed = elapsedMs; anchorTime = now(); status = hidden() ? 'suspended' : 'running'; emit(); queue(); return snapshot();
  }
  function restart() {
    assertLive(); stopPending(); epoch++; elapsedMs = 0; completedEpoch = -1; return activate();
  }
  function resume() {
    assertLive();
    if (status === 'paused' || status === 'suspended' && !hidden()) return activate();
    return snapshot();
  }
  function play() {
    assertLive();
    if (status === 'running' || status === 'suspended') return snapshot();
    return status === 'paused' ? resume() : restart();
  }
  function pause() {
    assertLive();
    if (status === 'running') sample();
    if (status === 'running' || status === 'suspended') {stopPending(); status = 'paused'; emit();}
    return snapshot();
  }
  function cancel() {
    assertLive(); stopPending(); epoch++; completedEpoch = -1; elapsedMs = 0; status = 'cancelled'; emit(); return snapshot();
  }
  const visibility = () => {
    if (hidden() && status === 'running') {
      sample();
      if (status === 'running') {stopPending(); status = 'suspended'; emit();}
    } else if (!hidden() && status === 'suspended') activate();
  };
  const preference = () => {
    if (status === 'disposed') return;
    if (status === 'running') sample();
    if (status === 'disposed') return;
    stopPending(); reducedMotion = Boolean(media.matches);
    if (status === 'running') {anchorElapsed = elapsedMs; anchorTime = now();}
    emit(); queue();
  };
  document?.addEventListener('visibilitychange', visibility);
  media?.addEventListener('change', preference);
  return {play, pause, resume, cancel, replay: restart, get state() {return snapshot();}, dispose() {
    if (status === 'disposed') return;
    stopPending(); epoch++; status = 'disposed';
    document?.removeEventListener('visibilitychange', visibility); media?.removeEventListener('change', preference);
  }};
}
