import {animateSpring} from './spring.mjs';

/** A persistent task token retargets between worker cards without position resets. */
export function createTaskHandoff({stage, token, workers, gap = 12, onArrive = () => {}}) {
  if (!stage || !token || !workers?.length) throw new TypeError('stage, token and worker elements required');
  if (!Number.isFinite(gap) || gap < 0 || gap > 128) throw new TypeError('Token gap must be 0–128 pixels');
  let current = 0, generation = 0, notified = -1, disposed = false, initialized = false;
  const destinations = () => {
    const root = stage.getBoundingClientRect();
    return workers.map(worker => {const rect = worker.getBoundingClientRect(); return {x: rect.left - root.left + rect.width / 2 - token.offsetWidth / 2, y: rect.top - root.top - token.offsetHeight - gap};});
  };
  let sx, sy;
  const paint = () => {
    if (!initialized) return;
    token.style.transform = `translate3d(${sx.state.value}px, ${sy.state.value}px, 0)`;
    const settled = sx.state.settled && sy.state.settled;
    stage.dataset.handoff = settled ? 'arrived' : 'traveling'; token.dataset.worker = String(current);
    if (settled && notified !== generation) {notified = generation; onArrive({index: current, worker: workers[current]});}
  };
  const initial = destinations()[0];
  sx = animateSpring(paint, {value: initial.x, frequency: 2.4}); sy = animateSpring(paint, {value: initial.y, frequency: 2.4}); initialized = true;
  const send = index => {
    if (disposed) throw new Error('Handoff disposed');
    if (!Number.isInteger(index) || index < 0 || index >= workers.length) throw new RangeError('Worker index out of range');
    current = index; generation++; const point = destinations()[current];
    // Avoid an intermediate callback if reduced motion snaps X before Y is retargeted.
    initialized = false; sx.retarget(point.x); sy.retarget(point.y); initialized = true;
    workers.forEach((worker, i) => {worker.dataset.assigned = String(i === current);}); paint();
  };
  const listeners = workers.map((worker, index) => {const activate = () => send(index); worker.addEventListener('click', activate); return () => worker.removeEventListener('click', activate);});
  const resize = () => send(current); globalThis.addEventListener('resize', resize); paint();
  return {send, get state() {return {worker: current, x: sx.state, y: sy.state};}, dispose() {if (disposed) return; disposed = true; listeners.forEach(remove => remove()); globalThis.removeEventListener('resize', resize); sx.dispose(); sy.dispose();}};
}
