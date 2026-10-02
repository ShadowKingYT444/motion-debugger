import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {readFile} from 'node:fs/promises';
import {installBrowserProbe} from '../../packages/core/browser-probe';
import {analyze} from '../../packages/core/analysis';
import type {MotionEvent,MotionSample,CaptureRecipe} from '../../packages/core/types';

// Deterministic DOM/WAAPI model, not a browser measurement. Production Chromium
// capture remains the integration authority. All positions supplied to this model
// are test inputs; the real saved trace below is retained without invented reads.
function model(initialX:number) {
  let clock=0,timerId=0;const timers=new Map<number,()=>void>();
  class ElementModel {
    x=initialX;isConnected=true;opacity=1;
    matches(){return true}getAttribute(){return null}getAnimations(){return []}
    getBoundingClientRect(){return {x:this.x,y:10,width:100,height:100}}
    animate(frames:{transform:string}[],options:{duration:number}) {
      this.x=Number(frames[0].transform);
      return {currentTime:0,playState:'running',effect:{getComputedTiming:()=>({activeDuration:options.duration})},
        finished:new Promise<void>(()=>{}),cancel:()=>{this.x=0}};
    }
  }
  const target=new ElementModel();
  const win:{__motionProbe?:{events:MotionEvent[];samples:MotionSample[];start:()=>void;stop:()=>void};addEventListener:()=>void;setTimeout:(fn:()=>void)=>number}={
    addEventListener(){},setTimeout(fn){timers.set(++timerId,fn);return timerId}
  };
  const sandbox={window:win,Element:ElementModel,document:{addEventListener(){},querySelector:()=>target},
    getComputedStyle:()=>({opacity:String(target.opacity),visibility:'visible',display:'block'}),
    MutationObserver:class {observe(){}},performance:{now:()=>clock},
    requestAnimationFrame:()=>1,cancelAnimationFrame(){},clearTimeout:(id:number)=>timers.delete(id),__name:(value:unknown)=>value};
  runInNewContext(`(${installBrowserProbe.toString()})({selector:'#target'})`,sandbox);
  const probe=win.__motionProbe!;
  const animation=target.animate([{transform:String(initialX)}],{duration:900});
  probe.start();
  return {target,animation,probe,setTime:(time:number)=>clock=time,
    flush(){for(const [id,fn]of [...timers]){timers.delete(id);fn()}},
    retarget(x:number){target.animate([{transform:String(x)}],{duration:700})}};
}
const trace=JSON.parse(await readFile('tests/v2/fixtures/drawer-allowed-gap-false-negative.json','utf8')) as {samples:MotionSample[];events:MotionEvent[];recipe:CaptureRecipe;final:{visible:boolean;attributes:Record<string,string>;text:string;x:number;y:number;opacity:number}};

test('real 66.6ms drawer trace preserves the false-negative rather than inventing missing evidence',()=>{
  const result=analyze(trace.samples,trace.events,trace.recipe,trace.final);
  assert.equal(result.metrics.sufficientEvidence,true);
  assert.equal(result.metrics.maxSampleGapMs,66.6);
  assert.equal(result.metrics.maxFrameStepPx,151.4);
  assert.equal(result.metrics.maxStepAt60HzPx,38.579);
  assert.equal(result.metrics.animationBoundarySamples,0);
  assert.equal(result.assertions.find(a=>a.id==='normalized-step')?.passed,true);
  assert.ok(!result.assertions.some(a=>a.id==='animation-boundary-step'));
});

test('supplemental operation observations detect the real endpoint displacement without diluting it across a rAF gap',()=>{
  // Replay the recorded endpoint coordinates through the deterministic DOM model;
  // these new events are simulated unit inputs, not retroactive real observations.
  const before=trace.samples[13].x!,after=trace.samples[14].x!;
  const m=model(before);m.setTime(312);m.animation.cancel();m.retarget(after);m.setTime(313);m.flush();
  const boundary=m.probe.events.filter(e=>e.type==='animation-boundary');assert.equal(boundary.length,1);
  const result=analyze(trace.samples,[...trace.events,...m.probe.events],trace.recipe,trace.final);
  assert.equal(result.metrics.sampleCount,trace.samples.length);
  assert.equal(result.metrics.maxSampleGapMs,66.6);
  assert.equal(result.metrics.maxStepAt60HzPx,38.579); // rAF metric stays honest
  assert.equal(result.metrics.maxAnimationBoundaryStepPx,151.4);
  assert.equal(result.assertions.find(a=>a.id==='animation-boundary-step')?.passed,false);
  assert.ok(result.findings.some(f=>f.eventIds.includes(boundary[0].id)&&/not proof of a painted frame/.test(f.summary)));
});

test('cancel plus continuous replacement, including replacement in a microtask, is coalesced',async()=>{
  const m=model(151.4);m.setTime(100);m.animation.cancel();
  await Promise.resolve();m.retarget(151.4);m.setTime(101);m.flush();
  const result=analyze(trace.samples,m.probe.events,trace.recipe,trace.final);
  assert.equal(result.metrics.animationBoundarySamples,1);
  assert.equal(result.metrics.maxAnimationBoundaryStepPx,0);
  assert.equal(result.assertions.find(a=>a.id==='animation-boundary-step')?.passed,true);
});

test('smooth movement over a delayed task is normalized and tiny sub-ms movement is not amplified',()=>{
  for(const [distance,elapsed] of [[100,50],[.05,.001]]) {
    const m=model(0);m.setTime(100);m.retarget(0);m.target.x=distance;m.setTime(100+elapsed);m.flush();
    const result=analyze(trace.samples,m.probe.events,trace.recipe,trace.final);
    assert.equal(result.assertions.find(a=>a.id==='animation-boundary-step')?.passed,true);
  }
});

test('annotations, invisible or oversparse batches and cancellation alone cannot diagnose a reset',()=>{
  const m=model(150);m.setTime(100);m.animation.cancel();m.retarget(0);m.setTime(101);m.flush();
  const event=m.probe.events.find(e=>e.type==='animation-boundary')!;
  for(const events of [
    [{...event,origin:'app-annotated' as const}],
    [{...event,detail:{...event.detail,toMs:200}}],
    [{...event,detail:{...event.detail,fromOpacity:0}}],
    [{...event,type:'animation-cancel'}]
  ]) assert.equal(analyze(trace.samples,events,trace.recipe,trace.final).metrics.animationBoundarySamples,0);
});

test('new/legacy metric comparisons do not invent zero boundary evidence or claim comparability',async()=>{
  const {compare}=await import('../../packages/core/analysis');
  const create=()=>({schemaVersion:'2.0',id:'unit-only',createdAt:'unit-only',recipe:trace.recipe,
    environment:{browser:'unit-only',viewport:{width:1280,height:1000},clock:'unit-only',reducedMotion:'no-preference'},
    events:trace.events,samples:trace.samples,...analyze(trace.samples,trace.events,trace.recipe,trace.final),
    final:trace.final,artifacts:{directory:'',report:'',video:'',poster:'',finalScreenshot:'',videoOffsetMs:0},limitations:[]}) as import('../../packages/core/types').MotionCapture;
  const before=create(),after=create();
  for(const capture of [before,after])capture.assertions.push(
    {id:'browser-errors',label:'unit',passed:true,actual:'none',expected:'none'},
    {id:'network-policy',label:'unit',passed:true,actual:'0',expected:'0'});
  delete before.metrics.animationBoundarySamples;delete before.metrics.maxAnimationBoundaryStepPx;delete before.metrics.maxAnimationBoundaryStepAt60HzPx;
  const mixed=compare(before,after);
  assert.equal(mixed.comparable,false);
  assert.ok(mixed.comparabilityIssues.some(issue=>issue.includes('boundary observation support')));
  assert.ok(!('maxAnimationBoundaryStepPx' in mixed.deltas));
  delete after.metrics.animationBoundarySamples;delete after.metrics.maxAnimationBoundaryStepPx;delete after.metrics.maxAnimationBoundaryStepAt60HzPx;
  assert.equal(compare(before,after).comparable,true);
});
