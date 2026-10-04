import {lstat, readFile, realpath} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export type MotionRecipeId = 'spring' | 'scroll-chapters' | 'colony-scene' | 'task-handoff' | 'drawer' | 'elapsed-sequence' | 'kinetic-field';
export interface MotionRecipeMetadata {
  id: MotionRecipeId;
  title: string;
  description: string;
  dependencies: readonly string[];
  files: readonly string[];
}
const entries: readonly MotionRecipeMetadata[] = [
  {id:'spring',title:'Interruptible spring',description:'Exact critically damped retargeting preserves position and velocity; reduced motion snaps to the meaningful target.',dependencies:[],files:['recipes/spring.mjs']},
  {id:'scroll-chapters',title:'Scroll chapter choreography',description:'Measured sticky scroll range drives chapter state, a single spring and a consumer scene renderer.',dependencies:[],files:['recipes/scroll-chapters.mjs','recipes/spring.mjs']},
  {id:'colony-scene',title:'Articulated colony scene',description:'Real meshes, camera and lighting; articulated walkers converge from orbital lanes into branching queues.',dependencies:['Consumer supplies its installed Three.js module and owned renderer'],files:['recipes/colony-scene.mjs','recipes/spring.mjs']},
  {id:'task-handoff',title:'Worker task handoff',description:'A persistent task token retargets between worker cards; completion fires only after arrival.',dependencies:[],files:['recipes/task-handoff.mjs','recipes/spring.mjs']},
  {id:'elapsed-sequence',title:'Elapsed task sequence',description:'Monotonic scripted phases with pause, resume, cancellation, hidden-tab suspension and meaningful reduced-motion poses; task progress is independent of rendering cadence.',dependencies:[],files:['recipes/elapsed-sequence.mjs']},
  {id:'kinetic-field',title:'Kinetic identity field',description:'Original Pulse, Weave and Orbit formations with stable object identity, multiple continuous spring channels, elapsed phase and reduced-motion poses. Consumer owns SVG/Three geometry and lighting.',dependencies:[],files:['recipes/kinetic-field.mjs','recipes/spring.mjs']},
  {id:'drawer',title:'Reversible modal drawer',description:'Native dialog focus containment with velocity-preserving reversal, Escape and reduced motion.',dependencies:[],files:['recipes/drawer.mjs','recipes/spring.mjs']}
];
const references = ['references/usage.md','references/evidence.md'] as const;
/** Return fresh metadata; callers cannot mutate the server's allowlist. */
export function motionCatalog(): MotionRecipeMetadata[] {
  return entries.map(entry => ({...entry,dependencies:[...entry.dependencies],files:[...entry.files]}));
}
async function catalogRoot(): Promise<string> {
  // Source, npm bundled entry points, and standalone plugin bundle; never the cwd.
  const candidates = [new URL('../../plugin/motion-debugger/skills/motion/',import.meta.url),new URL('../skills/motion/',import.meta.url)];
  for (const candidate of candidates) {
    const directory = fileURLToPath(candidate);
    try {
      const stat = await lstat(directory);
      if (stat.isSymbolicLink()) throw new Error('Motion catalog directory must not be a symlink');
      if (!stat.isDirectory()) continue;
      const root = await realpath(directory), marker = path.join(root,'SKILL.md');
      if ((await lstat(marker)).isSymbolicLink() || await realpath(marker) !== marker) throw new Error('Motion catalog marker must not be a symlink');
      return root;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
  }
  throw new Error('Packaged motion recipe catalog is missing');
}
export interface MotionRecipeSource extends MotionRecipeMetadata {
  sources: {path:string;language:'javascript'|'markdown';source:string}[];
}
/** Read only shipped allowlisted sources. No caller-controlled paths or network access. */
export async function motionRecipe(id: string): Promise<MotionRecipeSource> {
  const entry = entries.find(item => item.id === id);
  if (!entry) throw new Error(`Unknown motion recipe; choose ${entries.map(item=>item.id).join(', ')}`);
  const root = await catalogRoot();
  const sources: MotionRecipeSource['sources'] = [];
  for (const relative of [...entry.files,...references]) {
    const file = path.join(root,relative), stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink() || await realpath(file) !== file) throw new Error('Motion recipe source must be an ordinary packaged file');
    if (stat.size > 65536) throw new Error('Motion recipe source exceeds 64 KiB');
    const source = await readFile(file,'utf8');
    if (Buffer.byteLength(source,'utf8') > 65536) throw new Error('Motion recipe source exceeds 64 KiB');
    sources.push({path:relative,language:relative.endsWith('.mjs')?'javascript':'markdown',source});
  }
  return {...entry,dependencies:[...entry.dependencies],files:[...entry.files],sources};
}
