import test from 'node:test';
import assert from 'node:assert/strict';
import {analyze} from '../../packages/core/analysis';
import type {CaptureRecipe,MotionSample} from '../../packages/core/types';

// Explicit unit inputs, never represented as browser recordings.
const recipe:CaptureRecipe={url:'http://127.0.0.1:4173',selector:'#target',actions:[],durationMs:1000,contract:{maxSampleGapMs:80,maxFrameStepPx:20}};
const final={visible:true,attributes:{},text:'',x:0,y:0,opacity:1};
const trace=():MotionSample[]=>Array.from({length:64},(_,i)=>({t:i*16,observedAtMs:i*16+1,targetState:'visible',nodeId:'node-1',logicalId:'target',x:i,y:0,width:10,height:10,opacity:1,translateX:0,translateY:0,scaleX:1,scaleY:1,rotationDeg:0,animationTime:null,containmentOverflowPx:null,containerRect:null}));
const absence=(s:MotionSample):MotionSample=>({...s,targetState:'absent',nodeId:null,logicalId:null,x:null,y:null,width:null,height:null,opacity:null});
test('observed absence separates target coverage from unchanged recorder cadence',()=>{
  const input=trace().map((s,i)=>i<8||i>=56?absence(s):s);
  const strict=analyze(input,[],recipe,final);
  assert.equal(strict.metrics.maxSampleGapMs,16);
  assert.equal(strict.coverage.cadenceSufficient,true);
  assert.equal(strict.coverage.targetCoverageSufficient,false);
  assert.equal(strict.metrics.sufficientEvidence,false);
  assert.equal(strict.assertions.find(a=>a.id==='frame-step')?.status,'inconclusive');
  const lifecycle=analyze(input,[],{...recipe,contract:{...recipe.contract,targetPresence:'may-disappear'}},final);
  assert.equal(lifecycle.metrics.sufficientEvidence,true);
  assert.equal(lifecycle.metrics.absentSamples,16);
  assert.deepEqual(lifecycle.coverage.intervals.map(x=>x.state),['absent','visible','absent']);
});
test('allowing target absence never hides unsampled recorder time or corrupt geometry',()=>{
  const allowed={...recipe,contract:{...recipe.contract,targetPresence:'may-disappear' as const}};
  const sparse=trace().filter((_,i)=>i<20||i>27);
  const report=analyze(sparse,[],allowed,final);
  assert.equal(report.metrics.maxSampleGapMs,144);
  assert.equal(report.metrics.sufficientEvidence,false);
  assert.equal(report.assertions.find(a=>a.id==='sample-gap')?.passed,false);
  const corrupt=trace();corrupt[10].x=NaN;
  assert.equal(analyze(corrupt,[],allowed,final).metrics.invalidSamples,1);
  assert.equal(analyze(corrupt,[],allowed,final).metrics.sufficientEvidence,false);
});
test('continuity never bridges hidden geometry, absence, or different DOM identities',()=>{
  const input=trace();
  for(let i=25;i<=27;i++){input[i]=absence(input[i]);}
  for(let i=28;i<input.length;i++)input[i].x!+=500;
  assert.equal(analyze(input,[],{...recipe,contract:{...recipe.contract,targetPresence:'may-disappear'}},final).metrics.maxFrameStepPx,1);
  const hidden=trace();hidden[25]={...hidden[25],targetState:'hidden',width:0,x:500};
  assert.equal(analyze(hidden,[],recipe,final).metrics.maxFrameStepPx,1);
  const replaced=trace();for(let i=25;i<replaced.length;i++){replaced[i].nodeId='node-2';replaced[i].x!+=500;}
  const report=analyze(replaced,[],recipe,final);
  assert.equal(report.metrics.maxFrameStepPx,1);
  assert.equal(report.metrics.replacements,1);
});
test('regular rAF labels cannot conceal late geometry observations',()=>{
  const input=trace();for(let i=25;i<input.length;i++)input[i].observedAtMs!+=100;
  const report=analyze(input,[],recipe,final);
  assert.equal(report.metrics.maxSampleGapMs,16);
  assert.equal(report.metrics.maxObservedSampleGapMs,116);
  assert.equal(report.metrics.maxObservationLagMs,101);
  assert.equal(report.metrics.sufficientEvidence,false);
  assert.equal(report.assertions.find(a=>a.id==='frame-step')?.status,'inconclusive');
});
test('late post-rAF reads remain diagnostics and never inflate rAF displacement velocity',async()=>{
  const {readFile}=await import('node:fs/promises');
  const recorded=JSON.parse(await readFile('tests/v2/fixtures/postraf-task-alias.json','utf8'));
  const report=analyze(recorded.samples,recorded.events,recorded.recipe,recorded.final);
  assert.equal(report.metrics.sufficientEvidence,true);
  assert.ok(report.metrics.maxObservationLagMs!>40);
  assert.ok(report.metrics.maxStepAt60HzPx<5);
  assert.equal(report.assertions.find(a=>a.id==='normalized-step')?.passed,true);
});
test('an actual measured violation is retained even when the whole window is insufficient',()=>{
  const input=trace().slice(8);input[10].x!+=100;
  const report=analyze(input,[],recipe,final);
  assert.equal(report.metrics.sufficientEvidence,false);
  assert.equal(report.assertions.find(a=>a.id==='frame-step')?.status,'failed');
  assert.ok(report.findings.some(f=>f.type==='frame-step'));
});
