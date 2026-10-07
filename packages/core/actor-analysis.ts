import type {CaptureRecipe,MotionActorAnalysis,MotionActorBinding,MotionActorResult,MotionActorSample,MotionAssertion,MotionEvent} from './types';

/** Separate from the legacy trajectory; keeps its 80ms cadence gate unchanged. */
export function analyzeActors(samples:MotionActorSample[],events:MotionEvent[],recipe:CaptureRecipe):MotionActorAnalysis {
  const bindings=recipe.actors??[];
  const actors=bindings.map(binding=>analyzeActor(binding,bindings,samples.filter(sample=>sample.actorId===binding.id),samples,events,recipe.durationMs??2400));
  return {version:'1',status:actors.some(actor=>actor.status==='failed')?'failed':!actors.length||actors.some(actor=>actor.status==='unverified')?'unverified':'passed',actors,
    limitations:['DOM/SVG geometry is browser observed, not proof of unoccluded painted pixels.','Scene state is app reported; independent native pixel checks are required before a visible-motion pass.','Position, wrapped 2D orientation and one-sided velocity estimates use actual observed spacing ≤80ms. Direct scrubbing and intentional cuts are excluded from continuity contracts.','Anchor checks use independent browser geometry for both registered actors in screen CSS pixels; they do not establish occlusion or camera-space scene relationships.','These explicit intent contracts do not score aesthetic quality, display FPS, or human trackability.']};
}
const wrappedAngle=(value:number)=>Math.atan2(Math.sin(value),Math.cos(value));
const angleOf=(sample:MotionActorSample):number|null=>{
  if(Number.isFinite(sample.orientationRadians?.z))return sample.orientationRadians!.z;
  if(sample.transform?.length===16&&sample.transform.every(Number.isFinite))return Math.atan2(sample.transform[1],sample.transform[0]);
  return null;
};
function phaseWindow(phase:NonNullable<NonNullable<MotionActorBinding['acceptance']>['orientation']>['phase']|NonNullable<NonNullable<MotionActorBinding['acceptance']>['anchor']>['phase'],events:MotionEvent[],duration:number){
  let start=phase?.startMs??0,end=phase?.endMs??duration,missing=false;const eventIds:string[]=[];
  if(phase?.afterEventLabel){const matches=events.filter(event=>event.origin==='browser-observed'&&event.detail.trusted===true&&event.label===phase.afterEventLabel);const event=(phase.eventOccurrence??'latest')==='first'?matches[0]:matches.at(-1);if(event){start=Math.max(start,event.t);eventIds.push(event.id);}else missing=true;}
  return {start,end,missing,eventIds};
}
const finiteGeometry=(sample:MotionActorSample)=>sample.visible===true&&sample.screen!==null&&[sample.t,sample.observedAtMs,sample.screen.x,sample.screen.y,sample.screen.width,sample.screen.height].every(Number.isFinite)&&sample.screen.width>=0&&sample.screen.height>=0;
function phaseCoverage(samples:MotionActorSample[],start:number,end:number,{orientation=false}:{orientation?:boolean}={}){
  const phase=samples.filter(sample=>sample.t>=start&&sample.t<=end),reasons:string[]=[],gaps:number[]=[];
  let ordered=true;
  for(let index=0;index<phase.length;index++){
    const sample=phase[index];
    if(!finiteGeometry(sample)||sample.origin!=='browser-observed'||!sample.nodeId||sample.observedAtMs<sample.t||sample.observedAtMs-sample.t>80)ordered=false;
    if(orientation&&angleOf(sample)===null)ordered=false;
    if(index){const before=phase[index-1],frameGap=sample.t-before.t,readGap=sample.observedAtMs-before.observedAtMs;if(frameGap<=0||readGap<=0)ordered=false;gaps.push(Math.max(frameGap,readGap));}
  }
  const maxGapMs=Math.max(0,...gaps),identities=new Set(phase.map(sample=>sample.nodeId).filter(Boolean));
  const boundaryCovered=phase.length>0&&phase[0].t<=start+80&&phase.at(-1)!.t>=end-80;
  const sufficient=end>=start&&phase.length>=20&&ordered&&boundaryCovered&&maxGapMs<=80&&identities.size===1;
  if(!sufficient)reasons.push(`Phase requires ≥20 ordered finite browser-geometry samples, one physical identity, both boundaries, and frame/read gaps and lag ≤80ms; observed ${phase.length}, gap ${maxGapMs}ms, boundaries ${boundaryCovered}.`);
  return {phase,sufficient,maxGapMs,reasons};
}
const actionClock=(events:MotionEvent[],index:number)=>events.filter(event=>event.origin==='browser-observed'&&event.detail.trusted===true&&event.detail.actionIndex===index).sort((a,b)=>a.t-b.t).at(0);
function analyzeActor(binding:MotionActorBinding,bindings:MotionActorBinding[],samples:MotionActorSample[],allSamples:MotionActorSample[],events:MotionEvent[],duration:number):MotionActorResult {
  const expectedOrigin=binding.kind==='scene'?'app-reported':'browser-observed';
  const trusted=samples.filter(sample=>sample.kind===binding.kind&&sample.origin===expectedOrigin);
  const valid=trusted.filter(finiteGeometry);
  const validSet=new Set(valid);
  const reasons:string[]=[],gaps:number[]=[];
  let ordered=true;
  for(let i=0;i<trusted.length;i++){
    const sample=trusted[i];
    if(!Number.isFinite(sample.t)||sample.t<0||!Number.isFinite(sample.observedAtMs)||sample.observedAtMs<sample.t||sample.observedAtMs-sample.t>80)ordered=false;
    if(i){const dt=sample.t-trusted[i-1].t,readDt=sample.observedAtMs-trusted[i-1].observedAtMs;if(dt<=0||readDt<=0)ordered=false;gaps.push(Math.max(dt,readDt));}
  }
  const maxGapMs=Math.max(0,...gaps),sufficient=ordered&&valid.length>=20&&valid.length===trusted.length&&trusted[0].t<=80&&trusted.at(-1)!.t>=duration-100&&maxGapMs<=80&&samples.length===trusted.length;
  if(!sufficient)reasons.push(`Actor coverage requires ≥20 ordered visible samples from ≤80ms through ${duration-100}ms with gaps/read lag ≤80ms; observed ${valid.length}/${samples.length}, gap ${maxGapMs}ms.`);
  if(binding.kind==='scene')reasons.push('App-reported poses cannot independently establish rendered position or a visible-motion pass.');
  const steps:{px:number;normalized:number;before:number;after:number;vx:number;vy:number;dt:number}[]=[];
  for(let i=1;i<trusted.length;i++){
    const a=trusted[i-1],b=trusted[i];
    if(!validSet.has(a)||!validSet.has(b)||a.nodeId!==b.nodeId)continue;
    const dt=b.observedAtMs-a.observedAtMs;
    if(dt<=0||dt>80)continue;
    const dx=b.screen!.x-a.screen!.x,dy=b.screen!.y-a.screen!.y,px=Math.hypot(dx,dy);
    steps.push({px,normalized:px/dt*(1000/60),before:a.t,after:b.t,vx:dx/dt,vy:dy/dt,dt});
  }
  const actualInputs=events.filter(event=>event.origin==='browser-observed'&&event.detail.trusted===true&&['click','keydown','wheel','pointerdown','pointerup','pointercancel'].includes(event.type));
  const velocityChanges=steps.flatMap((step,i)=>{
    const before=steps[i-1];if(!before||before.after!==step.before)return [];
    const inputs=actualInputs.filter(event=>event.t>=before.before&&event.t<=step.after);
    return inputs.length?[{change:Math.hypot(step.vx-before.vx,step.vy-before.vy),times:[before.before,step.before,step.after],eventIds:inputs.map(event=>event.id)}]:[];
  });
  const replacements=Math.max(0,new Set(valid.map(sample=>sample.nodeId).filter(id=>id!==null)).size-1),travelPx=steps.reduce((sum,step)=>sum+step.px,0);
  const destination=binding.acceptance?.destination;
  const destinationActivation=destination?.afterActionIndex===undefined?undefined:actionClock(events,destination.afterActionIndex);
  const destinationHold=destination?.holdUntilActionIndex===undefined?undefined:actionClock(events,destination.holdUntilActionIndex);
  const destinationStart=destinationActivation?.t??0,destinationEnd=destination?.mode==='waypoint'?(destinationHold?.t??duration):duration,destinationDeadline=destinationStart+(destination?.deadlineMs??0);
  const destinationWindowMissing=Boolean(destination&&(destination.afterActionIndex!==undefined&&!destinationActivation||destination.mode==='waypoint'&&!destinationHold));
  const destinationCoverage=destination?phaseCoverage(trusted,destinationStart,destinationEnd):undefined;
  let arrivalAtMs:number|null=null,destinationConfirmedAtMs:number|null=null,terminalDepartureAtMs:number|null=null;
  if(destination){
    let entered:number|null=null,confirmed:number|null=null;
    for(const sample of trusted.filter(sample=>sample.t>=destinationStart&&sample.t<=destinationEnd)){
      if(!validSet.has(sample)||Math.hypot(sample.screen!.x-destination.x,sample.screen!.y-destination.y)>destination.tolerancePx){if(confirmed!==null&&terminalDepartureAtMs===null)terminalDepartureAtMs=sample.t;entered=null;continue;}
      entered??=sample.t;
      if(confirmed===null&&sample.t-entered>=(destination.settleMs??0)&&sample.t<=destinationDeadline){confirmed=sample.t;arrivalAtMs=entered;destinationConfirmedAtMs=confirmed;}
    }
    if(confirmed===null||terminalDepartureAtMs!==null){arrivalAtMs=null;destinationConfirmedAtMs=confirmed;}
  }
  const metrics:MotionActorResult['metrics']={maxStepAt60HzPx:Math.max(0,...steps.map(step=>step.normalized)),maxStepPx:Math.max(0,...steps.map(step=>step.px)),travelPx,replacements,maxVelocityChangePxPerMs:Math.max(0,...velocityChanges.map(value=>value.change)),arrivalAtMs,destinationConfirmedAtMs,terminalDepartureAtMs};
  const assertions:MotionAssertion[]=[],findings:MotionActorResult['findings']=[];
  const check=(id:string,label:string,passed:boolean,actual:string,expected:string)=>{
    const independent=binding.kind!=='scene',status=independent&&(sufficient||!passed&&['position','velocity','identity'].includes(id))?(passed?'passed':'failed'):'inconclusive';
    assertions.push({id:`actor:${binding.id}:${id}`,label,passed:status==='passed',status,actual:`${actual}${!independent?'; app-reported annotation only':''}`,expected});
  };
  const c=binding.acceptance,continuity=c?.continuity??(c?.maxStepAt60HzPx!==undefined?'position':'none'),excluded=c?.inputPolicy==='direct-scrub'||c?.inputPolicy==='cut';
  if(continuity!=='none'&&!excluded&&c?.maxStepAt60HzPx===undefined)assertions.push({id:`actor:${binding.id}:position`,label:'Actor position continuity',passed:false,status:'inconclusive',actual:'Requested position continuity has no supplied measurement budget',expected:'Explicit maxStepAt60HzPx budget in CSS px /16.667ms'});
  if(continuity==='position-and-velocity'&&!excluded&&c?.maxVelocityChangePxPerMs===undefined)assertions.push({id:`actor:${binding.id}:velocity`,label:'Velocity near observed input',passed:false,status:'inconclusive',actual:'Requested velocity continuity has no supplied measurement budget',expected:'Explicit maxVelocityChangePxPerMs budget in CSS px/ms and adjacent estimates near trusted input'});

  if(continuity!=='none'&&!excluded&&c?.maxStepAt60HzPx!==undefined){
    const passed=metrics.maxStepAt60HzPx<=c.maxStepAt60HzPx;
    check('position','Actor position continuity',passed,`${metrics.maxStepAt60HzPx.toFixed(3)} CSS px /16.667ms`,`≤${c.maxStepAt60HzPx} CSS px /16.667ms`);
    if(!passed){const peak=steps.reduce((a,b)=>b.normalized>a.normalized?b:a);findings.push({type:'position-step',summary:`${binding.id} changes ${peak.px.toFixed(3)} CSS px over ${peak.dt.toFixed(3)}ms${binding.kind==='scene'?'; app-reported hypothesis requires pixel inspection':''}`,sampleTimes:[peak.before,peak.after],eventIds:actualInputs.filter(event=>Math.abs(event.t-peak.after)<100).map(event=>event.id)});}
  }
  if(continuity==='position-and-velocity'&&!excluded&&c?.maxVelocityChangePxPerMs!==undefined){
    const passed=velocityChanges.length>0&&metrics.maxVelocityChangePxPerMs<=c.maxVelocityChangePxPerMs;
    check('velocity','Velocity near observed input',passed,`${metrics.maxVelocityChangePxPerMs.toFixed(3)} CSS px/ms; ${velocityChanges.length} adjacent estimates`,`≤${c.maxVelocityChangePxPerMs} CSS px/ms with adjacent estimates near actual input`);
    if(!velocityChanges.length){assertions.at(-1)!.passed=false;assertions.at(-1)!.status='inconclusive';}
    if(velocityChanges.length&&!passed){const peak=velocityChanges.reduce((a,b)=>b.change>a.change?b:a);findings.push({type:'velocity-change',summary:`${binding.id} changes interval-average velocity near an input`,sampleTimes:peak.times,eventIds:peak.eventIds});}
  }
  if(c?.maxReplacements!==undefined){check('identity','Actor physical node continuity',replacements<=c.maxReplacements,`${replacements} replacements`,`≤${c.maxReplacements}`);if(replacements>c.maxReplacements)findings.push({type:'identity-replacement',summary:`${binding.id} has ${replacements} physical node replacements`,sampleTimes:[],eventIds:[]});}
  if(destination){
    const mode=destination.mode??'terminal',holdLabel=mode==='waypoint'?`through action ${destination.holdUntilActionIndex}`:'through capture end';
    check('arrival',`Actor reaches ${mode} destination and retains it for the declared hold`,arrivalAtMs!==null,arrivalAtMs===null?terminalDepartureAtMs===null?'not observed':`departed after confirmed arrival at ${terminalDepartureAtMs.toFixed(3)}ms`:`entered ${arrivalAtMs.toFixed(3)}ms; confirmed ${destinationConfirmedAtMs!.toFixed(3)}ms; retained ${holdLabel}`,`${destination.tolerancePx} CSS px tolerance by ${destination.deadlineMs}ms after activation, settle ${destination.settleMs??0}ms, retained ${holdLabel}`);
    if(destinationWindowMissing||!destinationCoverage?.sufficient){const assertion=assertions.at(-1)!;assertion.passed=false;assertion.status='inconclusive';assertion.actual+=destinationWindowMissing?'; declared action epoch was not observed':'; incomplete destination hold coverage';}
    if(arrivalAtMs===null)findings.push(terminalDepartureAtMs===null?{type:'arrival',summary:`${binding.id} ${mode} arrival is not established`,sampleTimes:[],eventIds:[]}:{type:'terminal-departure',summary:`${binding.id} left its ${mode} destination before the declared hold ended`,sampleTimes:[terminalDepartureAtMs],eventIds:[]});
  }
  if(c?.minTravelPx!==undefined){check('travel','Actor performs required travel',travelPx>=c.minTravelPx,`${travelPx.toFixed(3)} CSS px`,`≥${c.minTravelPx} CSS px`);if(travelPx<c.minTravelPx)findings.push({type:'travel',summary:`${binding.id} required movement is not established`,sampleTimes:[],eventIds:[]});}

  if(c?.orientation){
    const window=phaseWindow(c.orientation.phase,events,duration),coverage=phaseCoverage(trusted,window.start,window.end,{orientation:true}),oriented=coverage.phase.map(sample=>({sample,angle:angleOf(sample)})).filter((item):item is {sample:MotionActorSample;angle:number}=>item.angle!==null);
    const angleSteps:{value:number;before:number;after:number;dt:number}[]=[];
    for(let i=1;i<oriented.length;i++){const a=oriented[i-1],b=oriented[i],dt=b.sample.observedAtMs-a.sample.observedAtMs;if(dt>0&&dt<=80)angleSteps.push({value:Math.abs(wrappedAngle(b.angle-a.angle))/dt*(1000/60),before:a.sample.t,after:b.sample.t,dt});}
    metrics.maxOrientationStepAt60HzRad=Math.max(0,...angleSteps.map(step=>step.value));metrics.orientationSampleCount=oriented.length;metrics.orientationMaxReadGapMs=coverage.maxGapMs;
    const phaseSufficient=!window.missing&&coverage.sufficient&&oriented.length===coverage.phase.length&&angleSteps.length===Math.max(0,oriented.length-1);
    if(c.orientation.maxStepAt60HzRad!==undefined&&!excluded){const passed=metrics.maxOrientationStepAt60HzRad<=c.orientation.maxStepAt60HzRad;check('orientation','Wrapped 2D orientation continuity',passed,`${metrics.maxOrientationStepAt60HzRad.toFixed(4)} rad /16.667ms from ${oriented.length}/${coverage.phase.length} phase samples; maximum read gap ${coverage.maxGapMs.toFixed(3)}ms`,`≤${c.orientation.maxStepAt60HzRad} rad /16.667ms with complete ordered finite orientation at both phase boundaries`);if(!phaseSufficient){const assertion=assertions.at(-1)!;assertion.passed=false;assertion.status='inconclusive';assertion.actual+=window.missing?'; declared phase event was not observed':`; incomplete orientation coverage: ${coverage.reasons.join(' ')}`;}else if(!passed){const peak=angleSteps.reduce((a,b)=>b.value>a.value?b:a);findings.push({type:'orientation-step',summary:`${binding.id} wrapped orientation step ${peak.value.toFixed(4)} rad /16.667ms exceeds the declared bound`,sampleTimes:[peak.before,peak.after],eventIds:window.eventIds});}}
    if(c.orientation.destinationRad!==undefined){const final=oriented.at(-1),error=final?Math.abs(wrappedAngle(final.angle-c.orientation.destinationRad)):null;metrics.finalOrientationErrorRad=error;const passed=error!==null&&error<=c.orientation.toleranceRad!;check('orientation-destination','Terminal 2D orientation',passed,error===null?'not observed':`${error.toFixed(4)} rad wrapped error`,`≤${c.orientation.toleranceRad} rad at the final observed pose`);if(!phaseSufficient||!final){const assertion=assertions.at(-1)!;assertion.passed=false;assertion.status='inconclusive';}else if(!passed)findings.push({type:'orientation-destination',summary:`${binding.id} final orientation differs by ${error!.toFixed(4)} rad`,sampleTimes:[final.sample.t],eventIds:window.eventIds});}
  }

  if(c?.anchor){
    const window=phaseWindow(c.anchor.phase,events,duration),referenceBinding=bindings.find(candidate=>candidate.id===c.anchor!.actorId),referenceSamples=allSamples.filter(sample=>sample.actorId===c.anchor!.actorId&&sample.kind===referenceBinding?.kind&&sample.origin==='browser-observed'),subjectCoverage=phaseCoverage(trusted,window.start,window.end),referenceCoverage=phaseCoverage(referenceSamples,window.start,window.end),unused=new Set(referenceCoverage.phase.map((_,index)=>index));
    const pairs:{t:number;error:number;skew:number;subject:MotionActorSample;reference:MotionActorSample}[]=[];
    for(const subject of subjectCoverage.phase){let selected=-1,frameDelta=Infinity;for(const index of unused){const candidate=referenceCoverage.phase[index],delta=Math.abs(candidate.t-subject.t);if(delta<frameDelta){selected=index;frameDelta=delta;}}if(selected<0||frameDelta>.5)continue;const reference=referenceCoverage.phase[selected],skew=Math.abs(reference.observedAtMs-subject.observedAtMs);if(skew>40||!subject.screen||!reference.screen)continue;unused.delete(selected);const dx=(subject.screen.x+subject.screen.width/2)-(reference.screen.x+reference.screen.width/2)-c.anchor.offset.x,dy=(subject.screen.y+subject.screen.height/2)-(reference.screen.y+reference.screen.height/2)-c.anchor.offset.y;pairs.push({t:subject.t,error:Math.hypot(dx,dy),skew,subject,reference});}
    const pairFrameGaps:number[]=[],pairReadGaps:number[]=[];let pairOrdered=true;
    for(let index=0;index<pairs.length;index++){const pair=pairs[index],subjectLag=pair.subject.observedAtMs-pair.subject.t,referenceLag=pair.reference.observedAtMs-pair.reference.t;if(subjectLag<0||referenceLag<0||subjectLag>80||referenceLag>80)pairOrdered=false;if(index){const before=pairs[index-1],frameGaps=[pair.subject.t-before.subject.t,pair.reference.t-before.reference.t],readGaps=[pair.subject.observedAtMs-before.subject.observedAtMs,pair.reference.observedAtMs-before.reference.observedAtMs];if(frameGaps.some(gap=>gap<=0)||readGaps.some(gap=>gap<=0))pairOrdered=false;pairFrameGaps.push(...frameGaps);pairReadGaps.push(...readGaps);}}
    metrics.anchorPairCount=pairs.length;metrics.anchorUniqueSubjectCount=new Set(pairs.map(pair=>pair.subject)).size;metrics.anchorUniqueReferenceCount=new Set(pairs.map(pair=>pair.reference)).size;metrics.anchorMaxReadSkewMs=Math.max(0,...pairs.map(pair=>pair.skew));metrics.anchorPairMaxFrameGapMs=Math.max(0,...pairFrameGaps);metrics.anchorPairMaxReadGapMs=Math.max(0,...pairReadGaps);metrics.anchorPairMaxObservationLagMs=Math.max(0,...pairs.flatMap(pair=>[pair.subject.observedAtMs-pair.subject.t,pair.reference.observedAtMs-pair.reference.t]));metrics.maxAnchorErrorPx=Math.max(0,...pairs.map(pair=>pair.error));
    const first=pairs[0],last=pairs.at(-1),pairBoundaries=Boolean(first&&last&&first.subject.t<=window.start+80&&first.reference.t<=window.start+80&&last.subject.t>=window.end-80&&last.reference.t>=window.end-80),completeCorrespondence=pairs.length===subjectCoverage.phase.length&&pairs.length===referenceCoverage.phase.length,pairedCadence=completeCorrespondence||pairOrdered&&metrics.anchorPairMaxFrameGapMs<=80&&metrics.anchorPairMaxReadGapMs<=80&&metrics.anchorPairMaxObservationLagMs<=80;
    const pairedSufficient=!window.missing&&referenceBinding!==undefined&&referenceBinding.kind!=='scene'&&binding.kind!=='scene'&&subjectCoverage.sufficient&&referenceCoverage.sufficient&&pairs.length>=20&&metrics.anchorUniqueSubjectCount===pairs.length&&metrics.anchorUniqueReferenceCount===pairs.length&&pairBoundaries&&pairedCadence;
    const passed=metrics.maxAnchorErrorPx<=c.anchor.tolerancePx;check('anchor',`Screen anchor relationship to ${c.anchor.actorId}`,passed,`${metrics.maxAnchorErrorPx.toFixed(3)} CSS px maximum error from ${pairs.length} one-to-one same-frame pairs; ${metrics.anchorUniqueReferenceCount} unique anchor reads; maximum read skew ${metrics.anchorMaxReadSkewMs.toFixed(3)}ms; paired frame/read gaps ${metrics.anchorPairMaxFrameGapMs.toFixed(3)}/${metrics.anchorPairMaxReadGapMs.toFixed(3)}ms; paired observation lag ${metrics.anchorPairMaxObservationLagMs.toFixed(3)}ms`,`≤${c.anchor.tolerancePx} CSS px center-offset error with ≥20 one-to-one pairs, ≤40ms read skew, and complete correspondence or ordered paired frame/read gaps and lag ≤80ms across both phase boundaries`);if(!pairedSufficient){const assertion=assertions.at(-1)!;assertion.passed=false;assertion.status='inconclusive';assertion.actual+=window.missing?'; declared phase event was not observed':'; incomplete independent subject/anchor coverage or pairing';}else if(!passed){const peak=pairs.reduce((a,b)=>b.error>a.error?b:a);findings.push({type:'anchor-drift',summary:`${binding.id} drifts ${peak.error.toFixed(3)} CSS px from anchor ${c.anchor.actorId}`,sampleTimes:[peak.t],eventIds:window.eventIds});}
  }
  return {actorId:binding.id,kind:binding.kind,evidence:binding.kind==='scene'?'app-reported-scene':'browser-geometry',status:assertions.some(assertion=>assertion.status==='failed')?'failed':!sufficient||binding.kind==='scene'||!assertions.length||assertions.some(assertion=>assertion.status==='inconclusive')?'unverified':'passed',pixelStatus:'unverified',coverage:{sufficient,sampleCount:trusted.length,maxGapMs,reasons},metrics,assertions,findings};
}

/** Exact executable helper closure used by capture runtime identity. */
export function actorAnalyzerImplementationSource():string {
  return [analyzeActors,wrappedAngle,angleOf,phaseWindow,finiteGeometry,phaseCoverage,actionClock,analyzeActor].map(value=>value.toString()).join('\n');
}
