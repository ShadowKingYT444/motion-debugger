import {z} from 'zod';

const id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9._-]{0,63}$/);
const finite = z.number().finite();
const nonnegative = finite.nonnegative();
const relativeFile = z.string().min(1).max(512).refine(value => !value.startsWith('/') && !value.includes('\\') && !value.split('/').some(part => part === '..' || part === '.' || !part) && !/^[a-zA-Z]:/.test(value) && !value.split('/').some(part => /^\.env(?:$|[._-])/.test(part) || ['.aws','.ssh','.git','.codex','.claude','node_modules'].includes(part)), 'Expected a project-relative file');
const source = z.object({file:relativeFile,line:z.number().int().positive(),endLine:z.number().int().positive().optional()}).strict().refine(value => value.endLine === undefined || value.endLine >= value.line, 'Invalid source range');
const position = z.object({x:finite,y:finite,z:finite.optional(),unit:z.enum(['css-px','scene-unit']),space:z.enum(['screen','world','parent-local'])}).strict().refine(value => value.space !== 'screen' || value.unit === 'css-px', 'Screen positions require CSS pixels');
export const transitionPoseSchema = z.object({position,orientationRad:z.tuple([finite,finite,finite]).optional(),scale:z.tuple([finite.positive(),finite.positive(),finite.positive()]).optional(),opacity:finite.min(0).max(1).optional()}).strict();
const actor = z.object({
  id,
  binding:z.discriminatedUnion('kind',[
    z.object({kind:z.enum(['dom','svg']),selector:z.string().min(1).max(1024)}).strict(),
    z.object({kind:z.literal('three'),objectId:id,cameraId:id}).strict()
  ]),
  sources:z.array(source).min(1).max(16),
  protectedAttributes:z.array(z.enum(['geometry','material','layout','copy','asset','camera','interaction'])).min(1).max(7)
}).strict();
const beat = z.object({id,actorIds:z.array(id).min(1).max(24),trigger:z.string().min(1).max(256),purpose:z.string().min(1).max(512),from:transitionPoseSchema,to:transitionPoseSchema,after:z.array(id).max(24),overlapMs:nonnegative.max(10000),durationMs:finite.positive().max(60000)}).strict();
const acceptanceActor = z.object({actorId:id,destination:transitionPoseSchema,positionToleranceCssPx:nonnegative,orientationToleranceRad:nonnegative.max(Math.PI),maxStepAt60HzPx:finite.positive().optional(),maxResponseMs:finite.positive(),maxSettlingMs:finite.positive(),requiredTravelCssPx:nonnegative.optional(),continuity:z.enum(['position-and-velocity','position','none']),identityRequired:z.boolean()}).strict();
/** Explicit clocks and coordinate units. This describes a bounded transition, not the cyclic app state machine. */
export const transitionPlanSchema = z.object({
  schemaVersion:z.literal(1),id,clock:z.enum(['browser-monotonic-ms','controlled-preview-ms']),
  actors:z.array(actor).min(1).max(24),beats:z.array(beat).min(1).max(24),
  inputPolicy:z.object({mode:z.enum(['retarget','direct-scrub','cut']),winner:z.literal('latest-input'),carry:z.enum(['position-and-velocity','none'])}).strict(),
  acceptance:z.object({usefulCompletion:z.string().min(1).max(1024),forbiddenVisible:z.array(z.string().min(1).max(1024)).max(32),reducedMotion:z.enum(['meaningful-final-pose','minimal-transition']),actors:z.array(acceptanceActor).min(1).max(24)}).strict(),
  edits:z.object({permittedFiles:z.array(relativeFile).min(1).max(128),protectedFiles:z.array(relativeFile).max(128),parameters:z.array(z.enum(['pose-path','phase-overlap','travel-duration','spring-response','label-handoff','camera-transition'])).min(1).max(6)}).strict()
}).strict().superRefine((plan,ctx) => {
  const issue = (message:string) => ctx.addIssue({code:'custom',message});
  for (const [label,values] of [['actors',plan.actors.map(actor => actor.id)],['beats',plan.beats.map(beat => beat.id)],['acceptance actors',plan.acceptance.actors.map(actor => actor.actorId)],['permitted files',plan.edits.permittedFiles],['protected files',plan.edits.protectedFiles],['parameters',plan.edits.parameters]] as const) if(new Set(values).size !== values.length) issue(`Duplicate ${label}`);
  const physicalIds = plan.actors.map(actor => actor.binding.kind === 'three' ? `three:${actor.binding.objectId}` : `dom:${actor.binding.selector}`);
  if(new Set(physicalIds).size !== physicalIds.length) issue('Duplicate physical actor binding');
  if (plan.actors.filter(actor => actor.binding.kind !== 'three').length > 8 || plan.actors.filter(actor => actor.binding.kind === 'three').length > 16) issue('Actor limit: eight DOM/SVG and sixteen scene actors');
  const actorIds = new Set(plan.actors.map(actor => actor.id)), beats = new Map(plan.beats.map(beat => [beat.id,beat]));
  for(const beat of plan.beats) {
    if(new Set(beat.actorIds).size !== beat.actorIds.length || new Set(beat.after).size !== beat.after.length) issue(`Duplicate references in beat ${beat.id}`);
    for(const actorId of beat.actorIds) if(!actorIds.has(actorId)) issue(`Missing actor ${actorId}`);
    for(const dependency of beat.after) if(!beats.has(dependency)) issue(`Missing beat ${dependency}`);
    if(beat.from.position.space !== beat.to.position.space || beat.from.position.unit !== beat.to.position.unit) issue(`Inconsistent pose coordinate space in ${beat.id}`);
    if(beat.overlapMs > beat.durationMs || !beat.after.length && beat.overlapMs > 0) issue(`Invalid overlap in ${beat.id}`);
  }
  const visiting = new Set<string>(),done = new Set<string>();
  function visit(id:string) {if(visiting.has(id)){issue(`Cyclic phase dependency at ${id}`);return;}if(done.has(id))return;visiting.add(id);for(const dependency of beats.get(id)?.after ?? [])visit(dependency);visiting.delete(id);done.add(id);}
  for(const beat of plan.beats)visit(beat.id);
  for(const actorId of actorIds) if(!plan.acceptance.actors.some(item => item.actorId === actorId)) issue(`Missing acceptance for ${actorId}`);
  for(const accepted of plan.acceptance.actors) {if(!actorIds.has(accepted.actorId))issue(`Unknown acceptance actor ${accepted.actorId}`);if(plan.inputPolicy.mode !== 'retarget' && accepted.continuity !== 'none')issue('Scrubbing and cuts cannot require velocity continuity');}
  if((plan.inputPolicy.mode === 'retarget') !== (plan.inputPolicy.carry === 'position-and-velocity')) issue('Retarget must carry position and velocity; scrub/cut carry none');
  for(const protectedFile of plan.edits.protectedFiles)if(plan.edits.permittedFiles.includes(protectedFile))issue(`Protected file is permitted: ${protectedFile}`);
});
export type TransitionPlan = z.infer<typeof transitionPlanSchema>;
export type TransitionActor = TransitionPlan['actors'][number];
export type TransitionBeat = TransitionPlan['beats'][number];
export function validateTransitionPlan(input:unknown):TransitionPlan {return transitionPlanSchema.parse(input);}
export function transitionBeatOrder(input:TransitionPlan):string[] {
  const plan = validateTransitionPlan(input),beats = new Map(plan.beats.map(beat => [beat.id,beat])),ordered:string[] = [],seen = new Set<string>();
  function visit(id:string){if(seen.has(id))return;for(const after of beats.get(id)!.after)visit(after);seen.add(id);ordered.push(id);}
  for(const beat of plan.beats)visit(beat.id);return ordered;
}
/** Registration is explicit; a logical identity cannot silently acquire another renderer object. */
export function validateTransitionBindings(input:TransitionPlan,registeredIds:readonly string[]):void {
  const plan = validateTransitionPlan(input);
  if(new Set(registeredIds).size !== registeredIds.length)throw new Error('Duplicate registered actor IDs');
  for(const actor of plan.actors)if(!registeredIds.includes(actor.id))throw new Error(`Missing binding for actor ${actor.id}`);
}
