import type {CaptureRecipe,MotionCoverage,MotionSample} from './types';

export const finiteGeometry=(sample:MotionSample)=>sample.nodeId!==null&&[sample.t,sample.x,sample.y,sample.width,sample.height,sample.opacity].every(value=>value!==null&&Number.isFinite(value));
export function targetState(sample:MotionSample):MotionCoverage['intervals'][number]['state'] {
  if(sample.nodeId===null) return [sample.x,sample.y,sample.width,sample.height,sample.opacity].every(value=>value===null)&&(!sample.targetState||sample.targetState==='absent')?'absent':'invalid';
  if(!finiteGeometry(sample)||sample.targetState==='absent')return 'invalid';
  return sample.targetState==='hidden'||sample.width!<=0||sample.height!<=0||sample.opacity!<=.01?'hidden':'visible';
}
export function measureCoverage(samples:MotionSample[],recipe:CaptureRecipe) {
  const duration=recipe.durationMs??2400,presence=recipe.contract?.targetPresence??'continuous';
  const states=samples.map(targetState),finite=samples.filter(finiteGeometry),visible=samples.filter((_,i)=>states[i]==='visible');
  const gaps:number[]=[],readGaps:number[]=[],visibleGaps:number[]=[],lags:number[]=[];
  let ordered=true;
  for(let i=0;i<samples.length;i++) {
    const sample=samples[i],observed=sample.geometryTimeMs??sample.observedAtMs??sample.t;
    if(!Number.isFinite(sample.t)||sample.t<0||!Number.isFinite(observed)||observed<sample.t)ordered=false;
    lags.push(observed-sample.t);
    if(!i)continue;
    const previous=samples[i-1],dt=sample.t-previous.t,readDt=observed-(previous.geometryTimeMs??previous.observedAtMs??previous.t);
    if(dt<=0||readDt<=0)ordered=false;
    gaps.push(dt);readGaps.push(readDt);
    if(states[i]==='visible'&&states[i-1]==='visible'&&sample.nodeId===previous.nodeId)visibleGaps.push(Math.max(dt,readDt));
  }
  const maxGap=Math.max(0,...gaps),maxReadGap=Math.max(0,...readGaps),maxLag=Math.max(0,...lags);
  const cadence=ordered&&samples.length>=20&&samples[0].t<=80&&samples.at(-1)!.t>=duration-100&&maxGap<=80&&maxReadGap<=80&&maxLag<=80;
  // Default retains the original finite-target start/end gate. An explicit
  // lifecycle contract allows observed absence, never missing recorder time.
  const target=visible.length>=20&&!states.includes('invalid')&&(presence==='may-disappear'||(finite[0]?.t<=80&&finite.at(-1)!.t>=duration-100&&finite.every((s,i)=>!i||s.t-finite[i-1].t<=80)));
  const intervals:MotionCoverage['intervals']=[];
  for(let i=0;i<samples.length;i++) {
    const last=intervals.at(-1);
    if(last?.state===states[i]){last.toMs=samples[i].t;last.samples++;}
    else {if(last)last.toMs=samples[i].t;intervals.push({state:states[i],fromMs:samples[i].t,toMs:samples[i].t,samples:1});}
  }
  const reasons:string[]=[];
  if(!cadence)reasons.push(`Recorder coverage insufficient: ordered ${ordered}, first ${samples[0]?.t??'missing'}ms, last ${samples.at(-1)?.t??'missing'}ms, rAF gap ${maxGap.toFixed(3)}ms, observation gap ${maxReadGap.toFixed(3)}ms, read lag ${maxLag.toFixed(3)}ms; unchanged 80ms gate.`);
  if(!target)reasons.push(`Target coverage insufficient under ${presence}: ${visible.length} visible, ${states.filter(s=>s==='invalid').length} invalid samples; first finite ${finite[0]?.t??'missing'}ms, last finite ${finite.at(-1)?.t??'missing'}ms.`);
  return {coverage:{version:'1',cadenceSufficient:cadence,targetCoverageSufficient:target,targetPresence:presence,intervals,reasons} satisfies MotionCoverage,
    maxGap,maxReadGap,maxVisibleGap:Math.max(0,...visibleGaps),maxLag,
    counts:{absentSamples:states.filter(s=>s==='absent').length,hiddenSamples:states.filter(s=>s==='hidden').length,visibleSamples:visible.length,invalidSamples:states.filter(s=>s==='invalid').length}};
}
