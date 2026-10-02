import type { CaptureRecipe } from '../../packages/core/types';

export type ExampleScenario = 'kinetic' | 'drawer' | 'reveal' | 'cursor';
export const sourceRefs = {
  'courier-continuity': { file: 'src/examples/KineticScene.tsx', line: 99, endLine: 105 },
  'drawer-continuity': { file: 'src/examples/Examples.tsx', line: 42, endLine: 46 },
  'reveal-request': { file: 'src/examples/Examples.tsx', line: 83, endLine: 89 },
  'reveal-reserved-space': { file: 'src/examples/examples.css', line: 88, endLine: 89 },
  'cursor-bounds': { file: 'src/examples/Examples.tsx', line: 111, endLine: 114 },
};

/** Seeded, original examples. Repairs are source branches, not claims of autonomous AI edits. */
export function exampleRecipes(origin: string): Record<ExampleScenario, { before: CaptureRecipe; after: CaptureRecipe }> {
  const build = (scenario: ExampleScenario, mode: 'baseline' | 'fixed'): CaptureRecipe => {
    const common = { url: new URL(`/examples?scenario=${scenario}&mode=${mode}${scenario === 'kinetic' ? '&autoplay=0' : ''}`, origin).href,
      label: `${scenario} / ${mode === 'baseline' ? 'seeded defect' : 'handwritten repair'}`,
      viewport: { width: 1280, height: 1000 }, reducedMotion: 'no-preference' as const, sourceRefs };
    if (scenario === 'kinetic') return { ...common, selector: '#courier-target', durationMs: 4400,
      actions: [{ action: 'click', selector: '#courier-replay' }, { action: 'wait', ms: 4000 }, { action: 'wait', ms: 200 }],
      contract: { maxStepAt60HzPx: 40, maxReplacements: 0, final: { attributes: { 'data-state': 'delivered' }, visible: true } } };
    if (scenario === 'drawer') return { ...common, selector: '#product-drawer', durationMs: 2400,
      actions: [{ action: 'click', selector: '#open-details' }, { action: 'wait', ms: 180 },
        { action: 'key', key: 'Escape' }, { action: 'wait', ms: 110 },
        { action: 'click', selector: '#open-details' }, { action: 'wait', ms: 1100 }],
      contract: { maxStepAt60HzPx: 40, maxReplacements: 0, final: { attributes: { 'data-state': 'open' }, visible: true, textIncludes: 'Warm porcelain' } } };
    if (scenario === 'reveal') return { ...common, selector: '#reveal-card', durationMs: 1800,
      actions: [{ action: 'click', selector: '#load-materials' }, { action: 'wait', ms: 1200 }],
      contract: { maxHeightStepPx: 2, maxReplacements: 0, final: { attributes: { 'data-state': 'ready' }, visible: true, textIncludes: 'Good things,' } } };
    return { ...common, selector: '#buddy-pupil', durationMs: 1600,
      actions: [{ action: 'hover', selector: '#gaze-left' }, { action: 'wait', ms: 90 },
        { action: 'hover', selector: '#gaze-right' }, { action: 'wait', ms: 90 },
        { action: 'hover', selector: '#gaze-left' }, { action: 'wait', ms: 700 }],
      contract: { containment: { selector: '#buddy-eye', shape: 'circle', maxOverflowPx: 1, minOpacity: .05 },
        final: { attributes: { 'data-state': 'attentive' }, visible: true } } };
  };
  return Object.fromEntries((['kinetic', 'drawer', 'reveal', 'cursor'] as const).map(scenario => [scenario, { before: build(scenario, 'baseline'), after: build(scenario, 'fixed') }])) as Record<ExampleScenario, { before: CaptureRecipe; after: CaptureRecipe }>;
}
