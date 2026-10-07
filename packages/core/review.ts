import {createHash,randomUUID} from 'node:crypto';
import {writeFile,realpath} from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {capture,inspect,compact,CaptureFailureError} from './capture';
import {compare} from './analysis';
import {RecipeSchema,validateRecipe} from './safety';
import {transitionPlanSchema,validateTransitionBindings,type TransitionPlan} from './transitions';
import {recordedFrames,type RecordedFrame} from './frames';
import {captureFailureMoments} from './assessment';
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
  const outcomes=recipe.contract?.outcomes;
  if(!outcomes)throw new Error('Recipe is missing plan-required functional outcomes and forbidden-visible exclusions');
  const forbidden=new Set(outcomes.forbiddenVisible??[]);
  const missingForbidden=plan.acceptance.forbiddenVisible.filter(selector=>!forbidden.has(selector));
  if(missingForbidden.length)throw new Error(`Recipe is missing plan-required forbidden-visible exclusion(s): ${missingForbidden.join(', ')}`);
  if(recipe.intent){
    const mapped=new Set(recipe.intent.beats.map(beat=>beat.beatId));
    for(const beat of plan.beats)if(!mapped.has(beat.id))throw new Error(`Recipe intent is missing plan beat ${beat.id}`);
    for(const beat of recipe.intent.beats)if(!plan.beats.some(candidate=>candidate.id===beat.beatId))throw new Error(`Recipe intent references unknown plan beat ${beat.beatId}`);
  }
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
    if(accepted.destination.orientationRad&&accepted.destination.orientationRad[0]===0&&accepted.destination.orientationRad[1]===0&&binding.kind!=='scene'){
      const orientation=binding.acceptance?.orientation;
      if(!orientation||orientation.unit!=='radian'||orientation.axis!=='z'||orientation.destinationRad!==accepted.destination.orientationRad[2]||orientation.toleranceRad!==accepted.orientationToleranceRad)throw new Error(`Recipe orientation destination differs from plan: ${actor.id}`);
    }
  }
  return recipe;
}

export function reviewFrameSelection(report:MotionCapture,maxFrames=6) {
  if(!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>6)throw new Error('Review frame budget must be one to six');
  const duration=report.recipe.durationMs??2400;
  const clamp=(t:number)=>Math.round(Math.max(0,Math.min(duration,t)));
  const selected:number[]=[];
  const add=(t:number|undefined)=>{if(t!==undefined&&Number.isFinite(t)&&selected.length<maxFrames){const value=clamp(t);if(!selected.includes(value))selected.push(value)}};
  const failures=captureFailureMoments(report);
  // Overview allocation: every distinct observed failure gets a center before detail frames.
  for(const failure of failures)add(failure.timeMs);
  for(const failure of failures){add(failure.timeMs-60);add(failure.timeMs+60);}
  const events=interactionEpochs(report.events).map(epoch=>epoch.clock);
  const interruptions=events.slice(1);
  add(interruptions.find(event=>event.type==='pointercancel'||event.type==='keydown')?.t??interruptions[0]?.t);
  add(events[0]?.t??0);
  add(duration);
  const initial=new Map<string,{x:number;y:number}>();let peak:{t:number;distance:number}|undefined;
  for(const sample of report.actorSamples??[]){if(!sample.screen)continue;if(!initial.has(sample.actorId))initial.set(sample.actorId,sample.screen);const first=initial.get(sample.actorId)!;const distance=Math.hypot(sample.screen.x-first.x,sample.screen.y-first.y);if(!peak||distance>peak.distance)peak={t:sample.t,distance};}add(peak?.t);
  for(const event of interruptions)add(event.t);
  for(const t of [0,duration/2,duration])add(t);
  const times=selected.sort((a,b)=>a-b),coveredFailures=failures.filter(failure=>times.some(time=>Math.abs(time-clamp(failure.timeMs))<=60)),uncoveredFailures=failures.filter(failure=>!coveredFailures.includes(failure));
  return {times,coveredFindings:coveredFailures.map(failure=>({id:failure.id,kind:failure.kind,timeMs:failure.timeMs,summary:failure.summary})),uncoveredFindings:uncoveredFailures.map(failure=>({id:failure.id,kind:failure.kind,timeMs:failure.timeMs,summary:failure.summary})),followUpRequest:uncoveredFailures.length?{timestampsMs:uncoveredFailures.slice(0,6).map(failure=>clamp(failure.timeMs)),selection:'finding' as const,maxFrames:Math.min(6,uncoveredFailures.length)}:null};
}
/** Priority beats: distinct product/actor failures, relevant input epochs, then journey context. */
export function reviewFrameTimes(report:MotionCapture,maxFrames=6):number[] {return reviewFrameSelection(report,maxFrames).times;}

export interface InputEpoch {events:MotionEvent[];clock:MotionEvent;association:'contact-identity'|'standalone'|'uncertain';contactId?:string;controlId?:string}
const pointerContact=(event:MotionEvent)=>typeof event.detail.pointerId==='number'?`${String(event.detail.pointerType??'pointer')}:${event.detail.pointerId}`:undefined;
const controlIdentity=(event:MotionEvent)=>event.nodeId??event.logicalId??(typeof event.detail.selector==='string'?event.detail.selector:undefined);
export function interactionEpochs(events:MotionEvent[]):InputEpoch[] {
  const trusted=events.filter(event=>event.origin==='browser-observed'&&event.detail.trusted===true&&inputs.has(event.type)).sort((a,b)=>a.t-b.t),epochs:InputEpoch[]=[],contacts=new Map<string,InputEpoch[]>();
  for(const event of trusted){
    const contactId=pointerContact(event),controlId=controlIdentity(event);
    if(event.type==='pointerdown'){
      const epoch:InputEpoch={events:[event],clock:event,association:contactId&&controlId?'contact-identity':'uncertain',...(contactId?{contactId}:{}),...(controlId?{controlId}:{})};epochs.push(epoch);if(contactId){const stack=contacts.get(contactId)??[];stack.push(epoch);contacts.set(contactId,stack);}continue;
    }
    if(['pointerup','pointercancel'].includes(event.type)&&contactId&&controlId){const epoch=[...(contacts.get(contactId)??[])].reverse().find(candidate=>candidate.controlId===controlId&&!candidate.events.some(item=>['pointerup','pointercancel'].includes(item.type)));if(epoch){epoch.events.push(event);epoch.clock=event;continue;}}
    if(event.type==='click'&&contactId&&controlId){const epoch=[...(contacts.get(contactId)??[])].reverse().find(candidate=>candidate.controlId===controlId&&candidate.events.some(item=>item.type==='pointerup')&&!candidate.events.some(item=>item.type==='click')&&event.t-candidate.events.at(-1)!.t<=180);if(epoch){epoch.events.push(event);epoch.clock=event;continue;}}
    epochs.push({events:[event],clock:event,association:['pointerup','pointercancel','click'].includes(event.type)?'uncertain':'standalone',...(contactId?{contactId}:{}),...(controlId?{controlId}:{})});
  }
  return epochs.sort((a,b)=>a.clock.t-b.clock.t);
}
function relevantEpochs(report:MotionCapture,plan:TransitionPlan,actorId:string){const beats=plan.beats.filter(beat=>beat.actorIds.includes(actorId)),all=interactionEpochs(report.events);if(report.recipe.intent){const indexes=new Set(report.recipe.intent.beats.filter(item=>beats.some(beat=>beat.id===item.beatId)).flatMap(item=>item.actionIndexes));const matched=all.filter(epoch=>epoch.events.some(event=>typeof event.detail.actionIndex==='number'&&indexes.has(event.detail.actionIndex)));return {epochs:matched,attribution:matched.length?'explicit-action-metadata' as const:'unattributable' as const};}if(all.length===1&&beats.length===1)return {epochs:all,attribution:'legacy-single-input' as const};return {epochs:[],attribution:'unattributable' as const};}
function epochBeatTarget(report:MotionCapture,plan:TransitionPlan,actorId:string,epoch:InputEpoch){
  const actorBeats=plan.beats.filter(beat=>beat.actorIds.includes(actorId));let beat:typeof plan.beats[number]|undefined;
  if(report.recipe.intent){
    const actionIndexes=[...new Set(epoch.events.map(event=>event.detail.actionIndex).filter((value):value is number=>typeof value==='number'))];
    if(actionIndexes.length!==1)return {status:'unverified-target-correspondence' as const,beatId:null,target:null};
    const mapped=report.recipe.intent.beats.filter(item=>item.actionIndexes.includes(actionIndexes[0])).map(item=>actorBeats.find(candidate=>candidate.id===item.beatId)).filter((candidate):candidate is typeof plan.beats[number]=>candidate!==undefined);
    if(mapped.length!==1)return {status:'unverified-target-correspondence' as const,beatId:null,target:null};
    beat=mapped[0];
  }else if(actorBeats.length===1)beat=actorBeats[0];
  const position=beat?.to.position;
  if(!beat||!position||position.space!=='screen'||position.unit!=='css-px')return {status:'unverified-target-correspondence' as const,beatId:beat?.id??null,target:null};
  return {status:'mapped-screen-target' as const,beatId:beat.id,target:{x:position.x,y:position.y}};
}
function nearestInput(epochs:InputEpoch[],t:number) {return epochs.filter(epoch=>epoch.clock.t<=t).at(-1)?.clock;}

export function reviewSummary(report:MotionCapture,plan:TransitionPlan) {
  const actorResults=report.actorAnalysis?.actors??[];
  const transitions=plan.acceptance.actors.map(accepted=>{
    const actor=actorResults.find(actor=>actor.actorId===accepted.actorId);
    const samples=(report.actorSamples??[]).filter(sample=>sample.actorId===accepted.actorId&&sample.origin==='browser-observed'&&sample.screen&&sample.visible&&[sample.t,sample.observedAtMs,sample.screen.x,sample.screen.y].every(Number.isFinite)).sort((a,b)=>a.observedAtMs-b.observedAtMs);
    const status:ReviewStatus=actor?.status??'unverified';
    const flagged=actor?.findings??[];
    const relevant=relevantEpochs(report,plan,accepted.actorId),duration=report.recipe.durationMs??2400;
    const responseEpochs=relevant.epochs.map((epoch,index)=>{
      const inputEvent=epoch.clock,next=relevant.epochs[index+1]?.clock,windowEnd=Math.min(duration,next?.t??duration),deadlineAtMs=inputEvent.t+accepted.maxResponseMs,before=samples.filter(sample=>sample.observedAtMs<=inputEvent.t).at(-1),observations=samples.filter(sample=>sample.observedAtMs>inputEvent.t&&sample.observedAtMs<windowEnd),response=before?observations.find(sample=>Math.hypot(sample.screen!.x-before.screen!.x,sample.screen!.y-before.screen!.y)>.5):undefined,responseMs=response?response.observedAtMs-inputEvent.t:null,observedThroughDeadline=observations.some(sample=>sample.observedAtMs>=deadlineAtMs),beatTarget=epochBeatTarget(report,plan,accepted.actorId,epoch),atValidPose=Boolean(before&&beatTarget.target&&Math.hypot(before.screen!.x-beatTarget.target.x,before.screen!.y-beatTarget.target.y)<=accepted.positionToleranceCssPx),stableValidPose=atValidPose&&observations.filter(sample=>sample.observedAtMs<=deadlineAtMs).every(sample=>Math.hypot(sample.screen!.x-beatTarget.target!.x,sample.screen!.y-beatTarget.target!.y)<=accepted.positionToleranceCssPx);
      let responseStatus:'passed'|'failed'|'superseded-before-deadline'|'no-change-valid-pose'|'unverified-missing-observation'|'unverified-target-correspondence';
      if(!before)responseStatus='unverified-missing-observation';
      else if(response)responseStatus=responseMs!<=accepted.maxResponseMs?'passed':'failed';
      else if(next&&next.t<deadlineAtMs)responseStatus='superseded-before-deadline';
      else if(beatTarget.status==='unverified-target-correspondence')responseStatus='unverified-target-correspondence';
      else if(stableValidPose&&observedThroughDeadline)responseStatus='no-change-valid-pose';
      else if(observedThroughDeadline)responseStatus='failed';
      else responseStatus='unverified-missing-observation';
      return {eventIds:epoch.events.map(event=>event.id),actionIndexes:[...new Set(epoch.events.map(event=>event.detail.actionIndex).filter((value):value is number=>typeof value==='number'))],inputAtMs:inputEvent.t,nextInputAtMs:next?.t??null,deadlineAtMs,windowEndMs:windowEnd,responseAtMs:response?.observedAtMs??null,responseMs,status:responseStatus,association:epoch.association,targetCorrespondence:beatTarget.status,targetBeatId:beatTarget.beatId,target:beatTarget.target};
    });
    const inputEpoch=relevant.epochs.at(-1),inputEvent=inputEpoch?.clock,latestResponse=responseEpochs.at(-1),responseMs=latestResponse?.responseMs??null;
    const responseStatus=responseEpochs.some(epoch=>epoch.status==='failed')?'failed':!responseEpochs.length||responseEpochs.some(epoch=>epoch.status==='superseded-before-deadline'||epoch.status.startsWith('unverified-'))?'unverified':'passed';
    const arrival=actor?.metrics.arrivalAtMs,settlingMs=arrival!==null&&arrival!==undefined&&inputEvent&&arrival>=inputEvent.t?arrival-inputEvent.t:null;
    const velocityAssertion=actor?.assertions.find(assertion=>assertion.id===`actor:${accepted.actorId}:velocity`);
    const velocityStatus=accepted.continuity!=='position-and-velocity'?'not-requested':velocityAssertion?.status==='failed'?'failed':actor?.coverage.sufficient&&velocityAssertion?.passed&&velocityAssertion.status==='passed'?'passed':'unverified';
    const orientationAssertion=actor?.assertions.find(assertion=>assertion.id===`actor:${accepted.actorId}:orientation-destination`);
    const orientationStatus=accepted.destination.orientationRad?orientationAssertion?.status==='failed'?'failed':orientationAssertion?.passed?'measured-geometry':'unverified':'not-requested';

    return {actorId:accepted.actorId,status,pixelStatus:actor?.pixelStatus??'unverified',evidence:actor?.evidence??'missing',measurements:{...actor?.metrics,positionUnit:'css-px',velocityUnit:'css-px/ms',orientationUnit:'radian',anchorUnit:'css-px',inputAttribution:relevant.attribution,inputEpochEventIds:inputEpoch?.events.map(event=>event.id)??[],responseEpochs,velocityStatus,inputToObservedGeometryChangeMs:responseMs,responseMethod:'Per-epoch first >0.5 CSS px browser-geometry change, bounded by the next explicitly mapped action epoch and each response deadline; not pixel presentation latency',responseBoundMs:accepted.maxResponseMs,responseStatus,settlingMs,settlingStatus:settlingMs===null?'unverified':settlingMs<=accepted.maxSettlingMs?'passed':'failed',destinationStatus:accepted.destination.position.space==='screen'?'measured-geometry':'unverified-projection',orientationStatus,trackingStatus:'unverified'},windows:flagged.slice(0,3).map(finding=>{
      const t=finding.sampleTimes[0]??0,input=nearestInput(relevant.epochs,t);
      return {...finding,input:input?{id:input.id,type:input.type,observedAtMs:input.t}:null,fromMs:Math.max(0,t-80),toMs:Math.min(report.recipe.durationMs??2400,t+80),sourceCandidates:plan.actors.find(actor=>actor.id===accepted.actorId)?.sources??[],hypothesis:finding.type==='position-step'?'A retarget may reset the visible pose. Carry the current position into the next target and repeat this unchanged journey.':'Inspect the named actor around this event and test one bounded change against the same contract.',competingExplanation:'Sampling gaps, annotation/render disagreement or approximate video alignment may also explain the apparent change.'};
    })};
  });
  const delivery=report.delivery?.status??'unverified';
  const functionalFailure=delivery==='failed'||report.status==='incomplete';
  const temporalFailure=report.assertions.some(assertion=>assertion.status==='failed'||(!assertion.passed&&assertion.status!=='inconclusive'))||transitions.some(actor=>actor.status==='failed');
  const responseFailureActor=transitions.find(actor=>actor.measurements.responseStatus==='failed'||actor.measurements.settlingStatus==='failed'||actor.measurements.velocityStatus==='failed');
  const responseFailure=Boolean(responseFailureActor);
  const unresolved=transitions.some(actor=>actor.status==='unverified'||actor.measurements.responseStatus==='unverified'||actor.measurements.settlingStatus==='unverified'||actor.measurements.orientationStatus==='unverified'||actor.measurements.destinationStatus==='unverified-projection'||actor.measurements.velocityStatus==='unverified');
  const outcome:ReviewStatus=functionalFailure||temporalFailure||responseFailure?'failed':delivery!=='passed'||!report.metrics.sufficientEvidence||unresolved?'unverified':'passed';
  const feature=(requested:boolean,result:typeof actorResults[number]|undefined,suffix:string)=>{
    if(!requested)return {requested:false,status:'not-requested' as const,evidence:'none' as const};
    if(!result)return {requested:true,status:'unsupported-unverified' as const,evidence:'missing' as const};
    if(result.evidence==='app-reported-scene')return {requested:true,status:'annotation-only' as const,evidence:result.evidence};
    const assertion=result.assertions.find(item=>item.id.endsWith(`:${suffix}`));
    if(!assertion)return {requested:true,status:'unsupported-unverified' as const,evidence:result.evidence};
    if(!result.coverage.sufficient||assertion.status==='inconclusive')return {requested:true,status:'insufficient' as const,evidence:result.evidence};
    if(assertion.status==='failed')return {requested:true,status:'independent-measured-failed' as const,evidence:result.evidence};
    return {requested:true,status:'independent-measured-passed' as const,evidence:result.evidence};
  };
  const featureCoverage={internalMotion:report.recipe.actors?.length?(report.actorAnalysis?.status??'unverified'):'unverified',actors:plan.actors.map(planned=>{const binding=report.recipe.actors?.find(actor=>actor.id===planned.id),accepted=plan.acceptance.actors.find(actor=>actor.actorId===planned.id),result=actorResults.find(actor=>actor.actorId===planned.id);return {actorId:planned.id,registered:Boolean(binding),evidence:result?.evidence??'missing',coverage:result?.coverage??null,status:result?.status??'unverified',features:{position:feature(Boolean(accepted&&accepted.continuity!=='none'),result,'position'),velocity:feature(accepted?.continuity==='position-and-velocity',result,'velocity'),destination:feature(Boolean(accepted),result,'arrival'),orientation:feature(Boolean(accepted?.destination.orientationRad),result,'orientation-destination'),anchor:feature(Boolean(binding?.acceptance?.anchor),result,'anchor'),paintedPixels:{requested:true,status:result?.pixelStatus==='observed'?'independent-measured-passed':'unsupported-unverified',evidence:'recorded-pixels'}}};}),unsupported:{rendererHandoff:'unverified: no independent painted-representation identity contract',progressToPose:'unverified: no declared progress observation in this capture',crossHistoryConsistency:'unverified: bounded captures start in fresh contexts'}};
  return {schemaVersion:'motion-review-1',capabilities:{actors:1,plan:1,events:1,clock:'native-replay',legacyCaptureSchema:'2.0',performanceCertificate:false},captureId:report.id,planId:plan.id,summary:{outcome,functionalDelivery:delivery,temporalContracts:temporalFailure||responseFailure?'failed':report.metrics.sufficientEvidence?'passed':'unverified',motionPreference:'unverified',humanTracking:'unverified',nextInspection:responseFailureActor?.actorId??transitions.find(actor=>actor.status!=='passed')?.actorId??(temporalFailure?'capture integrity':'Review normal-speed pixels and validate the selected part tracking task')},featureCoverage,statefulJourney:{status:'host-browser-required',reason:'Cross-history, long-scroll and renderer-handoff equivalence cannot be certified by isolated fresh-context captures.',bounds:{paths:3,settleMs:Math.min(4000,Math.max(0,...plan.acceptance.actors.map(actor=>actor.maxSettlingMs))),actors:plan.actors.length},procedure:['Start one fresh credential-free native browser context and retain it for the complete journey.','Record declared forward, reverse/skip and resize paths without exceeding the host session budget.','At each equivalent declared state, wait the bounded settle interval and record native screenshots/video plus DOM/SVG actor geometry.','Compare only declared history-independent geometry/outcomes; leave app-reported WebGL pixels and intentional hysteresis unverified.']},transitions,environment:report.environment,performanceDiagnostics:report.performanceDiagnostics,sourceHashes:report.events.filter(event=>event.source).map(event=>({eventId:event.id,...event.source})),clip:report.artifacts.video,limitations:[...report.limitations,...report.actorAnalysis?.limitations??[],'Actor geometry and app annotations do not establish aesthetic preference, object tracking accuracy or pixel presentation performance. Unattributable input timing remains unverified; legacy plans receive only the conservative single-input compatibility path. Event-to-geometry response is an observation, not a displayed-pixel latency.']};
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
  const frameSelection=reviewFrameSelection(report,detail?Math.max(1,Math.floor(request.budget.maxFrames/2)):request.budget.maxFrames),times=frameSelection.times;
  const decodeStarted=performance.now();
  if(report.artifacts.video)try {
    const strip=await recordedFrames(report.id,options,times,{maxWidth:request.budget.maxWidth,maxHeight:request.budget.maxHeight,...(detail?{detail}:{})});
    frames=strip.frames.slice(0,request.budget.maxFrames);alignment=strip.alignment;videoSha256=strip.videoSha256;cacheHit=strip.cacheHit;
  }catch(error){if(options.signal?.aborted)throw error;frameError=error instanceof Error?error.message.split('\n')[0]:String(error);summary.summary.outcome=summary.summary.outcome==='failed'?'failed':'unverified';}
  const decodeMs=report.artifacts.video?performance.now()-decodeStarted:0;
  const comparison=request.priorCaptureId?compare(await inspect(request.priorCaptureId,options),report):undefined;
  const wallMs=performance.now()-started;
  const metadata={...summary,plan:request.plan,planSha256:createHash('sha256').update(JSON.stringify(request.plan)).digest('hex'),capture:compact(report),...(comparison?{comparison}:{}),evidence:{alignment,frameError,videoSha256,frames:frames.map(({png,...frame})=>frame),requestedTimesMs:times,coveredFindings:frameSelection.coveredFindings,uncoveredFindings:frameSelection.uncoveredFindings,followUpRequest:frameSelection.followUpRequest},cost:{wallMs:Math.round(wallMs),captureMs,decodeMs,reviewMs:Math.max(0,wallMs-captureMs-decodeMs),costScope:'Capture, decode and review work through packet construction; caller additionally measures packet persistence and transport',decodeCacheHit:cacheHit,deliveredPngBytes:frames.reduce((sum,frame)=>sum+frame.png.length,0),deliveredPngSha256:frames.map(frame=>frame.sha256),imageCount:frames.length,captureAttempts:request.captureId?0:1}};
  const directory=await realpath(path.join(await realpath(path.resolve(options.artifactRoot)),report.id));
  const packet=path.join(directory,`review-${randomUUID()}.json`);await writeFile(packet,JSON.stringify(metadata,null,2),{flag:'wx'});
  return {metadata:{...metadata,packet},frames};
}
