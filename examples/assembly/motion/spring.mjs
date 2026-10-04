/** Exact critically damped motion. Retargeting preserves position AND velocity. */
export function createSpring({value = 0, target = value, velocity = 0, frequency = 3, reducedMotion = false} = {}) {
  if (![value, target, velocity, frequency].every(Number.isFinite) || frequency <= 0) throw new TypeError('Finite spring values and positive frequency required');
  let x = reducedMotion ? target : value, v = reducedMotion ? 0 : velocity, goal = target, reduced = Boolean(reducedMotion), disposed = false;
  const omega = 2 * Math.PI * frequency;
  const state = () => ({value: x, velocity: v, target: goal, settled: Math.abs(x - goal) < .001 && Math.abs(v) < .001});
  const alive = () => {if (disposed) throw new Error('Spring disposed');};
  return {
    get state() {return state();},
    retarget(next) {alive(); if (!Number.isFinite(next)) throw new TypeError('Finite target required'); goal = next; if (reduced) {x = goal; v = 0;} return state();},
    advance(seconds) {
      alive(); if (!Number.isFinite(seconds) || seconds < 0) throw new TypeError('Nonnegative finite elapsed time required');
      if (reduced) {x = goal; v = 0; return state();}
      const displacement = x - goal, coefficient = v + omega * displacement, decay = Math.exp(-omega * seconds);
      x = goal + (displacement + coefficient * seconds) * decay;
      v = (v - omega * coefficient * seconds) * decay;
      if (state().settled) {x = goal; v = 0;}
      return state();
    },
    setReducedMotion(next) {alive(); reduced = Boolean(next); if (reduced) {x = goal; v = 0;} return state();},
    dispose() {disposed = true; v = 0;}
  };
}

/** Consumer owns the value mapping; only one frame loop exists, even during reversals. */
export function animateSpring(render, options = {}) {
  const spring = createSpring(options), media = options.media ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
  const raf = options.requestFrame ?? globalThis.requestAnimationFrame.bind(globalThis);
  const caf = options.cancelFrame ?? globalThis.cancelAnimationFrame.bind(globalThis);
  let frame = null, last = null, disposed = false;
  const paint = () => render(spring.state);
  const tick = time => {
    frame = null; if (disposed) return;
    spring.advance(last === null ? 0 : Math.max(0, (time - last) / 1000)); last = time; paint();
    if (!spring.state.settled) frame = raf(tick); else last = null;
  };
  const schedule = () => {if (frame === null && !spring.state.settled) frame = raf(tick);};
  const preference = () => {spring.setReducedMotion(Boolean(media?.matches ?? options.reducedMotion)); paint(); if (spring.state.settled && frame !== null) {caf(frame); frame = null; last = null;} else schedule();};
  media?.addEventListener?.('change', preference); preference(); paint(); schedule();
  return {
    get state() {return spring.state;},
    retarget(value) {if (disposed) throw new Error('Animation disposed'); spring.retarget(value); paint(); schedule();},
    dispose() {if (disposed) return; disposed = true; if (frame !== null) caf(frame); media?.removeEventListener?.('change', preference); spring.dispose();}
  };
}
