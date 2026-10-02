import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from '../../packages/core/analysis';
import type {CaptureRecipe,MotionEvent,MotionSample} from '../../packages/core/types';

// Deliberate unit inputs, not recorded browser evidence.
const recipe:CaptureRecipe={url:'http://127.0.0.1:4173',selector:'#target',actions:[],durationMs:1000,contract:{maxSampleGapMs:80,maxActiveCancels:0,maxHeightStepPx:2}};
const final={visible:true,attributes:{},text:'',x:0,y:0,opacity:1};
const samples=():MotionSample[]=>Array.from({length:61},(_,i)=>({t:i*16,nodeId:'node-1',logicalId:'target',x:0,y:0,width:10,height:10,opacity:1,translateX:0,translateY:0,scaleX:1,scaleY:1,rotationDeg:0,animationTime:null,containmentOverflowPx:null,containerRect:null}));
const event=(id:string,type:string,origin:MotionEvent['origin']):MotionEvent=>({id,t:100,type,origin,label:type,nodeId:'node-1',detail:{active:true}});

test('dense late samples cannot erase missing evidence at capture start',()=>{
  const late=samples().slice(7); // first valid geometry at 112ms, remaining cadence 16ms
  const result=analyze(late,[],recipe,final);
  assert.equal(result.metrics.maxSampleGapMs,16);
  assert.equal(result.metrics.sufficientEvidence,false);
  assert.equal(result.assertions.find(a=>a.id==='valid-trajectory')?.passed,false);
  assert.match(result.assertions[0].actual,/first 112\.0ms/);
  const missing=samples();for(let i=0;i<7;i++)missing[i].nodeId=null;
  assert.equal(analyze(missing,[],recipe,final).metrics.sufficientEvidence,false);
  for(const first of [0,80,80.001]){
    const bounded=samples().map(s=>({...s,t:s.t+first}));
    assert.equal(analyze(bounded,[],recipe,final).metrics.sufficientEvidence,first<=80);
  }
});

test('the unchanged 80ms cadence gate retains oversparse failures',()=>{
  // Synthetic boundary inputs using the reported historical gap sizes. These
  // are not historical samples or repairs to the immutable AER recordings.
  for(const gap of [80,80.001,83.5,149.9,166.6]){
    const input=samples().map((s,i)=>({...s,t:s.t+(i>=20?gap-16:0)}));
    const result=analyze(input,[],recipe,final);
    assert.equal(result.metrics.sufficientEvidence,gap<=80,String(gap));
    assert.equal(result.assertions.find(a=>a.id==='valid-trajectory')?.passed,gap<=80);
  }
});

test('duplicate, reversed, negative and nonfinite timestamps cannot supply cadence evidence',()=>{
  for(const time of [0,-1,NaN,Infinity]){
    const invalid=samples();invalid[1].t=time;
    assert.equal(analyze(invalid,[],recipe,final).metrics.sufficientEvidence,false,String(time));
  }
  const repeated=samples().map(s=>({...s,t:960}));
  assert.equal(analyze(repeated,[],recipe,final).metrics.sufficientEvidence,false);
  const unordered=samples();[unordered[20],unordered[21]]=[unordered[21],unordered[20]];
  unordered[21].height=500;
  const result=analyze(unordered,[],recipe,final);
  assert.equal(result.metrics.sufficientEvidence,false);
  // The finding must identify a positive-time measured pair, like the metric.
  const peak=result.findings.find(f=>f.type==='height-step')!;
  assert.ok(peak.sampleTimes[1]>peak.sampleTimes[0]);
});

test('app and runner names cannot impersonate observed animation or DOM evidence',()=>{
  const events:MotionEvent[]=[];
  for(const origin of ['app-annotated','runner'] as const)for(const type of ['animation-start','animationstart','animation-cancel','dom-add','dom-remove'])events.push(event(`${origin}-${type}`,type,origin));
  const inputs=samples();inputs[30].nodeId='node-2';
  const annotationsOnly=analyze(inputs,events,recipe,final);
  assert.equal(annotationsOnly.metrics.animationStarts,0);
  assert.equal(annotationsOnly.metrics.activeCancels,0);
  assert.equal(annotationsOnly.assertions.find(a=>a.id==='active-cancels')?.passed,true);
  assert.ok(!annotationsOnly.findings.some(f=>f.type==='active-animation-cancel'));
  assert.deepEqual(annotationsOnly.findings.find(f=>f.type==='identity-replacement')?.eventIds,[]);
  events.push(event('actual-start','animation-start','browser-observed'),event('actual-css-start','animationstart','browser-observed'),event('actual-cancel','animation-cancel','browser-observed'),event('actual-add','dom-add','browser-observed'));
  const observed=analyze(inputs,events,recipe,final);
  assert.equal(observed.metrics.animationStarts,2);
  assert.equal(observed.metrics.activeCancels,1);
  assert.equal(observed.assertions.find(a=>a.id==='active-cancels')?.passed,false);
  assert.deepEqual(observed.findings.find(f=>f.type==='active-animation-cancel')?.eventIds,['actual-cancel']);
  assert.deepEqual(observed.findings.find(f=>f.type==='identity-replacement')?.eventIds,['actual-add']);
  assert.equal(events.length,14,'Analysis preserves all input annotations');
});
