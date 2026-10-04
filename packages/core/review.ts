import {createHash,randomUUID} from 'node:crypto';
import {writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {capture,inspect,compact,CaptureFailureError} from './capture';
import {compare} from './analysis';
import {RecipeSchema,validateRecipe} from './safety';
import {transitionPlanSchema,validateTransitionBindings,type TransitionPlan} from './transitions';
import {recordedFrames,type RecordedFrame} from './frames';
import type {CaptureRecipe,CoreOptions,MotionCapture,MotionEvent} from './types';

export const ReviewSchema=z.object({
  plan:transitionPlanSchema,recipe:RecipeSchema,
  captureId:z.string().uuid().optional(),priorCaptureId:z.string().uuid().optional(),
  budget:z.object({maxFrames:z.number().int().min(1).max(6).default(6),maxWidth:z.number().int().min(120).max(1280).default(720),maxHeight:z.number().int().min(120).max(960).default(540),detailActorId:z.string().max(80).optional()}).strict().default({maxFrames:6,maxWidth:720,maxHeight:540})
}).strict();
export type ReviewRequest=Omit<z.input<typeof ReviewSchema>,'recipe'> & {recipe:CaptureRecipe};
export type ReviewStatus='passed'|'failed'|'unverified';
const inputs=new Set(['click','keydown','wheel','pointerdown','pointerup','pointercancel','resize','reduced-motion']);
const normalized=(recipe:CaptureRecipe)=>({...recipe,durationMs:recipe.durationMs??2400,viewport:recipe.viewport??{width:1440,height:960}});
function canonical(value:unknown):string {if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.entries(value).filter(([,value])=>value!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([key,value])=>JSON.stringify(key)+':'+canonical(value)).join(',')+'}';return JSON.stringify(value);}

/** One transition's coordinate intent must not silently become a different measurement contract. */
export function reviewRecipe(plan:TransitionPlan,recipe:CaptureRecipe):CaptureRecipe {
  if(plan.clock!=='browser-monotonic-ms')throw new Error('Native review requires browser-monotonic-ms; controlled previews cannot establish timing or FPS');
  validateTransitionBindings(plan,(recipe.actors??[]).map(actor=>actor.id));
  for(const actor of plan.actors){
    const binding=recipe.actors!.find(item=>item.id===actor.id)!;
    if(actor.binding.kind==='three'?binding.kind!=='scene':binding.kind!==actor.binding.kind||!('selector' in binding)||binding.selector!==actor.binding.selector)throw new Error(`Recipe binding differs from transition plan: ${actor.id}`);
    const accepted=plan.acceptance.actors.find(item=>item.actorId===actor.id)!;
    const policy=binding.acceptance?.inputPolicy??'retarget';
    if(policy!==plan.inputPolicy.mode)throw new Error(`Recipe input policy differs from plan: ${actor.id}`);
    if(binding.acceptance?.maxStepAt60HzPx!==accepted.maxStepAt60HzPx)throw new Error(`Recipe continuity bound differs from plan: ${actor.id}`);
    if(binding.acceptance?.continuity!==accepted.continuity)throw new Error(`Recipe continuity policy differs from plan: ${actor.id}`);
    if(binding.acceptance?.minTravelPx!==accepted.requiredTravelCssPx)throw new Error(`Recipe travel bound differs from plan: ${actor.id}`);
    if(accepted.identityRequired&&binding.acceptance?.maxReplacements!==0)throw new Error(`Required identity continuity is not bound: ${actor.id}`);
    if(accepted.destination.position.space==='screen'){
      const destination=binding.acceptance?.destination;
      if(!destination||destination.x!==accepted.destination.position.x||destination.y!==accepted.destination.position.y||destination.tolerancePx!==accepted.positionToleranceCssPx)throw new Error(`Recipe destination differs from plan: ${actor.id}`);
    }
  }
  return recipe;
}

/** Priority beats: flagged event, interruption, trigger, arrival, then peak travel/handoff. */
export function reviewFrameTimes(report:MotionCapture,maxFrames=6):number[] {
  if(!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>6)throw new Error('Review frame budget must be one to six');
  const duration=report.recipe.durationMs??2400;
  const clamp=(t:number)=>Math.round(Math.max(0,Math.min(duration,t)));
  const selected:number[]=[];
  const add=(t:number|undefined)=>{if(t!==undefined&&Number.isFinite(t)&&selected.length<maxFrames){const value=clamp(t);if(!selected.includes(value))selected.push(value)}};
  const flagged=report.actorAnalysis?.actors.flatMap(actor=>actor.findings).find(finding=>finding.sampleTimes.length);
  const center=flagged?.sampleTimes[0]??report.findings.find(finding=>finding.confidence==='contract-violation')?.sampleTimes[0];
  if(center!==undefined){add(center);add(center-60);add(center+60);}
  const events=report.events.filter(event=>event.origin==='browser-observed'&&event.detail.trusted===true&&inputs.has(event.type));
  const interruptions=events.slice(1);
  add(interruptions.find(event=>event.type==='pointercancel'||event.type==='keydown')?.t??interruptions[0]?.t);
  add(events[0]?.t??0);
  add(duration);
  const initial=new Map<string,{x:number;y:number}>();let peak:{t:number;distance:number}|undefined;
  for(const sample of report.actorSamples??[]){if(!sample.screen)continue;if(!initial.has(sample.actorId))initial.set(sample.actorId,sample.screen);const first=initial.get(sample.actorId)!;const distance=Math.hypot(sample.screen.x-first.x,sample.screen.y-first.y);if(!peak||distance>peak.distance)peak={t:sample.t,distance};}add(peak?.t);
  for(const event of interruptions)add(event.t);
  for(const t of [0,duration/2,duration])add(t);
  return selected.sort((a,b)=>a-b);
}
function nearestInput(events:MotionEvent[],t:number) {return events.filter(event=>event.origin==='browser-observed'&&event.detail.trusted===true&&inputs.has(event.type)&&event.t<=t).at(-1);}

export function reviewSummary(report:MotionCapture,plan:TransitionPlan) {
  const actorResults=report.actorAnalysis?.actors??[];
  const transitions=plan.acceptance.actors.map(accepted=>{
    const actor=actorResults.find(actor=>actor.actorId===accepted.actorId);
    const samples=(report.actorSamples??[]).filter(sample=>sample.actorId===accepted.actorId&&sample.screen&&sample.visible);
    const status:ReviewStatus=actor?.status??'unverified';
    const flagged=actor?.findings??[];
    const firstEvent=report.events.find(event=>event.origin==='browser-observed'&&event.detail.trusted===true&&inputs.has(event.type));
    const before=firstEvent?samples.filter(sample=>sample.observedAtMs<=firstEvent.t).at(-1):undefined;
    const response=firstEvent&&before?samples.find(sample=>sample.observedAtMs>firstEvent.t&&Math.hypot(sample.screen!.x-before.screen!.x,sample.screen!.y-before.screen!.y)>.5):undefined;
    const responseMs=response&&firstEvent?response.observedAtMs-firstEvent.t:null;
    const arrival=actor?.metrics.arrivalAtMs,settlingMs=arrival!==null&&arrival!==undefined&&firstEvent&&arrival>=firstEvent.t?arrival-firstEvent.t:null;
    const velocityAssertion=actor?.assertions.find(assertion=>assertion.id===`actor:${accepted.actorId}:velocity`);
    const velocityStatus=accepted.continuity!=='position-and-velocity'?'not-requested':velocityAssertion?.status==='failed'?'failed':actor?.coverage.sufficient&&velocityAssertion?.passed&&velocityAssertion.status==='passed'?'passed':'unverified';

    return {actorId:accepted.actorId,status,pixelStatus:actor?.pixelStatus??'unverified',evidence:actor?.evidence??'missing',measurements:{...actor?.metrics,positionUnit:'css-px',velocityUnit:'css-px/ms',velocityStatus,inputToObservedGeometryChangeMs:responseMs,responseMethod:'First >0.5 CSS px observed geometry change after first trusted browser input; not pixel presentation latency',responseBoundMs:accepted.maxResponseMs,responseStatus:responseMs===null?'unverified':responseMs<=accepted.maxResponseMs?'passed':'failed',settlingMs,settlingStatus:settlingMs===null?'unverified':settlingMs<=accepted.maxSettlingMs?'passed':'failed',destinationStatus:accepted.destination.position.space==='screen'?'measured-geometry':'unverified-projection',orientationStatus:accepted.destination.orientationRad?'unverified':'not-requested',trackingStatus:'unverified'},windows:flagged.slice(0,3).map(finding=>{
      const t=finding.sampleTimes[0]??0,input=nearestInput(report.events,t);
      return {...finding,input:input?{id:input.id,type:input.type,observedAtMs:input.t}:null,fromMs:Math.max(0,t-80),toMs:Math.min(report.recipe.durationMs??2400,t+80),sourceCandidates:plan.actors.find(actor=>actor.id===accepted.actorId)?.sources??[],hypothesis:finding.type==='position-step'?'A retarget may reset the visible pose. Carry the current position into the next target and repeat this unchanged journey.':'Inspect the named actor around this event and test one bounded change against the same contract.',competingExplanation:'Sampling gaps, annotation/render disagreement or approximate video alignment may also explain the apparent change.'};
    })};
  });
  const delivery=report.delivery?.status??'unverified';
  const functionalFailure=delivery==='failed'||report.status==='incomplete';
  const temporalFailure=report.assertions.some(assertion=>assertion.status==='failed'||(!assertion.passed&&assertion.status!=='inconclusive'))||transitions.some(actor=>actor.status==='failed');
  const responseFailure=transitions.some(actor=>actor.measurements.responseStatus==='failed'||actor.measurements.settlingStatus==='failed'||actor.measurements.velocityStatus==='failed');
  const unresolved=transitions.some(actor=>actor.status==='unverified'||actor.measurements.responseStatus==='unverified'||actor.measurements.settlingStatus==='unverified'||actor.measurements.orientationStatus==='unverified'||actor.measurements.destinationStatus==='unverified-projection'||actor.measurements.velocityStatus==='unverified');
  const outcome:ReviewStatus=functionalFailure||temporalFailure||responseFailure?'failed':delivery!=='passed'||!report.metrics.sufficientEvidence||unresolved?'unverified':'passed';
  return {schemaVersion:'motion-review-1',capabilities:{actors:1,plan:1,events:1,clock:'native-replay',legacyCaptureSchema:'2.0',performanceCertificate:false},captureId:report.id,planId:plan.id,summary:{outcome,functionalDelivery:delivery,temporalContracts:temporalFailure?'failed':report.metrics.sufficientEvidence?'passed':'unverified',motionPreference:'unverified',humanTracking:'unverified',nextInspection:transitions.find(actor=>actor.status!=='passed')?.actorId??(temporalFailure?'capture integrity':'Review normal-speed pixels and validate the selected part tracking task')},transitions,environment:report.environment,performanceDiagnostics:report.performanceDiagnostics,sourceHashes:report.events.filter(event=>event.source).map(event=>({eventId:event.id,...event.source})),clip:report.artifacts.video,limitations:[...report.limitations,...report.actorAnalysis?.limitations??[],'Actor geometry and app annotations do not establish aesthetic preference, object tracking accuracy or pixel presentation performance. Orientation and visual tracking remain unverified without a dedicated grader. Event-to-geometry response is an observation, not a displayed-pixel latency.']};
}

/** A native bounded capture, inspection and decode packet; no source mutation or silent retry. */
export async function motionReview(input:ReviewRequest,options:CoreOptions) {
  const started=performance.now(),request=ReviewSchema.parse(input);
  if(options.signal?.aborted)throw new Error('Motion review canceled');
  const recipe=reviewRecipe(request.plan,validateRecipe(request.recipe,options));
  const captureStarted=performance.now();let report:MotionCapture;
  if(request.captureId){report=await inspect(request.captureId,options);if(canonical(normalized(validateRecipe(report.recipe,options)))!==canonical(normalized(recipe)))throw new Error('Reused capture recipe differs from the declared review journey');}
  else {try{report=await capture(recipe,options)}catch(error){if(error instanceof CaptureFailureError)report=error.evidence;else throw error;}}
  const captureMs=request.captureId?0:performance.now()-captureStarted;
  const summary=reviewSummary(report,request.plan);
  if(!report.artifacts.video&&summary.summary.outcome==='passed')summary.summary.outcome='unverified';
  let frames:RecordedFrame[]=[],alignment='No decodable recording',videoSha256:string|null=null,cacheHit=false,frameError:string|undefined;
  let detail: {x:number;y:number;width:number;height:number}|undefined;
  if(request.budget.detailActorId&&request.budget.maxFrames>=2){
    if(!request.plan.actors.some(actor=>actor.id===request.budget.detailActorId))throw new Error('Detail actor is not in the transition plan');
    const screens=report.actorSamples?.filter(sample=>sample.actorId===request.budget.detailActorId&&sample.screen).map(sample=>sample.screen!)??[];
    if(screens.length){const view=report.environment.viewport,x=Math.max(0,Math.min(view.width-1,Math.min(...screens.map(screen=>screen.x))-30)),y=Math.max(0,Math.min(view.height-1,Math.min(...screens.map(screen=>screen.y))-30));detail={x,y,width:Math.min(view.width-x,Math.max(120,Math.max(...screens.map(screen=>screen.x+screen.width))-x+30)),height:Math.min(view.height-y,Math.max(120,Math.max(...screens.map(screen=>screen.y+screen.height))-y+30))};}
  }
  const times=reviewFrameTimes(report,detail?Math.max(1,Math.floor(request.budget.maxFrames/2)):request.budget.maxFrames);
  const decodeStarted=performance.now();
  if(report.artifacts.video)try {
    const strip=await recordedFrames(report.id,options,times,{maxWidth:request.budget.maxWidth,maxHeight:request.budget.maxHeight,...(detail?{detail}:{})});
    frames=strip.frames.slice(0,request.budget.maxFrames);alignment=strip.alignment;videoSha256=strip.videoSha256;cacheHit=strip.cacheHit;
  }catch(error){if(options.signal?.aborted)throw error;frameError=error instanceof Error?error.message.split('\n')[0]:String(error);summary.summary.outcome=summary.summary.outcome==='failed'?'failed':'unverified';}
  const decodeMs=report.artifacts.video?performance.now()-decodeStarted:0;
  const comparison=request.priorCaptureId?compare(await inspect(request.priorCaptureId,options),report):undefined;
  const wallMs=performance.now()-started;
  const metadata={...summary,plan:request.plan,planSha256:createHash('sha256').update(JSON.stringify(request.plan)).digest('hex'),capture:compact(report),...(comparison?{comparison}:{}),evidence:{alignment,frameError,videoSha256,frames:frames.map(({png,...frame})=>frame),requestedTimesMs:times},cost:{wallMs:Math.round(wallMs),captureMs,decodeMs,reviewMs:Math.max(0,wallMs-captureMs-decodeMs),costScope:'Capture, decode and review work through packet construction; caller additionally measures packet persistence and transport',decodeCacheHit:cacheHit,deliveredPngBytes:frames.reduce((sum,frame)=>sum+frame.png.length,0),deliveredPngSha256:frames.map(frame=>frame.sha256),imageCount:frames.length,captureAttempts:request.captureId?0:1}};
  const directory=await realpath(path.join(await realpath(path.resolve(options.artifactRoot)),report.id));
  const packet=path.join(directory,`review-${randomUUID()}.json`);await writeFile(packet,JSON.stringify(metadata,null,2),{flag:'wx'});
  return {metadata:{...metadata,packet},frames};
}
