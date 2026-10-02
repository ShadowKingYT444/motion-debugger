import type {CaptureRecipe,MotionSample,MotionEvent,MotionCapture,MotionMetrics,MotionAssertion,MotionFinding,MotionComparison} from './types';
import {finiteGeometry,measureCoverage,targetState} from './coverage';
export const validSample=finiteGeometry;
export function analyze(samples:MotionSample[],events:MotionEvent[],recipe:CaptureRecipe,final:MotionCapture['final']) {
  // App marks may use browser event names; their labels never establish browser evidence.
  const observedEvents=events.filter(event=>event.origin==='browser-observed');
  const orderedTimes=samples.every((sample,index)=>Number.isFinite(sample.t)&&sample.t>=0&&(index===0||sample.t>samples[index-1].t));
  const coverageResult=measureCoverage(samples,recipe),coverage=coverageResult.coverage;
  const valid=samples.filter(validSample),heightSteps:number[]=[],steps:{px:number;normalized:number;dt:number;before:number;after:number}[]=[],drops:{value:number;before:number;after:number}[]=[];
  for(let i=1;i<samples.length;i++) {
    const a=samples[i-1],b=samples[i];
    if(targetState(a)!=='visible'||targetState(b)!=='visible'||a.nodeId!==b.nodeId)continue;
    const dt=b.t-a.t;
    if(dt<=0||dt>80)continue;
    heightSteps.push(Math.abs(b.height!-a.height!));
    const px=Math.hypot(b.x!-a.x!,b.y!-a.y!);
    steps.push({px,normalized:px/dt*(1000/60),dt,before:a.t,after:b.t});
    drops.push({value:Math.max(0,a.opacity!-b.opacity!),before:a.t,after:b.t});
  }
  // Supplemental browser reads across WAAPI operation batches. These are not
  // rendered frames. Clamp the denominator to one 60Hz interval so sub-ms
  // instrumentation time cannot amplify tiny legitimate changes into huge speeds.
  const boundaries=events.flatMap(event=>{
    if(event.origin!=='browser-observed'||event.type!=='animation-boundary'||!event.nodeId)return [];
    const d=event.detail,fields=['fromMs','toMs','fromX','fromY','toX','toY','fromOpacity','toOpacity'];
    if(!fields.every(key=>typeof d[key]==='number'&&Number.isFinite(d[key])))return [];
    const dt=Number(d.toMs)-Number(d.fromMs);
    if(dt<0||dt>80||Number(d.fromOpacity)<=.01||Number(d.toOpacity)<=.01)return [];
    const px=Math.hypot(Number(d.toX)-Number(d.fromX),Number(d.toY)-Number(d.fromY));
    return [{event,px,dt,normalized:px/Math.max(dt,1000/60)*(1000/60)}];
  });
  const boundaryPeak=boundaries.reduce((peak,value)=>peak.event===null||value.normalized>peak.normalized?value:peak,{px:0,normalized:0,dt:0,event:null as MotionEvent|null});
  const sorted=steps.map(step=>step.px).sort((a,b)=>a-b),ids=[...new Set(valid.map(s=>s.nodeId!))];
  const containment=valid.filter(s=>s.opacity! >= (recipe.contract?.containment?.minOpacity ?? .05)&&s.containmentOverflowPx!==null&&Number.isFinite(s.containmentOverflowPx));
  const metrics:MotionMetrics={animationBoundarySamples:boundaries.length,maxAnimationBoundaryStepPx:Number(Math.max(0,...boundaries.map(b=>b.px)).toFixed(3)),maxAnimationBoundaryStepAt60HzPx:Number(boundaryPeak.normalized.toFixed(3)),...coverageResult.counts,maxObservedSampleGapMs:Number(coverageResult.maxReadGap.toFixed(3)),maxProbeReadMs:Math.max(0,...observedEvents.filter(e=>e.type==='probe-cost').map(e=>typeof e.detail.maxReadMs==='number'?e.detail.maxReadMs:0)),maxVisibleSampleGapMs:Number(coverageResult.maxVisibleGap.toFixed(3)),maxObservationLagMs:Number(coverageResult.maxLag.toFixed(3)),sufficientEvidence:coverage.cadenceSufficient&&coverage.targetCoverageSufficient,validSamples:valid.length,sampleCount:samples.length,observedDurationMs:samples.at(-1)?.t ?? 0,replacements:Math.max(0,ids.length-1),animationStarts:observedEvents.filter(e=>e.type==='animation-start'||e.type==='animationstart').length,activeCancels:observedEvents.filter(e=>e.type==='animation-cancel'&&e.detail.active===true).length,maxFrameStepPx:Number(Math.max(0,...sorted).toFixed(3)),maxStepAt60HzPx:Number(Math.max(0,...steps.map(step=>step.normalized)).toFixed(3)),maxSampleGapMs:Number(coverageResult.maxGap.toFixed(3)),maxHeightStepPx:Number(Math.max(0,...heightSteps).toFixed(3)),p95FrameStepPx:Number((sorted[Math.floor(sorted.length*.95)]??0).toFixed(3)),maxOpacityDrop:Number(Math.max(0,...drops.map(drop=>drop.value)).toFixed(4)),nodeIdentities:ids,maxContainmentOverflowPx:Number(Math.max(0,...containment.map(s=>s.containmentOverflowPx!)).toFixed(3)),containmentViolatingSamples:containment.filter(s=>s.containmentOverflowPx!>(recipe.contract?.containment?.maxOverflowPx??0)).length};
  const assertions:MotionAssertion[]=[];
  const assert=(id:string,label:string,passed:boolean,actual:string,expected:string)=>assertions.push({id,label,passed,status:passed?'passed':'failed',actual,expected});
  const temporal=(id:string,label:string,passed:boolean,actual:string,expected:string)=>{
    const adequate=metrics.sufficientEvidence&&(id==='containment'||steps.length>=19);
    assert(id,label,passed&&adequate,actual,expected);
    if(passed&&!adequate){const a=assertions.at(-1)!;a.status='inconclusive';a.actual+='; insufficient temporal coverage';}
  };
  assert('valid-trajectory','Finite observed trajectory',metrics.sufficientEvidence,`${valid.length} valid samples; first ${valid[0]?.t.toFixed(1)??'(missing)'}ms; ordered timestamps ${orderedTimes}; last ${valid.at(-1)?.t.toFixed(1)??0}ms; maximum gap ${metrics.maxSampleGapMs}ms`,`Strictly increasing nonnegative timestamps; ≥20 observed frames and ≥20 visible samples; target policy ${coverage.targetPresence}; finite samples starting ≤80ms (unless may-disappear) and through ${(recipe.durationMs??2400)-100}ms; maximum gap ≤80ms`);
  if(!metrics.sufficientEvidence)assertions.at(-1)!.status='inconclusive';
  const c=recipe.contract;
  if(c?.maxFrameStepPx!==undefined)temporal('frame-step','Bounded per-frame position step',metrics.maxFrameStepPx<=c.maxFrameStepPx,`${metrics.maxFrameStepPx}px`,`≤${c.maxFrameStepPx}px (observed frame intervals ≤80ms)`);
  if(c?.maxStepAt60HzPx!==undefined)temporal('normalized-step','Bounded displacement at a normalized 60Hz interval',metrics.maxStepAt60HzPx<=c.maxStepAt60HzPx,`${metrics.maxStepAt60HzPx}px /16.667ms`,`≤${c.maxStepAt60HzPx}px /16.667ms; displacement÷rAF Δt×16.667; actual read gaps/lag separately gated`);
  if(c?.maxStepAt60HzPx!==undefined&&boundaries.length)assert('animation-boundary-step','Bounded net geometry change across animation operations',boundaryPeak.normalized<=c.maxStepAt60HzPx,`${boundaryPeak.px.toFixed(3)}px over ${boundaryPeak.dt.toFixed(3)}ms; conservative 60Hz step ${boundaryPeak.normalized.toFixed(3)}px`,`≤${c.maxStepAt60HzPx}px; displacement ÷ max(observed Δt,16.667ms) ×16.667ms; not a painted-frame measurement`);
  if(c?.maxSampleGapMs!==undefined)assert('sample-gap','Adequate recorder sampling cadence',coverage.cadenceSufficient&&metrics.maxSampleGapMs<=c.maxSampleGapMs,`${metrics.maxSampleGapMs}ms`,`≤${c.maxSampleGapMs}ms`);
  if(c?.maxHeightStepPx!==undefined)temporal('height-step','Bounded per-frame height change',metrics.maxHeightStepPx<=c.maxHeightStepPx,`${metrics.maxHeightStepPx}px`,`≤${c.maxHeightStepPx}px`);
  if(c?.maxOpacityDrop!==undefined)temporal('opacity-drop','Bounded opacity reversal',metrics.maxOpacityDrop<=c.maxOpacityDrop,String(metrics.maxOpacityDrop),`≤${c.maxOpacityDrop}`);
  if(c?.maxReplacements!==undefined)assert('identity','Target identity continuity',metrics.replacements<=c.maxReplacements,String(metrics.replacements),`≤${c.maxReplacements} replacements`);
  if(c?.maxActiveCancels!==undefined)assert('active-cancels','Bounded active animation cancellations',metrics.activeCancels<=c.maxActiveCancels,String(metrics.activeCancels),`≤${c.maxActiveCancels}`);
  if(c?.containment)temporal('containment','Visible target stays within caller-specified bounds',containment.length>=20&&metrics.maxContainmentOverflowPx<=c.containment.maxOverflowPx,`${metrics.maxContainmentOverflowPx}px; ${metrics.containmentViolatingSamples} violating samples`,`≤${c.containment.maxOverflowPx}px visible overflow; ≥20 container samples`);
  if(c?.final){
    if(c.final.visible!==undefined)assert('final-visible','Final visibility',final.visible===c.final.visible,String(final.visible),String(c.final.visible));
    if(c.final.textIncludes!==undefined)assert('final-text','Final text content',final.text.includes(c.final.textIncludes),final.text.slice(0,200),c.final.textIncludes);
    for(const [name,value]of Object.entries(c.final.attributes??{}))assert(`final-${name}`,`Final ${name}`,final.attributes[name]===value,final.attributes[name]??'(missing)',value);
  }
  const findings:MotionFinding[]=[];
  if(metrics.replacements)findings.push({type:'identity-replacement',summary:`Observed ${metrics.replacements} target DOM identity replacement(s)`,eventIds:observedEvents.filter(e=>['dom-remove','dom-add'].includes(e.type)).map(e=>e.id),sampleTimes:valid.filter((s,i)=>i>0&&s.nodeId!==valid[i-1].nodeId).map(s=>s.t),confidence:'observed'});
  if(metrics.activeCancels)findings.push({type:'active-animation-cancel',summary:`Observed ${metrics.activeCancels} cancel call(s) while animation active; cancellation can be intentional`,eventIds:observedEvents.filter(e=>e.type==='animation-cancel'&&e.detail.active===true).map(e=>e.id),sampleTimes:[],confidence:'observed'});
  const worst=steps.reduce((max,step)=>step.px>max.px?step:max,{px:0,normalized:0,dt:0,before:0,after:0});
  if(c?.maxFrameStepPx!==undefined&&worst.px>c.maxFrameStepPx)findings.push({type:'frame-step',summary:`Largest observed frame step ${worst.px.toFixed(2)}px exceeds caller budget ${c.maxFrameStepPx}px`,eventIds:events.filter(e=>Math.abs(e.t-worst.after)<100).map(e=>e.id),sampleTimes:[worst.before,worst.after],confidence:'contract-violation'});
  if(c?.maxStepAt60HzPx!==undefined&&metrics.maxStepAt60HzPx>c.maxStepAt60HzPx){const peak=steps.reduce((max,step)=>step.normalized>max.normalized?step:max,{px:0,normalized:0,dt:0,before:0,after:0});findings.push({type:'frame-step',summary:`Observed ${peak.px.toFixed(2)}px over ${peak.dt.toFixed(2)}ms = ${peak.normalized.toFixed(2)}px at16.667ms; exceeds supplied normalized budget ${c.maxStepAt60HzPx}`,eventIds:events.filter(e=>Math.abs(e.t-peak.after)<100).map(e=>e.id),sampleTimes:[peak.before,peak.after],confidence:'contract-violation'})}
  if(c?.maxStepAt60HzPx!==undefined&&boundaryPeak.event&&boundaryPeak.normalized>c.maxStepAt60HzPx)findings.push({type:'animation-boundary-step',summary:`Browser-observed animation-operation batch changed geometry by ${boundaryPeak.px.toFixed(2)}px over ${boundaryPeak.dt.toFixed(2)}ms; conservative 60Hz step ${boundaryPeak.normalized.toFixed(2)}px exceeds supplied budget ${c.maxStepAt60HzPx}. This is a geometry boundary, not proof of a painted frame or source cause.`,eventIds:[boundaryPeak.event.id],sampleTimes:[],confidence:'contract-violation'});
  if(c?.maxHeightStepPx!==undefined&&metrics.maxHeightStepPx>c.maxHeightStepPx){
    let peak={change:0,before:0,after:0};for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i];if(targetState(a)!=='visible'||targetState(b)!=='visible'||a.nodeId!==b.nodeId||b.t-a.t<=0||b.t-a.t>80)continue;const change=Math.abs(b.height!-a.height!);if(change>peak.change)peak={change,before:a.t,after:b.t}}
    findings.push({type:'height-step',summary:`Observed height jump ${peak.change.toFixed(2)}px exceeds supplied budget ${c.maxHeightStepPx}px`,eventIds:events.filter(e=>Math.abs(e.t-peak.after)<100).map(e=>e.id),sampleTimes:[peak.before,peak.after],confidence:'contract-violation'});
  }
  if(c?.maxOpacityDrop!==undefined&&metrics.maxOpacityDrop>c.maxOpacityDrop){const worst=drops.reduce((max,drop)=>drop.value>max.value?drop:max,{value:0,before:0,after:0});findings.push({type:'opacity-drop',summary:`Observed opacity drop ${metrics.maxOpacityDrop} exceeds caller budget`,eventIds:[],sampleTimes:[worst.before,worst.after],confidence:'contract-violation'})}
  if(c?.containment&&metrics.containmentViolatingSamples)findings.push({type:'containment-overflow',summary:`Visible target exceeds ${c.containment.shape??'rect'} container by up to ${metrics.maxContainmentOverflowPx}px`,eventIds:[],sampleTimes:containment.filter(s=>s.containmentOverflowPx!>c.containment!.maxOverflowPx).map(s=>s.t).slice(0,8),confidence:'contract-violation'});
  return {metrics,assertions,findings,coverage};
}
export function compare(before:MotionCapture,after:MotionCapture):MotionComparison {
  const fields=['animationBoundarySamples','maxAnimationBoundaryStepPx','maxAnimationBoundaryStepAt60HzPx','maxFrameStepPx','maxStepAt60HzPx','maxSampleGapMs','maxHeightStepPx','maxOpacityDrop','replacements','activeCancels','maxContainmentOverflowPx','containmentViolatingSamples'] as const;
  const deltas:MotionComparison['deltas']={};for(const field of fields){const a=before.metrics[field],b=after.metrics[field];if(typeof a==='number'&&typeof b==='number'&&Number.isFinite(a)&&Number.isFinite(b))deltas[field]={before:a,after:b,change:Number((b-a).toFixed(4))};}
  const issues:string[]=[];
  for(const key of ['probeSha256','analyzerSha256'] as const)if(before.environment[key]!==after.environment[key])issues.push(`Different ${key}; repeat both with the same runtime`);
  if(before.coverage?.version!==after.coverage?.version)issues.push('Different lifecycle coverage analysis; repeat both with the same runtime');
  if((before.metrics.animationBoundarySamples!==undefined)!==(after.metrics.animationBoundarySamples!==undefined))issues.push('Different animation-boundary observation support; repeat both captures with the same probe');
  const stable=(value:unknown):unknown=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,stable(v)])):value;
  for(const key of ['selector','actions','viewport','reducedMotion','durationMs','contract'] as const)if(JSON.stringify(stable(before.recipe[key]))!==JSON.stringify(stable(after.recipe[key])))issues.push(`Different ${key}`);
  if(!before.metrics.sufficientEvidence||!after.metrics.sufficientEvidence)issues.push('One or both captures lack sufficient finite temporal evidence');
  for(const [label,report] of [['before',before],['after',after]] as const)for(const id of ['valid-trajectory','browser-errors','network-policy'])if(!report.assertions.some(assertion=>assertion.id===id&&assertion.passed))issues.push(`${label} capture integrity check ${id} is missing or failed`);
  const comparable=issues.length===0;
  const finalEquivalent=before.final.visible===after.final.visible&&before.final.text===after.final.text&&JSON.stringify(stable(before.final.attributes))===JSON.stringify(stable(after.final.attributes));
  const beforePassed=before.assertions.every(a=>a.passed),afterPassed=after.assertions.every(a=>a.passed);
  return {schemaVersion:'2.0',comparable,comparabilityIssues:issues,beforeId:before.id,afterId:after.id,contractsPassed:{before:beforePassed,after:afterPassed},deltas,finalEquivalent,interpretation:!comparable?'These captures are not comparable; no improvement claim is made. Repeat with identical selector, actions, viewport, reduced-motion setting, duration and contracts.':!beforePassed&&afterPassed?'The after capture satisfies the supplied contracts that the before capture violated. This establishes a measured improvement under this recipe, not a generic source-level root cause.':afterPassed?'Both captures must be inspected in context; a passing contract is not proof of universal animation quality.':'The after capture still violates one or more supplied contracts.',findings:{before:before.findings,after:after.findings},limitations:['Animation-operation boundaries are supplemental browser geometry reads, not painted frames; their conservative normalization clamps Δt to at least16.667ms. Old captures without boundary events cannot retrospectively reveal unsampled resets.','Normalized displacement is observed average velocity scaled to16.667ms; it does not establish perceptual smoothness.','Position-step budgets depend on the supplied recipe and sampling cadence; fast intentional motion can exceed them.','Active cancellation can be intentional retargeting; inspect geometry and caller contracts together.','Source refs are explicitly supplied mappings, not inferred code attribution.','This comparison evaluates evidence/contracts. It is not a benchmark of LLM performance.']};
}
