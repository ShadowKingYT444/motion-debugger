import type {CaptureRecipe,MotionActorAnalysis,MotionActorBinding,MotionActorResult,MotionActorSample,MotionAssertion,MotionEvent} from './types';

/** Separate from the legacy trajectory; keeps its 80ms cadence gate unchanged. */
export function analyzeActors(samples:MotionActorSample[],events:MotionEvent[],recipe:CaptureRecipe):MotionActorAnalysis {
  const actors=(recipe.actors??[]).map(binding=>analyzeActor(binding,samples.filter(sample=>sample.actorId===binding.id),events,recipe.durationMs??2400));
  return {version:'1',status:actors.some(actor=>actor.status==='failed')?'failed':!actors.length||actors.some(actor=>actor.status==='unverified')?'unverified':'passed',actors,
    limitations:['DOM/SVG geometry is browser observed, not proof of unoccluded painted pixels.','Scene state is app reported; independent native pixel checks are required before a visible-motion pass.','Position and one-sided velocity estimates use actual observed spacing ≤80ms. Direct scrubbing and intentional cuts are excluded from continuity contracts.','These explicit intent contracts do not score aesthetic quality, display FPS, or human trackability.']};
}
function analyzeActor(binding:MotionActorBinding,samples:MotionActorSample[],events:MotionEvent[],duration:number):MotionActorResult {
  const expectedOrigin=binding.kind==='scene'?'app-reported':'browser-observed';
  const trusted=samples.filter(sample=>sample.kind===binding.kind&&sample.origin===expectedOrigin);
  const valid=trusted.filter(sample=>sample.visible===true&&sample.screen&&[sample.t,sample.observedAtMs,sample.screen.x,sample.screen.y,sample.screen.width,sample.screen.height].every(Number.isFinite)&&sample.screen.width>=0&&sample.screen.height>=0);
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
  let arrivalAtMs:number|null=null;
  if(destination){
    let entered:number|null=null;
    for(const sample of trusted){
      if(!validSet.has(sample)||Math.hypot(sample.screen!.x-destination.x,sample.screen!.y-destination.y)>destination.tolerancePx){entered=null;continue;}
      entered??=sample.t;
      if(sample.t-entered>=(destination.settleMs??0)&&sample.t<=destination.deadlineMs){arrivalAtMs=entered;break;}
    }
  }
  const metrics={maxStepAt60HzPx:Math.max(0,...steps.map(step=>step.normalized)),maxStepPx:Math.max(0,...steps.map(step=>step.px)),travelPx,replacements,maxVelocityChangePxPerMs:Math.max(0,...velocityChanges.map(value=>value.change)),arrivalAtMs};
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
  if(destination){check('arrival','Actor reaches destination and settles',arrivalAtMs!==null,arrivalAtMs===null?'not observed':`${arrivalAtMs.toFixed(3)}ms`,`${destination.tolerancePx} CSS px tolerance by ${destination.deadlineMs}ms, settle ${destination.settleMs??0}ms`);if(arrivalAtMs===null)findings.push({type:'arrival',summary:`${binding.id} arrival is not established`,sampleTimes:[],eventIds:[]});}
  if(c?.minTravelPx!==undefined){check('travel','Actor performs required travel',travelPx>=c.minTravelPx,`${travelPx.toFixed(3)} CSS px`,`≥${c.minTravelPx} CSS px`);if(travelPx<c.minTravelPx)findings.push({type:'travel',summary:`${binding.id} required movement is not established`,sampleTimes:[],eventIds:[]});}
  return {actorId:binding.id,kind:binding.kind,evidence:binding.kind==='scene'?'app-reported-scene':'browser-geometry',status:assertions.some(assertion=>assertion.status==='failed')?'failed':!sufficient||binding.kind==='scene'||!assertions.length||assertions.some(assertion=>assertion.status==='inconclusive')?'unverified':'passed',pixelStatus:'unverified',coverage:{sufficient,sampleCount:trusted.length,maxGapMs,reasons},metrics,assertions,findings};
}
