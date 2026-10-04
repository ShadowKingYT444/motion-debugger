import {animateSpring} from './spring.mjs';

export const clamp = value => Math.min(1, Math.max(0, value));
export function chapterState(progress, count) {
  if (!Number.isInteger(count) || count < 1) throw new TypeError('At least one chapter required');
  const phase = clamp(progress) * count;
  return Array.from({length: count}, (_, i) => ({index: i, progress: clamp(phase - i), weight: clamp(1 - Math.abs(phase - (i + .5)))}));
}

/** A sticky scene advances from an actual scroll range, with chapter-specific callbacks. */
export function createScrollChapters({root, chapters, render, scene, viewport = globalThis}) {
  if (!root || !chapters?.length || typeof render !== 'function') throw new TypeError('root, chapters and render required');
  let disposed = false;
  const media = viewport.matchMedia('(prefers-reduced-motion: reduce)');
  const paint = ({value}) => {
    const states = chapterState(value, chapters.length);
    const active = Math.min(chapters.length - 1, Math.floor(clamp(value) * chapters.length));
    root.dataset.chapter = String(active); root.dataset.progress = value.toFixed(4);
    chapters.forEach((element, i) => {element.dataset.active = String(i === active);});
    render({progress: value, chapters: states, active, reducedMotion: media.matches});
  };
  const animation = animateSpring(paint, {frequency: 2.2, media, requestFrame: viewport.requestAnimationFrame.bind(viewport), cancelFrame: viewport.cancelAnimationFrame.bind(viewport)});
  const measure = () => {
    if (disposed) return;
    const rect = root.getBoundingClientRect(), range = Math.max(1, rect.height - viewport.innerHeight);
    animation.retarget(clamp(-rect.top / range));
  };
  viewport.addEventListener('scroll', measure, {passive: true}); viewport.addEventListener('resize', measure);
  const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
  observer?.observe(root); measure();
  return {measure, dispose() {disposed = true; animation.dispose(); observer?.disconnect(); viewport.removeEventListener('scroll', measure); viewport.removeEventListener('resize', measure); scene?.dispose?.();}};
}
